/*global module:false*/
module.exports = function (grunt) {

  'use strict';

  var pkg = grunt.file.readJSON('package.json');

  var UMDWrapper = {
    /*jshint indent: false */
    before: [
      '(function (name, definition, global) {',
      'if (typeof define === \'function\') {',
      'define(definition);',
      '} else if (typeof module !== \'undefined\' && module.exports) {',
      'module.exports = definition();',
      '} else {',
      'global[name] = definition();',
      '}',
      '})(\'inputController\', function () {'
    ],
    after: [
      'return module$build$bundle; ',
      '}, this);\n'
    ]
  };

  // Project configuration.
  grunt.initConfig({

    pkg: pkg,

    jshint: {
      all: ['Gruntfile.js', 'src/*'],
      options: {
        // enforce:
        bitwise: true,
        camelcase: true,
        curly: true,
        latedef: true,
        newcap: true,
        noarg: true,
        noempty: true,
        nonew: true,
        quotmark: 'single',
        undef: true,
        unused: true,
        strict: true,
        trailing: true,
        indent: 2,
        // relax:
        loopfunc: true
      }
    },

    // this is configured later
    'closure-compiler': {},

    wrap: {
      'all': {
        src: ['build/input-controller.js'],
        dest: './',
        wrapper: [
          UMDWrapper.before.join(''),
          UMDWrapper.after.join('')
        ]
      },

      'debug': {
        src: ['build/input-controller.dev.js'],
        dest: './',
        wrapper: [
          UMDWrapper.before.join('\n'),
          UMDWrapper.after.join('\n')
        ]
      }
    },

    jsdoc: {
      dist: {
        src: ['src/*.js'],
        options: {
          destination: 'doc',
          private: false
        }
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-closure-compiler');
  grunt.loadNpmTasks('grunt-wrap');
  grunt.loadNpmTasks('grunt-jsdoc');

  var handlers = grunt.option('handlers') || ('mouse,keyboard,gamepad,speech');
  var isDebug = [true, '1', 'true', 'on'].indexOf(grunt.option('dev')) !== -1;

  grunt.registerTask('default', ['configure:' + handlers.replace(/,/g, ':')]);

  grunt.registerTask('configure', 'A task to select specific handlers', function () {

    if (arguments.length === 0) {
      grunt.log.error('ERROR: Please don\'t call the "configure" task directly.');
      grunt.log.writeln('Use "grunt --handlers=handler1[,handler2]" instead.');
      return false;
    }

    var handlerClassNames = [].slice.call(arguments).map(function (name) {
      return name.slice(0, 1).toUpperCase() + name.slice(1, name.length) + 'Handler';
    });
    var handlerModuleNames = handlerClassNames.map(function (name) {
      return '"../src/' + name + '"';
    });

    // check for handler module existence
    for (var i = 0, m = handlerClassNames.length; i < m; i++) {
      var fileName = handlerClassNames[i] + '.js';
      if (!grunt.file.isFile('src/' + fileName)) {
        grunt.fatal('Device handler "' + fileName + '" doesn\'t exist.');
        return false;
      }
    }

    // create bundle file contents
    var bundleFileContents = [
      '/*global define:false*/',
      '/*jshint indent:false*/',
      'define([',
      '"../src/InputController",',
      handlerModuleNames.join(',\n'),
      '], function (InputController, ' + handlerClassNames.join(', ') + ') {',
      '"use strict";',
      'var bundle = new InputController();',
      'bundle.registerDeviceHandlers([' + handlerClassNames.join(', ') + ']);',
      'return bundle;',
      '});\n'
    ].join('\n').replace(/"/g, '\'');

    grunt.file.write('build/bundle.js', bundleFileContents);
    grunt.log.ok('Bundle file written. Configured to include the following device handlers:');
    grunt.log.writeln(handlerClassNames.join('\n'));

    // run jshint on all files, also on bundle
    var jsHintFiles = handlerClassNames.map(function (name) {
      return 'src/' + name + '.js';
    });
    jsHintFiles.push('src/InputController.js');
    jsHintFiles.push('Gruntfile.js');
    jsHintFiles.push('build/bundle.js');
    grunt.config.set('jshint.all', jsHintFiles);
    grunt.task.run('jshint');

    //configure closure compiler
    var closureFiles = handlerClassNames.map(function (name) {
      return 'src/' + name + '.js';
    });
    closureFiles.unshift('src/InputController.js');
    closureFiles.push('build/bundle.js');

    var closureOptions = {
      'language_in': 'ECMASCRIPT5_STRICT',
      'process_common_js_modules': null,
      'transform_amd_modules': null,
      'common_js_entry_module': 'build/bundle.js'
    };
    if (isDebug) {
      closureOptions.debug = true;
      closureOptions.formatting = 'PRETTY_PRINT';
    }

    grunt.config.set('closure-compiler.bundle', {
      closurePath: 'lib/closure',
      jsOutputFile: 'build/input-controller' + (isDebug ? '.dev' : '') + '.js',
      js: closureFiles,
      maxBuffer: 500,
      options: closureOptions
    });
    grunt.task.run('closure-compiler:bundle');

    // wrap it up
    grunt.task.run('wrap:' + (isDebug ? 'debug' : 'all'));

  });
};
