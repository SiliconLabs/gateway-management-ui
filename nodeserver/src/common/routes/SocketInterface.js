// Copyright 2015 Silicon Laboratories, Inc.

/* These events are initiated by a client to request information */

var io              = require('socket.io')(),
  ip                = require('ip'),
  winston           = require('winston'),
  util              = require('util'),
  DeviceController  = require('../controller/DeviceController.js'),
  Logger            = require('../Logger.js'),
  Constants         = require('../Constants.js'),
  Config            = require('../Config.js'),
  https             = require('https'),
  http              = require('http'),
  fs                = require('fs');

var socketIOPort = 9010;
var options = {};
if (Config.CLOUD_ENABLED && Config.CLOUD_SOCKETS_SSL_ENABLED) {
  try {
    var socketsKey = fs.readFileSync(Constants.SOCKETS_PRIVKEY_FILELOCATION);
    var socketsCert = fs.readFileSync(Constants.SOCKETS_CERT_FILELOCATION);
    var options = {
        key: socketsKey,
        cert: socketsCert
    };
    var app = https.createServer(options);
    var io = require('socket.io')(app);
    app.listen(socketIOPort);
  } catch(e) {
    Logger.server.log('info', 'Error Loading Keys' + e);
  }
} else {
  var app = http.createServer();
  var io = require('socket.io')(app);
  io.listen(socketIOPort);
}

Logger.server.log('info', 'SocketIO Listening on: '
  + ip.address() + ':' + socketIOPort);

/* This socket server listens for client/browser requests */
io.on('connection', function(socket) {
  Logger.server.log('info', 'New SocketIO Client Connected. Current Number: '
    + io.engine.clientsCount);

  /* This event is called when a client sends a predefined action to the gateway
    action payloads: {type: type, params ... }
      {"type":"permitjoinms", delayMs}
      {"type":"permitjoinoff"}
      {"type":"addrule", inDeviceTableIndex, outDeviceTableIndex}
      {"type":"deleterule", inDeviceTableIndex, outDeviceTableIndex}
      {"type":"clearrules"}
      {"type":"reformnetwork", radioChannel, networkPanId, radioTxPower}
      {"type":"removedevice", nodeEui}
      {"type":"lighttoggle", deviceEndpoint}
      {"type":"lightoff", deviceEndpoint}
      {"type":"lighton", deviceEndpoint}
      {"type":"enterIdentify", deviceEndpoint}
      {"type":"exitIdentify", deviceEndpoint}
      {"type":"setlightlevel", deviceEndpoint, level}
      {"type":"setlightcolortemp", deviceEndpoint, colorTemp}
      {"type":"setlighthuesat", deviceEndpoint, hue, sat}
      {"type":"bindtempsensor", deviceEndpoint}
      {"type":"requestattribute", deviceEndpoint, attributeString}
      {"type":"starttraffictest", deviceEndpoint, periodMs, iterations, nodeId, deviceType}
      {"type":"otasetupgrade", upgrade}
      {"type":"otaupgradenotify", nodeId, manufacturerId, imageTypeId, firmwareVersion}
      {"type":"requestgatewaystate"}
      {"type":"setgatewayattribute", attribute, value}
  */
  socket.on('action', function(data) {
    Logger.server.log('info', 'Socket.io Received (action): ' + JSON.stringify(data));

    try {
      DeviceController.onSocketAction(data);
    } catch (e) {
      Logger.server.log('info', 'Error in onSocketAction: ' + e.toString());
    }
  });

  /* This event is called when a client sends a zigbee cli commandlist to the gateway
    socketIO: command
    {
      “commands”:[
       {“command”:”<cli>”, postDelayMs: <time>},
       {“command”:”<cli>”, postDelayMs: <time>}
      ]
    }
  */
  socket.on('command', function(data) {
    Logger.server.log('info', 'Socket.io Received (command): ' + JSON.stringify(data));

    try {
      DeviceController.onSocketCommand(data);
    } catch (e) {
      Logger.server.log('info', 'Error in onSocketCommand: ' + e.toString());
    }
  });

  /* This event is called when a client sends a webserver message
    servermessage payloads: {type: type, params ... }
    {"type":"getotafiles"}
    {"type":"otacopyfile", otaFilename}
    {"type":"otaclear"}
    {"type":"getwebserverinfo"}
    {"type":"setwebserverattribute", attribute, value}
    {"type":"loadtestlog"}
    {"type":"loadserverlog"}
    {"type":"loadgatewaylog"}
    {"type":"addgroup", group}
  */
  socket.on('servermessage', function(data) {
    Logger.server.log('info', 'Socket.io Received (servermessage):' + JSON.stringify(data));

    try {
      DeviceController.onSocketServerMessage(data);
    } catch (e) {
      Logger.server.log('info', 'Error in onSocketServerMessage: ' + e.toString());
    }
  });

  socket.on('error', function(err) {
    Logger.server.log('Socket IO Error: '  + err.toString());
  });

  socket.on('disconnect', function() {
    Logger.server.log('info', 'SocketIO Client Disconnected. Current Number: '
      + io.engine.clientsCount);
  });
});

Date.prototype.yyyymmddhhmmssfff = function() {
  var yyyy = this.getFullYear();
  var mm = this.getMonth() < 9 ? '0' + (this.getMonth() + 1) : (this.getMonth() + 1); // getMonth() is zero-based
  var dd  = this.getDate() < 10 ? '0' + this.getDate() : this.getDate();
  var hh = this.getHours() < 10 ? '0' + this.getHours() : this.getHours();
  var min = this.getMinutes() < 10 ? '0' + this.getMinutes() : this.getMinutes();
  var ss = this.getSeconds() < 10 ? '0' + this.getSeconds() : this.getSeconds();
  var fff = this.getMilliseconds() < 10 ? '00' + this.getMilliseconds() :
  this.getMilliseconds() >= 10 && this.getMilliseconds() < 100 ? '0' + this.getMilliseconds() : this.getMilliseconds();
  return yyyy + '/' + mm + '/' + dd + ' ' + hh + ':' + min + ':' + ss + '.' + fff;
};

/* Set up socketIO streaming to alert clients of server messages */
var SocketIOLoggerServer = winston.transports.SocketIOLoggerServer = function(options) {
  this.name = 'SocketIOLoggerServer';
  this.level = options.level || 'info';
  var d = new Date();
  this.timestamp = d.yyyymmddhhmmssfff();
};

util.inherits(SocketIOLoggerServer, winston.Transport);

SocketIOLoggerServer.prototype.log = function(level, msg, meta, callback) {
  var d = new Date();
  if (Logger.logStreaming &&
    !DeviceController.gatewaySettings.trafficReporting &&
    !DeviceController.serverSettings.otaInProgress) {
      io.sockets.emit('serverlogstream', d.yyyymmddhhmmssfff() + ' ' + msg + '\n\r');
  }
  callback(null, true);
};

Logger.server.add(winston.transports.SocketIOLoggerServer, {
  level: process.env.LOG_LEVEL,
  silent: process.env.LOG_LEVEL === 'none',
  timestamp: true,
  json: false
});

module.exports = io;
