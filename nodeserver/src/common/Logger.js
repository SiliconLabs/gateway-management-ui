// Copyright 2015 Silicon Laboratories, Inc.

var winston           = require('winston'),
  path                = require('path'),
  Constants           = require('./Constants.js'),
  fs                  = require('fs-extra');

var gatewayTransportLogPath = path.join(__dirname, Constants.logPath + Constants.gatewayTransportLogFilename);
var gatewayLogPath = path.join(__dirname, Constants.logPath + Constants.gatewayLogFilename);
var testLogPath = path.join(__dirname, Constants.logPath + Constants.testLogFilename);
var gatewayLogDirectory = path.join(__dirname, Constants.logPath);
var logLevel = process.env.LOG_LEVEL;
var suppressLogging = logLevel === 'none';

if(!suppressLogging) makeLogFiles();

/* Set up server logging */
var Logger = { 
  // Set up default logger for GatewayTransport
  server: new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        level: logLevel,
        silent: suppressLogging,
        timestamp: true,
      }),
      new (winston.transports.File)({
        level: logLevel,
        silent: suppressLogging,
        filename: gatewayTransportLogPath,
        json: false,
        maxsize: 40000000, // 40MB per file
        maxFiles: 5 // 5 files = 200MB max
      })
    ],
    exitOnError: false
  }),

  // Set up default logger for Gateway
  gateway: new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        level: logLevel,
        silent: suppressLogging,
        timestamp: true
      }),
      new (winston.transports.File)({
        level: logLevel,
        silent: suppressLogging,
        filename: gatewayLogPath,
        json: false,
        maxsize: 40000000, // 40MB per file
        maxFiles: 5 // 5 files = 200MB max
      })
    ],
    exitOnError: false
  }),

  /* Configure Customer Test Logger */
  testing: new (winston.Logger)({
    transports: [
      new (winston.transports.File)({
        level: logLevel,
        silent: suppressLogging,
        filename: testLogPath,
        json: false,
        timestamp: false,
        showLevel: false
      })
    ]
  }),

  loadGatewayLog: function(callback) {
    // If gateway log file not found
    if (!Logger.gatewayLogFound) {
      callback(null);
    }

    // Loads the gateway log 
    fs.readFile(gatewayLogPath, function(err, data) {
      if (!err) {
        callback(data);
      } else {
        Logger.server.log('info', 'Error: ' + err);
        callback(null);
      }
    });
  },

  loadServerLog: function(callback) {
    // Loads the server log
    fs.readFile(gatewayTransportLogPath, function(err, data) {
      if (!err) {
        callback(data);
      } else {
        Logger.server.log('info', 'Error: ' + err);
        callback(null);
      }
    });
  },

  loadTestLog: function(callback) {
    // Loads the test log
    fs.readFile(testLogPath, function(err, data) {
      if (!err) {
        callback(data);
      } else {
        Logger.server.log('info', 'Error: ' + err);
        callback(null);
      }
    });
  },

  gatewayLogFound: false,
  logStreaming: false
};

function makeLogFiles() {
  /* Create log directory */
  if (!fs.existsSync(gatewayLogDirectory)) {
    fs.mkdirSync(gatewayLogDirectory);
  }

  /* Create ZigBee Gateway Test Log File. */
  if (!fs.existsSync(testLogPath)) {
    fs.writeFileSync(testLogPath, '');
  }

  /* Create ZigBee Gateway Transport Log File. */
  if (!fs.existsSync(gatewayTransportLogPath)) {
    fs.writeFileSync(gatewayTransportLogPath, '');
  }

  /* Create ZigBee Gateway Log File. */
  if (!fs.existsSync(gatewayLogPath)) {
    fs.writeFileSync(gatewayLogPath, '');
  }
}

module.exports = Logger;
