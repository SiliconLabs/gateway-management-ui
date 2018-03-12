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

var logNameList = readFileNamesInPath();
var lastModifiedLogs = getLastModifiedLogs(logNameList);
if(!suppressLogging) makeLogFiles(logNameList, lastModifiedLogs);

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
    var logPath = gatewayLogPath;
    // Loads the gateway log
    fs.readFile(logPath, function(err, data) {
      if (!err) {
        callback(data);
      } else {
        Logger.server.log('info', 'Error: ' + err);
        callback(null);
      }
    });
  },

  loadServerLog: function(callback) {
    var logPath = gatewayTransportLogPath;
    // Loads the server log
    fs.readFile(logPath, function(err, data) {
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

function makeLogFiles(nameList, lastLog) {

  var gatewayLogKeyword = Constants.gatewayLogFilename.split('.')[0];
  var serverLogKeyword  = Constants.gatewayTransportLogFilename.split('.')[0];
  var bakFileKeyword = 'bak';


  // Delete redundant log backups. Rename the last modifed logs to xxx.log.bak.
  nameList.forEach((logName) => {
    if (logName.indexOf(bakFileKeyword) !== -1 ||
        (logName.indexOf(bakFileKeyword) === -1 &&
         logName !== Constants.gatewayLogFilename &&
         logName !== lastLog.gatewayLog &&
         logName.indexOf(gatewayLogKeyword) !== -1)) {
      // For not last modified files, delete them.
      var logPath = path.join(__dirname, Constants.logPath + logName);
      fs.unlinkSync(logPath);
    }

    if (logName.indexOf(bakFileKeyword) === -1 &&
        logName !== Constants.gatewayTransportLogFilename &&
        logName !== lastLog.serverLog &&
        logName.indexOf(serverLogKeyword) !== -1) {
      // For not last modified files, delete them.
      var logPath = path.join(__dirname, Constants.logPath + logName);
      fs.unlinkSync(logPath);
    }
  });

  /* Update the file list in the system. */
  logNameList = readFileNamesInPath();
  lastModifiedLogs = getLastModifiedLogs(logNameList);
  if (lastModifiedLogs.gatewayLog !== undefined &&
      lastModifiedLogs.gatewayLog !== Constants.gatewayLogFilename) {
    var oldGatewayLogPath = gatewayLogDirectory + lastModifiedLogs.gatewayLog;
    var newGatewayLogPath = gatewayLogPath + '.bak';
    fs.renameSync(oldGatewayLogPath, newGatewayLogPath);
  }
  if (lastModifiedLogs.serverLog !== undefined &&
      lastModifiedLogs.serverLog !== Constants.gatewayTransportLogFilename) {
      var oldGatewayLogPath = gatewayLogDirectory + lastModifiedLogs.serverLog;
      var newGatewayLogPath = gatewayTransportLogPath + '.bak';
      fs.renameSync(oldGatewayLogPath, newGatewayLogPath);
  }

  /* Create server.log and gateway.log if none. */
  if (lastLog.gatewayLog === undefined) fs.writeFileSync(gatewayLogPath, '');
  if (lastLog.serverLog === undefined) fs.writeFileSync(gatewayTransportLogPath, '');

  /* Create ZigBee Gateway Test Log File. */
  if (!fs.existsSync(testLogPath)) {
    fs.writeFileSync(testLogPath, '');
  }
}

function getLastModifiedLogs(nameList) {
  if (nameList.length === 0) return {};

  /* Rely on Linux FS to detect the latest log. */
  var lastGatewayLog = '';
  var lastServerLog  = '';
  var gatewayLogKeyword = Constants.gatewayLogFilename.split('.')[0];
  var serverLogKeyword  = Constants.gatewayTransportLogFilename.split('.')[0];

  nameList.forEach((file) => {
    if (file.indexOf(gatewayLogKeyword) !== -1) {
      lastGatewayLog = file;
    }
    if (file.indexOf(serverLogKeyword) !== -1) {
      lastServerLog = file;
    }
  });

  var lastLog = {};
  if (lastGatewayLog) {
    lastLog.gatewayLog = lastGatewayLog;
    lastLog.gatewayLogPath = path.join(__dirname, Constants.logPath + lastGatewayLog);
  }
  if (lastServerLog) {
    lastLog.serverLog = lastServerLog;
    lastLog.serverLogPath = path.join(__dirname, Constants.logPath + lastServerLog);
  }
  return lastLog;
}

function readFileNamesInPath() {
  /* Create log directory */
  if (!fs.existsSync(gatewayLogDirectory)) {
    fs.mkdirSync(gatewayLogDirectory);
  }
  return fs.readdirSync(gatewayLogDirectory);
}

module.exports = Logger;
