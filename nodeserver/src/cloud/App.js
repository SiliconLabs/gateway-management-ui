// Copyright 2015 Silicon Laboratories, Inc.

var fs               = require('fs-extra')
  , chokidar         = require('chokidar')
  , path             = require('path')
  , SocketInterface  = require('../common/routes/SocketInterface.js')
  , GatewayInterface = require('../common/routes/GatewayInterface.js')
  , DeviceController = require('../common/controller/DeviceController.js')
  , ServerActions    = require('../common/actions/ServerActions.js')
  , ota              = require('../common/controller/sub-modules/OverTheAirUpdate.js')
  , Logger           = require('../common/Logger.js')
  , Constants        = require('../common/Constants.js')
  , Config           = require('../common/Config.js');

Logger.server.log('info', 'Silicon Labs ZB3.0 MQTT/Websocket server starting... ');

// Pass servers into Server Actions
ServerActions.GatewayInterface.mqttClient = GatewayInterface;
ServerActions.SocketInterface.ioserver = SocketInterface;

function cleanup() {
  Logger.server.log('info', 'Socket.io disconnected on app termination');
}

// On Sigint cleanup
process.on('SIGINT', function() {
  Logger.server.log('info', 'Sigint Received..waiting 1 second.');
  cleanup();
  setTimeout(function() {
    Logger.server.log('info', 'Shutdown.');
    process.exit(2);
  }, Constants.SHUTDOWN_TIMER);
});

process.on('uncaughtException', function(err) {
  Logger.server.log('info', 'Caught exception: ' + err + ' Stack: ' + err.stack);
  fs.writeFileSync('crashlog.txt', 'Caught exception: ' + err.toString() + ' Stack: ' + err.stack);
  process.exit(99);
});
