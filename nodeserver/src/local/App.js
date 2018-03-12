// Copyright 2015 Silicon Laboratories, Inc.

var fs               = require('fs-extra')
  , chokidar         = require('chokidar')
  , path             = require('path')
  , SocketInterface  = require('../common/routes/SocketInterface.js')
  , GatewayInterface = require('../common/routes/GatewayInterface.js')
  , StaticServer     = require('../common/routes/StaticServer.js')
  , DeviceController = require('../common/controller/DeviceController.js')
  , ServerActions    = require('../common/actions/ServerActions.js')
  , ota              = require('../common/controller/sub-modules/OverTheAirUpdate.js')
  , Logger           = require('../common/Logger.js')
  , _                = require('underscore')
  , Constants        = require('../common/Constants.js')
  , child_process    = require('child_process')
  , semver           = require('semver')
  , TimeQueue        = require('timequeue')
  , Config           = require('../common/Config.js');

Logger.server.log('info', 'Silicon Labs ZB3.0 MQTT/Websocket server starting... ');

/* Stub for Gateway Process */
var gatewayProcess;
var ncpSubProcess;
var isCliTerminalEnabled = false;

/* Initial Setup */
var TimeQueueOptions = {concurrency: 1, every: Constants.SETUP_ZIGBEE_MS_THROTTLE};

// Pass servers into Server Actions
ServerActions.GatewayInterface.mqttClient = GatewayInterface;
ServerActions.GatewayInterface.commandListQueue = new TimeQueue(ServerActions.GatewayInterface.handleCommandListQueue, TimeQueueOptions)
ServerActions.SocketInterface.ioserver = SocketInterface;

var binPath = path.join(__dirname, '../../../../bin');
var pyScriptPath = path.join(__dirname, '../../../../tools/ncp-updater');

// Watches OTA Directory for changes
var otaArchivePath = path.join(__dirname, Constants.otaArchiveCreationPath);

// Create directory ota_staging if does not exist
if (!fs.existsSync(otaArchivePath)){
  Logger.server.log('info', 'Created ota_staging directory in: ' + otaArchivePath);
  fs.mkdirSync(otaArchivePath);
}

chokidar.watch(otaArchivePath, {ignored: /[\/\\]\./}).on('all', function() {
  Logger.server.log('info', 'Detected Change in OTA Dir:');
  ota.files = ota.readOTAFiles();
  Logger.server.log('info', ota.files);
  DeviceController.sendOTAContents(ota.files);
});

findGatewayUpdateAndStart();

/* Main function to start gateway host application */
function findGatewayUpdateAndStart() {
  if (process.env.TTY){
    startGateway({"port": process.env.TTY});
  } else {
    getAllConnectedZigBeeNCP(function(zigbeeGateways) {
      var latestConnectedZigBeeNCP = getLatestVersionZigBeeNCP(zigbeeGateways);

      /* Check if ncp is connected */
      if (latestConnectedZigBeeNCP) {
        Logger.server.log('info', 'Found NCP', latestConnectedZigBeeNCP);
        startGateway(latestConnectedZigBeeNCP);
      }
    }.bind(this));
  }
}

/* 5 second watchdog for restarting gateway process */
setInterval(function() {
  if(!gatewayProcess && !ncpSubProcess) {
    Logger.server.log('info', 'Searching for NCP...');
    findGatewayUpdateAndStart();
  } else if (gatewayProcess) {
    if (isCliTerminalEnabled != DeviceController.serverSettings.cliTerminal) {
      isCliTerminalEnabled = DeviceController.serverSettings.cliTerminal;
      gatewayProcess.kill();
      findGatewayUpdateAndStart();
    }
  }
}.bind(this), Constants.GATEWAY_PROCESS_WATCHDOG_TIMER);

/* Static Functions */
function startGateway(ZigBeeNCP) {
  if(!gatewayProcess) {
    var baudSpecifier;
    if (ZigBeeNCP.port == '/dev/ttyACM0') {
      baudSpecifier = '0';
    } else {
      baudSpecifier = '1';
    }

    if (!DeviceController.serverSettings.cliTerminal) {
      gatewayProcess = child_process.spawn(binPath + '/siliconlabsgateway', ['-n', baudSpecifier, '-p', ZigBeeNCP.port], {
        cwd: binPath
      });
      isCliTerminalEnabled = false;
    } else {
      gatewayProcess = child_process.spawn(Constants.TERMINAL_COMMAND, ['-e', binPath + '/siliconlabsgateway -n '+ baudSpecifier + ' -p ' + ZigBeeNCP.port], {
        cwd: binPath
      });
      isCliTerminalEnabled = true;
    }

    Logger.server.log('info', 'Started Gateway Host Process');

    gatewayProcess.stdout.on('data', function(data) {
      Logger.gateway.log('info', 'Gateway: ' + data.toString().trim());
      if (Logger.logStreaming && !DeviceController.serverSettings.otaInProgress) {
        DeviceController.publishGatewayLogStreamSocketMessage(data.toString().trim());
      }
    }.bind(this));

    gatewayProcess.stderr.on('data', function(data) {
      Logger.gateway.log('error', 'Gateway: ' + data.toString().trim());
    }.bind(this));

    gatewayProcess.on('close', function(code) {
      gatewayProcess = null;
      connecting = false;
      Logger.server.log('info', 'ZigBee Gateway Host Process Closed');
    }.bind(this));

    gatewayProcess.on('error', function(e) {
      Logger.server.log('error', 'ZigBee Gateway Host Process Error: ' + e.toString());
    }.bind(this));
  }
}

function killGateway() {
  gatewayProcess.kill('SIGHUP');
}

/* This function returns all ZigBee NCPs */
function getAllConnectedZigBeeNCP(callback) {
  ncpSubProcess = child_process.exec('python ' + pyScriptPath + '/ncp.py scan', {timeout: 4000}, function(error, stdout, stderr) {
    ncpSubProcess = null;
    if (error) {
      Logger.server.log('error', 'exec error: ncp.py scan: ' + error);
      callback(false);
    }

    if (stdout) Logger.server.log('info', 'ncp.py scan: ' + stdout);

    if (stderr) Logger.server.log('error', 'ncp.py scan: ' + stderr);

    try {
      var physicalDevices = JSON.parse(stdout);
      var zigbeeDevices = _.filter(physicalDevices.ports, function(device) {
        return device.deviceType == 'zigbee';
      });
      callback(zigbeeDevices);
    } catch(e) {
      Logger.server.log('error', 'ncp.py scan exception: ' + e.toString());
      callback(false);
    }
  }.bind(this));

  ncpSubProcess.on('error', function(e) {
    Logger.server.log('error', 'ncp.py process error: ' + e.toString());
    callback(false);
  }.bind(this));

  ncpSubProcess.on('close', function(code) {
      ncpSubProcess = null;
      callback(false);
      Logger.server.log('info', 'NCP Process Closed');
  }.bind(this));
}

/* This function updates a ZigBee NCP */
function updateConnectedZigBeeNCP(ZigBeeNCP, imageToUpdateTo, callback) {
  var flashCommand = 'python ' + pyScriptPath + '/ncp.py flash -p ' + ZigBeeNCP.port + ' -f ' + imageToUpdateTo;
  Logger.server.log('info', 'p.py flash: starting update: ' + ZigBeeNCP.port + ' ' + imageToUpdateTo);
  ncpSubProcess = child_process.exec(flashCommand, function(error, stdout, stderr) {
    ncpSubProcess = null;
    if (error) {
      Logger.server.log('error', 'exec error: ncp.py flash: ' + error);
      callback(true);
    }

    if (stderr) {
      Logger.server.log('error', 'ncp.py flash: ' + stderr);
      callback(true);
    }

    Logger.server.log('info', 'ncp.py flash: ' + stdout);
    callback(false);
  }.bind(this));
}

/* This function returns the highest StackVersion */
function getLatestVersionZigBeeNCP(zigbeeDevices) {
  if (zigbeeDevices.length) {
    var sortedZigBeeDevices = zigbeeDevices.sort(compareZigBeeNCPStackVersion);
    var latestZigBeeDevice = sortedZigBeeDevices[0];
    Logger.server.log('info', 'Latest ZigBee NCP image connected is ' + latestZigBeeDevice.stackVersion);
    return latestZigBeeDevice;
  } else {
    Logger.server.log('error', 'There are no ZigBee NCP images connected');
    DeviceController.onGatewaySettings('');
    return null;
  }
}

function compareZigBeeNCPStackVersion(zigbee1, zigbee2) {
  return semver.compare(zigbee2.stackVersion, zigbee1.stackVersion);
}

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
  console.error('Caught exception: ' + err + ' Stack: ' + err.stack)
  Logger.server.log('info', 'Caught exception: ' + err + ' Stack: ' + err.stack);
  fs.writeFileSync('crashlog.txt', 'Caught exception: ' + err.toString() + ' Stack: ' + err.stack);
  process.exit(99);
});
