/*global define:false */
define([
  '../src/InputController',
  '../src/MouseHandler',
  '../src/KeyboardHandler'
], function (InputController, MouseHandler, Keyboardhandler) {

  'use strict';

  var bundle = new InputController();

  bundle.registerDeviceHandler(MouseHandler);
  bundle.registerDeviceHandler(Keyboardhandler);

  return bundle;

});
