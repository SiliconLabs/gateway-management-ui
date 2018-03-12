// Copyright 2017 Silicon Laboratories, Inc.

var ip               = require('ip'),
  path               = require('path'),
  _                  = require('underscore'),
  fs                 = require('fs-extra'),
  Constants          = require('../Constants.js'),
  Config             = require('../Config.js'),
  Utilities          = require('../Utilities.js'),
  ServerActions      = require('../actions/ServerActions.js'),
  ota                = require('./sub-modules/OverTheAirUpdate.js'),
  Logger             = require('../Logger.js'),
  CustomerTest       = require('../CustomerTest.js'),
  RulesEngine        = require('./sub-modules/RulesEngine.js'),
  DeviceDBManagement = require('./DeviceDBManagement.js'),
  ZCLDataTypes       = require('../zcl-definitions/ZCLDataTypes.js'),
  ZCLResponseActions = require('./ZCLResponseActions.js'),
  ZCLAttributeNames  = require('../zcl-definitions/ZCLAttributeNames.js').ZCLAttributeNames;

var gatewayStorePath = path.join(__dirname, Constants.gatewayStore);

var DeviceController = {
  // server Settings
  serverSettings: {
    'ip': ip.address(),
    'otaInProgress': false,
    'customerTesting': false,
    'logStreaming': false,
    'cliTerminal': false,
    'testNumber': 1
  },

  // Mirror of local relaylist
  relayList: [],
  // Cloud group list
  groups: [],
  // Settings
  settings: {},
  // Gateway Settings
  gatewaySettings: {
    'trafficReporting': false
  },
  // Cloud network state
  gatewayNetworkState: {
    'networkUp': null,
  },
  // List of known ZigBee gateways
  gatewayList: {},
  // Ota Timeout
  missingOtaBlockSent: {},
  missingHeartbeat: {},
  gatewayEui: '',
  currentTest: null,
  currentGroupNum: 1,
  heartbeatUpCount: 0,
  currentOtaUpdatingDevice: '',
  validateNetworkReformCountDown: false,
  simpleRefromZB3NetworkTriggered: false,

  rulesEngine: new RulesEngine(),
  zb3KeyManagement: DeviceDBManagement.zb3KeyManagement,

  /* This event is fired when a device sends a new attribute
  mqtt message format:
  {
    "clusterId":"0x0406",
    "attributeId":"0x0000",
    "attributeBuffer":"0x01",
    "attributeDataType":"0x18",
    "deviceEndpoint":{
      "eui64":"0x000B57FFFE1938F0",
      "endpoint":1
    }
  }
  */
  onZCLResponse: function(messagePayload) {
    if (messagePayload.commandId) {
      DeviceController.onCommand(messagePayload);
    } else {
      DeviceController.onAttributeUpdate(messagePayload);
    }
    DeviceController.onZCLRuleMessage(messagePayload);
  },

  /* This event is fired when a device sends a command
  mqtt message format:
  {
    clusterId: "clusterIdString",
    commandId: "hexBuffer",
    commandData: "hexBuffer",
    nodeId: "nodeIDString",
    nodeEui: "nodeEuiString",
  }
  */
  onCommand: function(messageParsed) {
    var globalItem = DeviceDBManagement.devices[DeviceDBManagement.getHash(messageParsed.deviceEndpoint)]

    // If global item does not exist
    if (!globalItem) return;

    // Determine action
    if (messageParsed.clusterId == Constants.IAS_ZONE_CLUSTER) {
      if (messageParsed.commandId == Constants.ZONE_STATUS_CHANGE_NOTIFICATION_COMMAND_ID) {
        // Get Character 0x0<o>00 0000 0000 from hex string
        var zoneStatusNibble = messageParsed.commandData[3];
        globalItem.tamperState = zoneStatusNibble & 4;
        globalItem.contactState = zoneStatusNibble & 1;
        Logger.server.info('DeviceController: ZoneStatusChangeCommandSuccess: contactState: ' + globalItem.contactState
                            + ' tamperState: ' + globalItem.tamperState);
        ServerActions.SocketInterface.publishDeviceUpdateToClients(globalItem);
      }
    }
  },

  /* This event is fired when a device sends a new attribute
  mqtt message format:
  {
    clusterId: "clusterIdString",
    attributeId: "attributeIdString",
    attributeBuffer: "hexBuffer",
    attributeDataType: <dataTypeInt>,
    nodeId: "nodeIDString",
    nodeEui: "nodeEuiString",
    returnStatus: <0 or 1>,
  }
  */

  // This is called when a node's unique camel case attribute 'tag' is read
  onAttributeUpdate: function(messageParsed) {
    var globalItem = DeviceDBManagement.devices[DeviceDBManagement.getHash(messageParsed.deviceEndpoint)]

    // Read property
    var property = friendlyParameterName(messageParsed.clusterId, messageParsed.attributeId);

    // Can't find property
    if (property ===  undefined) {
      Logger.server.info('DeviceController: AttributeUpdateFailed: Cant find property');
      return;
    }

    // Parse buffer and return value string
    try {
      var value = zclParseBufferRaw(messageParsed.attributeDataType, messageParsed.attributeBuffer);
    } catch (e) {
      Logger.server.info('DeviceController: AttributeUpdateFailed: Exception parsing value: ' + e.toString());
      return;
    }

    var convertedValue = formatAndAssignValue(globalItem, property, value, messageParsed.status);

    Logger.server.info('DeviceController: AttributeUpdateSuccess: Property: ' + property +
                        ' Value:' + value + ' Converted: ' + convertedValue);

    ServerActions.SocketInterface.publishDeviceUpdateToClients(globalItem);
  },

  /*
  This is called when an Over-The-Air upgrade event occurs on a node
    otaFinished
    otaBlockSent
    otaStarted
    otaFailed

  {
    messageType: "<otaTypeString>",
    nodeId: "nodeIDString",
    nodeEui: "nodeEuiString",
    returnStatus: <0 or 1>,         //optional
    blocksSent: <numberOfBlocks>,   //optional
    blockSize: <sizeOfBlocksInBytes>, //optional
    manufacturerId: "%04String",  //optional
    imageTypeId: "%04String", //optional
    firmwareVersion: "%08String" //optional
  }
  */

  /*
    {"messageType":"otaBlockSent",
    "eui64":"0x000B57FFFE0977E1",
    "bytesSent":177975,
    "manufacturerId":"0x1002",
    "imageTypeId":"0xA002",
    "firmwareVersion":"0x00000002"}
  */

  onOtaEvent: function(messageParsed) {
    _.each(DeviceDBManagement.devices, function(value, key, list) {
      if (key.split('-')[0] == messageParsed.eui64) {
        this.updateDeviceFromOTA(value, messageParsed);
      }
    }.bind(this));
  },

  onZCLRuleMessage: function(messagePayload) {
    if (messagePayload.commandId) {
      if (messagePayload.clusterId == Constants.IAS_ZONE_CLUSTER) {
        if (messagePayload.commandId == Constants.ZONE_STATUS_CHANGE_NOTIFICATION_COMMAND_ID) {
          // Get Character 0x0<o>00 0000 0000 from hex string
          var zoneStatusNibble = messagePayload.commandData[3];
          var contactState = zoneStatusNibble & 1;

          var clusterId = messagePayload.clusterId;
          var commandId = messagePayload.commandId;
          var sourceEndpoint = messagePayload.deviceEndpoint;

          this.rulesEngine.onZCLCommand(clusterId, commandId, contactState, sourceEndpoint);
        }
      }
    } else {
      try {
        var value = zclParseBufferRaw(messagePayload.attributeDataType, messagePayload.attributeBuffer);
      } catch (e) {
        Logger.server.info('DeviceController: AttributeUpdateFailed: Exception parsing value: ' + e.toString());
        return;
      }

      var clusterId = messagePayload.clusterId;
      var attributeId = messagePayload.attributeId;
      var sourceEndpoint = messagePayload.deviceEndpoint;

      this.rulesEngine.onZCLAttribute(clusterId, attributeId, value, sourceEndpoint);
    }
  },

  onMessageExecuted: function(data) {
    // Send to clients
    ServerActions.SocketInterface.publishExecutedMessageToClients(data);
  },

  onGatewaySettings: function(messageParsed) {
    // Store
    this.gatewaySettings = messageParsed;
    // Send to clients
    ServerActions.SocketInterface.publishGatewayInfoMessageToClients(messageParsed);
  },

  onTrafficTestResults: function(messageParsed) {
    // On test finish wait 3 seconds and report results.
    setTimeout(function() {
      this.serverSettings.customerTesting = false;

      if (this.currentTest !== null) {
        this.currentTest.setLegacy(messageParsed);
        this.currentTest.processBuildDefault();
        ServerActions.GatewayInterface.gatewaySetAttribute('trafficReporting', false);
        ServerActions.GatewayInterface.requestState();
      } else {
        Logger.server.log('error', 'Current test is null');
      }
      Logger.server.log('info', 'Testing Results: ' + JSON.stringify(messageParsed));
      ServerActions.SocketInterface.sendTrafficTestResults(messageParsed);
    }.bind(this), Constants.TEST_MESSAGE_IN_FLIGHT_TIMEOUT);
  },

  onTestEvent: function(messageParsed) {
    if (this.currentTest !== null) {
      if (Config.CLOUD_ENABLED) {
        Logger.server.log('info', 'Cloud enabled, Test functions disabled');
        return;
      }
      this.currentTest.handleTestMessage(messageParsed);
    } else {
      Logger.server.log('error', 'Current test is null');
    }
  },

  onRelayList: function(messageParsed) {
    this.relayList = messageParsed;
    this.sendCloudStateToClients();
  },

  onHeartbeat: function(messageParsed, gatewayEui) {
    clearTimeout(this.missingHeartbeat);
    var randomPanValue = Math.floor(Math.random() * (65535)) + 1;

    var currentGateway = {
      gatewayEui: this.gatewayEui,
      pan: Utilities.formatNumberToHexString(randomPanValue, 4).slice(-4),
      chan: '14',
      pow: '-2',
      netstat: messageParsed.networkUp
    };

    // If gateway does not exist, reform the network
    if (!this.gatewayList[this.gatewayEui]) {
      Logger.server.log('info', 'in Heartbeat: Gateway not found in Store.');

      // Add the current gateway to the dictionary, write to store, and reform
      this.gatewayList[this.gatewayEui] = currentGateway;
      fs.writeFileSync(gatewayStorePath, JSON.stringify(this.gatewayList));
      // zigbee3ReformNetwork takes channel string, pow string, pan string (without 0x)
      ServerActions.GatewayInterface.zigbee3ReformNetwork(currentGateway.chan,
                                                          currentGateway.pow,
                                                          currentGateway.pan);
      // Set the default networkSecurityLevel as 'Z3'.
      currentGateway.networkSecurityLevel = 'Z3';
      Logger.server.log('info', 'in Heartbeat: Created Random PAN, Saved, and Reformed Network.');
    } else {
      // Found gateway information, check if up
      if (messageParsed.networkUp) {
        clearTimeout(this.validateNetworkReformCountDown);
        // Update gateway info to heartbeat information
        currentGateway.networkPanId = messageParsed.networkPanId;
        currentGateway.radioTxPower = messageParsed.radioTxPower;
        currentGateway.radioChannel = messageParsed.radioChannel;
        if (this.gatewayList[this.gatewayEui].networkSecurityLevel != undefined) {
          currentGateway.networkSecurityLevel = this.gatewayList[this.gatewayEui].networkSecurityLevel;
        }
        this.gatewayList[this.gatewayEui] = currentGateway;

        if (this.heartbeatUpCount === 0) {
          this.heartbeatUpCount++;
          Logger.server.log('info', 'Heartbeat Up: ' + JSON.stringify(messageParsed));
          fs.writeFileSync(gatewayStorePath, JSON.stringify(this.gatewayList));
        } else if (this.heartbeatUpCount === 1) {
          this.heartbeatUpCount++;
          ServerActions.GatewayInterface.requestState();
        }
      } else {
        // Gateway is down
        Logger.server.log('info', 'in Heartbeat: Gateway found in store and network down.');
      }
    }

    this.setGatewayCurrentGatewayEui(gatewayEui);
    this.setGatewayNetworkState(messageParsed);
    this.sendHeartbeat();
    if (currentGateway.networkSecurityLevel != undefined) {
        this.sendNetworkSecurityLevel(currentGateway.networkSecurityLevel);
    }

    this.missingHeartbeat = setTimeout(function() {
      var missedHeartbeatMessage = {
        'networkUp': null,
      };

      this.setGatewayNetworkState(missedHeartbeatMessage);
      this.sendHeartbeat();

      Logger.server.log('info', 'SocketIO Emit: Gateway Down. '
        + 'Topic: heartbeat \nPayload: '
        + JSON.stringify(this.gatewayNetworkState));

      // Wait for this heartbeat at 2x the timeout value
    }.bind(this), Constants.GATEWAY_HEARTBEAT_FREQUENCY_MS * 2);

    if (this.simpleRefromZB3NetworkTriggered) {
      // Make sure we set the countdown once.
      this.simpleRefromZB3NetworkTriggered = false;
      this.validateNetworkReformCountDown = setTimeout(function() {
        // Add the current gateway to the dictionary, write to store, and reform
        this.gatewayList[this.gatewayEui] = currentGateway;
        fs.writeFileSync(gatewayStorePath, JSON.stringify(this.gatewayList));
        // zigbee3ReformNetwork takes channel string, pow string, pan string (without 0x)
        ServerActions.GatewayInterface.zigbee3ReformNetwork(currentGateway.chan,
                                                            currentGateway.pow,
                                                            currentGateway.pan);
        // Set the default networkSecurityLevel as 'Z3'.
        currentGateway.networkSecurityLevel = 'Z3';
      }.bind(this), Constants.GATEWAY_HEARTBEAT_FREQUENCY_MS * 2);
    }
  },

  /*
  This event is called when a client sends a predefined action to the gateway
    action payloads: {type: type, params ... }
      {"type":"permitjoinms", delayMs}
      {"type":"permitjoinZB3", deviceEui, installCode, delayMs}
      {"type":"permitjoinZB3OpenNetworkOnly", delayMs}
      {"type":"permitjoinZB3InstallCodeOnly", deviceEui, installCode, delayMs}
      {"type":"permitjoinoff"}
      {"type":"permitjoinoffZB3"}
      {"type":"addrelay", inDeviceInfo, outDeviceInfo}
      {"type":"clearrelays"}
      {"type":"deleterelay", inDeviceInfo, outDeviceInfo}
      {"type":"addcloudrule",  inDeviceInfo, outDeviceInfo}
      {"type":"clearcloudrules"}
      {"type":"deletecloudrule", inDeviceInfo, outDeviceInfo}
      {"type":"reformnetwork", radioChannel, networkPanId, radioTxPower}
      {"type":"simpleReformZB3Network"}
      {"type":"reformZB3network",radioChannel, networkPanId, radioTxPower}
      {"type":"removedevice", nodeId}
      {"type":"lighttoggle", deviceEndpoint}
      {"type":"lightoff", deviceEndpoint}
      {"type":"lighton", deviceEndpoint}
      {"type":"enterIdentify", deviceEndpoint}
      {"type":"exitIdentify", deviceEndpoint}
      {"type":"setlightlevel", deviceEndpoint, level})
      {"type":"setlightcolortemp", deviceEndpoint, colorTemp}
      {"type":"setlighthuesat", deviceEndpoint, hue, sat}
      {"type":"bindtempsensor", deviceEndpoint}
      {"type":"requestattribute", deviceEndpoint, attributeString}
      {"type":"starttraffictest", deviceEndpoint, periodMs, iterations, nodeId, deviceType}
      {"type":"otasetupgrade", upgrade}
      {"type":"otaupgradenotify", nodeId, manufacturerId, imageTypeId, firmwareVersion}
      {"type":"requestgatewaystate"}
      {"type":"setgatewayattribute", attribute, value}
      {"type":"enableCliTerminal"}
      {"type":"disableCliTerminal"}
      {"type":"sendCommandsScriptName", fileName}
      {"type":"installcoderequest", eui64}
      {"type":"syncnodesonrulecreation", inputNodeWithAttribute, outputNode}
  */
  onSocketAction: function(messageParsed) {
    switch (messageParsed.type) {
      case 'permitjoinms':
        var delayMs = messageParsed.delayMs;

        ServerActions.GatewayInterface.zigbeePermitJoinMs(delayMs);
        break;
      case 'permitjoinZB3':
        var deviceEui = messageParsed.deviceEui;
        var installCode = messageParsed.installCode;
        var delayMs = messageParsed.delayMs;

        this.zb3KeyManagement.startZB3Join(deviceEui, installCode, delayMs, false);
        this.zb3KeyManagement.updateReopenNetworkFlag('mixed', deviceEui);
        break;
      case 'permitjoinZB3OpenNetworkOnly':
        var delayMs = messageParsed.delayMs;

        ServerActions.GatewayInterface.zigbee3PermitJoinMsOpenNetworkOnly();
        this.zb3KeyManagement.updateReopenNetworkFlag('centralized', '');
        break;
      case 'permitjoinZB3InstallCodeOnly':
        var deviceEui = messageParsed.deviceEui;
        var installCode = messageParsed.installCode;
        var delayMs = messageParsed.delayMs;

        this.zb3KeyManagement.startZB3Join(deviceEui, installCode, delayMs, true);
        this.zb3KeyManagement.updateReopenNetworkFlag('installCodeOnly', deviceEui);
        break;
      case 'permitjoinoff':
        ServerActions.GatewayInterface.zigbeePermitJoinOff();
        break;
      case 'permitjoinoffZB3':
        ServerActions.GatewayInterface.zigbee3PermitJoinOff();
        this.zb3KeyManagement.updateReopenNetworkFlag('close', '');
        break;
      case 'addrelay':
        var inDeviceInfo = messageParsed.inDeviceInfo;
        var outDeviceInfo = messageParsed.outDeviceInfo;

        ServerActions.GatewayInterface.zigbeeAddRule(inDeviceInfo, outDeviceInfo);
        ServerActions.GatewayInterface.requestState();
        break;
      case 'clearrelays':
        this.relayList = [];
        ServerActions.GatewayInterface.zigbeeClearRules();
        ServerActions.GatewayInterface.requestState();
        break;
      case 'deleterelay':
        var inDeviceInfo = messageParsed.inDeviceInfo;
        var outDeviceInfo = messageParsed.outDeviceInfo;

        ServerActions.GatewayInterface.zigbeeDeleteRule(inDeviceInfo, outDeviceInfo);
        ServerActions.GatewayInterface.requestState();
        break;
      case 'addcloudrule':
        var inDeviceInfo = messageParsed.inDeviceInfo;
        var outDeviceInfo = messageParsed.outDeviceInfo;

        // The attribute is hard-coded.
        if (inDeviceInfo.deviceEndpoint.clusterId === '0x0406') {
          this.rulesEngine.addRule('0x0000', inDeviceInfo, outDeviceInfo, 'SIMPLE_BIND');
        } else if (inDeviceInfo.deviceEndpoint.clusterId === '0x0500') {
          this.rulesEngine.addRule('0x00', inDeviceInfo, outDeviceInfo, 'SIMPLE_BIND');
        } else {
          Logger.server.log('info',
                            'ClusterId does not support binding',
                            inDeviceInfo.deviceEndpoint.clusterId);
        }
        break;
      case 'clearcloudrules':
        this.rulesEngine.clearRules();
        break;
      case 'deletecloudrule':
        var inDeviceInfo = messageParsed.inDeviceInfo;
        var outDeviceInfo = messageParsed.outDeviceInfo;

        // The attribute is hard-coded.
        if (inDeviceInfo.deviceEndpoint.clusterId === '0x0406') {
          this.rulesEngine.deleteRule('0x0000', inDeviceInfo, outDeviceInfo, 'SIMPLE_BIND');
        } else if (inDeviceInfo.deviceEndpoint.clusterId === '0x0500') {
          this.rulesEngine.deleteRule('0x00', inDeviceInfo, outDeviceInfo, 'SIMPLE_BIND');
        } else {
          Logger.server.log('info',
                            'ClusterId does not support removing',
                            inDeviceInfo.deviceEndpoint.clusterId);
        }
        this.sendCloudStateToClients();
        break;
      case 'simpleReformZB3Network':
        ServerActions.GatewayInterface.zigbee3SimpleReformNetwork();
        this.syncCloudNetworkSecurityLevelWithLocalCopy('Z3');
        DeviceDBManagement.clearDevicesList();
        this.simpleRefromZB3NetworkTriggered = true;
        break;
      case 'reformZB3network':
        var chan = messageParsed.radioChannel;
        var txpower = messageParsed.radioTxPower;
        var pan = messageParsed.networkPanId;
        DeviceDBManagement.clearDevicesList();
        ServerActions.GatewayInterface.zigbee3ReformNetwork(chan, txpower, pan);
        this.syncCloudNetworkSecurityLevelWithLocalCopy('Z3');
        break;
      case 'removedevice':
        var nodeId = messageParsed.nodeId;
        var deviceEui = messageParsed.deviceEui;
        var endpoint = messageParsed.endpoint;

        this.rulesEngine.deleteRulesByDeviceInfo(deviceEui, endpoint);
        ServerActions.GatewayInterface.zigbeeRemoveDevice(nodeId);
        break;
      case 'lighttoggle':
        var deviceEndpoint = messageParsed.deviceEndpoint;

        ServerActions.GatewayInterface.zigbeeLightToggle(deviceEndpoint);
        break;
      case 'lightoff':
        var deviceEndpoint = messageParsed.deviceEndpoint;

        ServerActions.GatewayInterface.zigbeeLightOff(deviceEndpoint);
        break;
      case 'lighton':
        var deviceEndpoint = messageParsed.deviceEndpoint;

        ServerActions.GatewayInterface.zigbeeLightOn(deviceEndpoint);
        break;
      case 'enterIdentify':
        var deviceEndpoint = messageParsed.deviceEndpoint;

        ServerActions.GatewayInterface.zigbeeEnterIdentify(deviceEndpoint);
        break;
      case 'exitIdentify':
        var deviceEndpoint = messageParsed.deviceEndpoint;

        ServerActions.GatewayInterface.zigbeeExitIdentify(deviceEndpoint);
        break;
      case 'setlightlevel':
        var deviceEndpoint = messageParsed.deviceEndpoint;
        var level = messageParsed.level;

        ServerActions.GatewayInterface.zigbeeLightBrightness(deviceEndpoint, level);
        break;
      case 'setlightcolortemp':
        var deviceEndpoint = messageParsed.deviceEndpoint;
        var colorTemp = messageParsed.colorTemp;

        ServerActions.GatewayInterface.zigbeeLightColorTemp(deviceEndpoint, colorTemp);
        break;
      case 'setlighthuesat':
        var deviceEndpoint = messageParsed.deviceEndpoint;
        var hue = messageParsed.hue;
        var sat = messageParsed.sat;

        ServerActions.GatewayInterface.zigbeeLightHueSat(deviceEndpoint, hue, sat);
        break;
      case 'requestattribute':
        var deviceEndpoint = messageParsed.deviceEndpoint;
        var attributeString = messageParsed.attributeString;

        ServerActions.GatewayInterface.zigbeeRequestAttribute(deviceEndpoint, attributeString);
        break;
      case 'starttraffictest':
        // deprecated
        break;
      case 'otasetupgrade':
        var upgrade = messageParsed.upgrade;

        ServerActions.GatewayInterface.gatewayOtaUpgradeDirection(upgrade);
        break;
      case 'otaupgradenotify':
        var nodeId = messageParsed.nodeId;
        var manufacturerId = messageParsed.manufacturerId;
        var imageTypeId = messageParsed.imageTypeId;
        var firmwareVersion = messageParsed.firmwareVersion;

        ServerActions.GatewayInterface.otaUpgradeNotifyNode(nodeId, manufacturerId, imageTypeId, firmwareVersion);
        break;
      case 'requestgatewaystate':
        ServerActions.GatewayInterface.requestState();
        break;
      case 'setgatewayattribute':
        if (messageParsed.attribute === 'trafficReporting') {
          ServerActions.GatewayInterface.gatewaySetAttribute('trafficReporting', messageParsed.value);
          ServerActions.GatewayInterface.requestState();
        } else {
          Logger.server.log('info', 'Unsupported gateway attribute ' + messageParsed.value);
        }
        break;
      case 'enableCliTerminal':
        this.serverSettings.cliTerminal = true;
        break;
      case 'disableCliTerminal':
        this.serverSettings.cliTerminal = false;
        break;
      case 'sendCommandsScriptName':
        var fileName = messageParsed.fileName;
        ServerActions.GatewayInterface.sendCommandsInScript(fileName);
        break;
      case 'installcoderequest':
        var eui64 = messageParsed.eui64;
        this.zb3KeyManagement.uploadMatchedInstallCode(eui64);
        break;
      case 'syncnodesonrulecreation':
        var inputNodeWithAttribute = messageParsed.inputNodeWithAttribute;
        var outputNode = messageParsed.outputNode;
        this.rulesEngine.syncNodes(inputNodeWithAttribute, outputNode);
        break;
      default:
        Logger.server.log('info', 'Action not recognized: ' + messageParsed.type);
    }
  },

  /* This event is called when a client sends a zigbee cli commandlist to the gateway
    socketIO: command
    {
      “commands”:[
       {“command”:”<cli>”, postDelayMs: <time>},
       {“command”:”<cli>”, postDelayMs: <time>}
      ]
    }
  */
  onSocketCommand: function(messageParsed) {
    ServerActions.GatewayInterface.publishCommandList(messageParsed);
  },

  /* This event is called when a client sends a webserver message
    message payloads: {type: type, params ... }
    {"type":"getotafiles"}
    {"type":"otaclear"}
    {"type":"otacopyimagetostage", otaFilename}
    {"type":"getwebserverinfo"}
    {"type":"setwebserverattribute", attribute, value}
    {"type":"loadtraffictestlog"}
    {"type":"loadserverlog"}
    {"type":"loadgatewaylog"}
    {"type":"addgroup", group}
    {"type":"removegroup", groupName}
    {"type":"removegroups"}
  */
  onSocketServerMessage: function(messageParsed) {
    switch (messageParsed.type) {
      case 'removegroups':
        this.groups = [];
        this.sendCloudStateToClients();
        break;
      case 'removegroup':
        // Remove group by name
        this.groups.forEach(function(group, index){
          if (group.groupName == messageParsed.groupName) {
            this.groups.splice(index, 1);
          }
        }.bind(this));
        this.sendCloudStateToClients();
        break;
      case 'addgroup':
        // Add group with array group.itemList
        messageParsed.group.groupName = 'Group ' + this.currentGroupNum;
        this.currentGroupNum++
        var array = [];
        array.push({deviceType: 'group'});
        messageParsed.group.endpoints = array;

        this.groups.push(messageParsed.group);
        this.sendCloudStateToClients();
        break;
      case 'getotafiles':
        if (Config.CLOUD_ENABLED) {
          Logger.server.log('info', 'Cloud enabled, OTA functions disabled.');
          break;
        }
        // Get the list of OTA files from ota_staging and send to clients
        var files = ota.readOTAFiles();
        ServerActions.SocketInterface.sendOTAContents(files);

        break;
      case 'otaclear':
        if (Config.CLOUD_ENABLED) {
          Logger.server.log('info', 'Cloud enabled, OTA functions disabled.');
          break;
        }

        Logger.server.log('info', 'Clearing OTA Files: ');

        // Clear the OTA files in the Znet directory to cancel a current OTA
        this.serverSettings.otaInProgress = false;
        ota.clearOta();

        break;
      case 'otacopyimagetostage':
        if (Config.CLOUD_ENABLED) {
          Logger.server.log('info', 'Cloud enabled, OTA functions disabled.');
          break;
        }

        Logger.server.log('info', 'Copying ota file to staging. ');

        // Copy file and refresh storage
        this.serverSettings.otaInProgress = false;
        ota.copyFile(messageParsed.otaFilename);
        ServerActions.GatewayInterface.reloadOTAStorageCommon();

        break;
      case 'getwebserverinfo':
        this.sendServerSettings();
        this.sendHeartbeat();

        break;
      case 'setwebserverattribute':
        if (messageParsed.attribute === 'logStreaming') {
          this.serverSettings.logStreaming = messageParsed.value;
          Logger.logStreaming = messageParsed.value;
          this.sendServerSettings();
          Logger.server.log('info', 'Setting logStreaming to: ' + messageParsed.value);
        } else {
          Logger.server.log('info', 'Unsupported server attribute');
        }

        break;
      case 'loadtraffictestlog':
        if (Config.CLOUD_ENABLED) {
          Logger.server.log('info', 'Cloud enabled, Testing functions disabled');
          break;
        }

        Logger.loadTestLog(function(testLog) {
          ServerActions.SocketInterface.sendTrafficLog(testLog.toString());
        });

        break;
      case 'loadserverlog':
        Logger.loadServerLog(function(serverlog) {
          ServerActions.SocketInterface.sendServerLog(serverlog.toString());
        });

        break;
      case 'loadgatewaylog':
        if (Config.CLOUD_ENABLED) {
          Logger.server.log('info', 'Cloud enabled, Gateway log functions disabled.');
          break;
        }
        Logger.loadGatewayLog(function(gatewayLog) {
          ServerActions.SocketInterface.sendGatewayLog(gatewayLog.toString());
        });

        break;
      default:
        Logger.server.log('info', 'ServerMessage not recognized: ' + messageParsed.type);
    }
  },

  /*
    Helper methods
  */

  setLogStreaming: function(value) {
    this.serverSettings.logStreaming = value;
    Logger.logStreaming = value;
  },

  setOtaInProgress: function(value) {
    this.serverSettings.otaInProgress = value;
  },

  getServerSettings: function(callback) {
    // Refresh IP Address
    this.serverSettings.ip = ip.address();
    callback(this.serverSettings);
  },

  sendServerSettings: function() {
    // Refresh IP Address
    this.serverSettings.ip = ip.address();
    ServerActions.SocketInterface.sendServerSettings(this.serverSettings);
  },

  sendHeartbeat: function() {
    ServerActions.SocketInterface.publishHeartbeatToClients(this.gatewayNetworkState);
  },

  sendNetworkSecurityLevel: function(securityLevel) {
    ServerActions.SocketInterface.publishNetworkSecurityLevelToClients(securityLevel)
  },

  sendNetworkSecurityLevel: function(message) {
    ServerActions.SocketInterface.publishNetworkSecurityLevelToClients(message);
  },

  syncCloudNetworkSecurityLevelWithLocalCopy: function(securityLevelFromCloud) {
    this.gatewayList[this.gatewayEui].networkSecurityLevel = securityLevelFromCloud;
    fs.writeFileSync(gatewayStorePath, JSON.stringify(this.gatewayList));
  },

  setGatewayCurrentGatewayEui: function(gatewayEui) {
    this.gatewayEui = gatewayEui;
    ServerActions.GatewayInterface.currentGatewayEui = gatewayEui;
  },

  setGatewayNetworkState: function(state) {
    this.gatewayNetworkState = state;
  },

  sendCloudStateToClients: function() {
    // Cloud device state
    var cloudState = {
      devices: {},
      groups: [],
      cloudRules: [],
      gatewayEui: ''
    };

    // Refresh Cloud State
    cloudState.devices = _.values(DeviceDBManagement.devices);
    cloudState.groups = this.groups;
    cloudState.gatewayEui = this.gatewayEui;
    cloudState.cloudRules = this.rulesEngine.getRulesArray();

    this.sendServerSettings();
    ServerActions.SocketInterface.publishDeviceStateToClients(cloudState);
    ServerActions.SocketInterface.publishRulesStateSocketMessage(this.relayList);
  },

  requestGatewayState: function() {
    ServerActions.GatewayInterface.requestState();
  },

  startTrafficTest: function(deviceEndpoint, period, iterations, nodeId, deviceType) {
    Logger.server.log('info', 'Starting Customer Test... ');

    if (this.serverSettings.customerTesting) {
      Logger.server.log('info', 'Already Testing. Restarting. ');
    }

    // Start a test
    this.currentTest = new CustomerTest(this.serverSettings.testNumber,
                Logger.testing,
                period,
                iterations,
                nodeId,
                deviceType);

    this.serverSettings.customerTesting = true;
    this.setLogStreaming(false);
    this.serverSettings.testNumber++;

    ServerActions.GatewayInterface.gatewaySetAttribute('trafficReporting', true);
    ServerActions.GatewayInterface.zigbeeStartTrafficTest(deviceEndpoint, period, iterations)
    ServerActions.GatewayInterface.requestState();
  },

  recordOtaUpdatingNodeEui: function(eui64) {
    this.currentOtaUpdatingDevice = eui64;
  },

  updateDeviceFromOTA: function(device, messageParsed) {
    if (messageParsed.messageType === 'otaStarted') {
      Logger.server.log('info', 'OTA event started');
      this.serverSettings.otaInProgress = true;

      _.extend(device, {otaUpdating: true, otaTotalBytesSent: 0, otaUpdatePercent: 0});
    } else if (messageParsed.messageType === 'otaBlockSent') {
      Logger.server.log('info', 'OTA event blocksent');

      this.recordOtaUpdatingNodeEui(messageParsed.eui64);
      clearTimeout(this.missingOtaBlockSent);

      this.serverSettings.otaInProgress = true;
      var match = messageParsed.firmwareVersion.replace('0x', '')
      + messageParsed.imageTypeId.replace('0x', '')
      + messageParsed.manufacturerId.replace('0x', '');

      // Search for item, assign to message.otaTargetImageSizeKB
      _.map(ota.getOTAImages(), function(otafile) {
        if (otafile.key === match) {
          messageParsed.otaTargetImageSizeKB = otafile.imageSizeKB;
          return otafile;
        } else {
          return otafile;
        }
      }, this);

      _.extend(device, {otaUpdating: true,
                       otaTargetImageSizeKB: messageParsed.otaTargetImageSizeKB,
                       otaTargetFirmwareVersion: messageParsed.firmwareVersion,
                       otaTotalBytesSent: messageParsed.bytesSent});

      if ((device.otaTotalBytesSent / messageParsed.otaTargetImageSizeKB) * 100 > 100) {
        _.extend(device, {otaUpdatePercent: 100});
      } else {
        var percent = Math.round((device.otaTotalBytesSent / messageParsed.otaTargetImageSizeKB) * 10000) / 100;
        _.extend(device, {otaUpdatePercent: percent});
      }

      this.missingOtaBlockSent = setTimeout(function() {
        Logger.server.log('info', 'Ota block sent timed out. OTA event failed.');
        this.serverSettings.otaInProgress = false;
        _.extend(device, {otaUpdating: false, otaTotalBytesSent: 0});
        ServerActions.SocketInterface.publishDeviceUpdateToClients(device);
        ota.clearOta();
      }.bind(this), Constants.OTA_BLOCKSENT_TIMEOUT);

    } else if (messageParsed.messageType === 'otaFinished') {
      Logger.server.log('info', 'OTA event finished');
      this.serverSettings.otaInProgress = false;

      var update = {}
      update.manufacturerId = '0x' + messageParsed.manufacturerId.replace('0x', '');
      update.imageTypeId = '0x' + messageParsed.imageTypeId.replace('0x', '');
      update.firmwareVersion = '0x' + messageParsed.firmwareVersion.replace('0x', '');
      update.otaTotalBytesSent = 0;
      update.otaUpdatePercent = 0;
      update.otaUpdating = false;

      _.extend(device, update);
    } else if (messageParsed.messageType === 'otaFailed') {
      this.serverSettings.otaInProgress = false;
      Logger.server.log('info', 'OTA event failed');

      _.extend(device, {otaUpdating: false, otaTotalBytesSent: 0});
    }

    ServerActions.SocketInterface.publishDeviceUpdateToClients(device);
    ServerActions.SocketInterface.publishOtaEventsToClients(messageParsed);
  },

  sendOTAContents: function(messageParsed) {
    ServerActions.SocketInterface.sendOTAContents(messageParsed);
  },

  resetOtaUpdateStatus: function() {
    _.each(DeviceDBManagement.devices, function(value, key, list) {
      if (key.split('-')[0] == this.currentOtaUpdatingDevice) {
        Logger.server.log('info', 'User triggered cancelling ota update.');
        this.serverSettings.otaInProgress = false;
        _.extend(value, {otaUpdating: false, otaTotalBytesSent: 0});
        ServerActions.SocketInterface.publishDeviceUpdateToClients(value);
      }
    }.bind(this));
  },

  publishGatewayLogStreamSocketMessage: function(message) {
    ServerActions.SocketInterface.publishGatewayStreamSocketMessage(message.toString());
  },

  getGatewayNetworkState: function() {
    return this.gatewayNetworkState;
  }
};

function friendlyParameterName(cluster, attribute) {
  var clusterInt = parseInt(cluster, 16);
  var attributeInt = parseInt(attribute, 16);

  return ZCLAttributeNames[clusterInt][attributeInt];
}

function zclParseBufferRaw(datatype, buffer) {
  var datatype = parseInt(datatype, 16);

  // Failed to parse
  if (!datatype || !buffer) {
    Logger.server.log('info', 'In Parse Buffer Raw, datatype error');
    return null;
  } else {
    var zigbeeBuffer = new Buffer(buffer.replace('0x',''), 'hex');

    if (!ZCLDataTypes[datatype]) {
      Logger.server.log('info', 'In Parse Buffer, cant find dataType: ' + datatype);
      return null;
    }

    // Parse numbers based on type
    if (ZCLDataTypes[datatype].hasOwnProperty('signed')) {
      if(ZCLDataTypes[datatype].signed) {
        return zigbeeBuffer.readIntLEtemp(0, ZCLDataTypes[datatype].bytes);
      } else {
        return zigbeeBuffer.readUIntLEtemp(0, ZCLDataTypes[datatype].bytes);
      }
    } else {
      return zigbeeBuffer.readUIntLEtemp(0, ZCLDataTypes[datatype].bytes);
    }
  }
}

// Copy of NodeJS v4 function
function checkOffset(offset, ext, length) {
  if (offset + ext > length)
    throw new RangeError('Index out of range');
}

// Copy of NodeJS v4 function
Buffer.prototype.readIntLEtemp = function(offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert)
    checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul;
  mul *= 0x80;

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength);

  return val;s
};

// Copy of NodeJS v4 function
Buffer.prototype.readUIntLEtemp = function(offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert)
    checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul;

  return val;
};

function formatAndAssignValue(globalItem, friendlyName, value, status) {
  var NOT_SUPPORTED_STATUS = '0x86';

  if (status == NOT_SUPPORTED_STATUS) {
    globalItem[friendlyName] = 'Unsupported';
  }

  // Can't parse value
  if (value === null || value === undefined) {
    Logger.server.info('DeviceController: AttributeUpdateFailed: Value undefined.');
    return;
  }

  if (friendlyName === 'firmwareVersion') {

    // Convert firmware version to 8 char string
    value = Utilities.formatNumberToHexString(value, 8);
  } else if (friendlyName === 'imageTypeId') {

    // Convert image type to 4 char string
    value = Utilities.formatNumberToHexString(value, 4);
  } else if (friendlyName === 'manufacturerId') {

    // Convert manufacturer ID to 4 char string
    value = Utilities.formatNumberToHexString(value, 4);
  } else if (friendlyName === 'temperatureValue') {

    // Legacy code to ensure contact state temperature is in correct format MJW
    if (globalItem.firmwareVersion !== undefined &&
      parseInt(globalItem.deviceType) === Constants.DEVICE_TYPE_CONTACT_SENSOR) {
      // Check if old constact sensor firmware
      if (parseInt(globalItem.firmwareVersion, 16) <= 0x00000014) {
        value = value / 10;
      }
    }

    value = Utilities.convertTemperatureCtoF(value / 100).toFixed(2);
  } else if (friendlyName === 'powersumValue') {
    globalItem.rawPowerSumValue = value;

    // Powersum relies on other information
    if (globalItem.hasOwnProperty('powersumDivisor') &&
        globalItem.hasOwnProperty('powersumMultiplier') &&
        globalItem.hasOwnProperty('powersumFormatting') &&
        globalItem.hasOwnProperty('powersumUnits')) {

      // Value is Summation delivered * Multiplier / Divisor
      var convertedValue = (globalItem.powersumMultiplier * globalItem.rawPowerSumValue) / globalItem.powersumDivisor;

      // Bits 0 to 2 are # of digits to the right of decimal
      var precision = globalItem.powersumFormatting & 0x7;
      var decimalValue = convertedValue.toFixed(precision);

      // Bits 3 to 6 are the # of digits to the left of decimal, unnecessary for our formatting MJW
      var integerDigits = ((globalItem.powersumFormatting >> 3) & 0xF);

      // Bit 7 = 1 means suppress leading zeros, unnecessary for our formatting MJW
      var zeros = (globalItem.powersumFormatting | 0x80) >> 7;

      value = decimalValue;

      if (globalItem.powersumUnits !== 0) {
        // Value is not reported in kWh(binary)
        value = undefined;
      }
    } else {
      value = 0;
    }
  } else if (friendlyName === 'luxReading') {
    // Convert lux value
    value = Math.pow(10, (value / 10000)).toFixed(0);

  } else if (friendlyName === 'humidityReading') {
    // Convert humidty reading
    value = (value / 100).toFixed(2);

  } else if (friendlyName === 'occupancyReading') {
    // Bit 0 is occupancy
    value = value & 0x1;

  } else if (friendlyName === 'occupancySensorType') {
    // No conversion necessary

  } else if (friendlyName === 'zoneStatus') {

    // Bit 3 of the ZoneStatus attribute is tamper state, Bit 0 is contact state
    globalItem.tamperState = (value & 0x4) >> 2;
    globalItem.contactState = value & 0x1;

  } else if (friendlyName === 'rmsVoltage') {
    value = value / 10;

  } else if (friendlyName === 'rmsCurrent') {

  } else if (friendlyName === 'activePower') {
    value = value / 10;

  } else if (friendlyName === 'rssiValue') {
    // No conversion
  } else if (friendlyName === 'lqiValue') {
    // No conversion
  } else {
    // No conversion
  }

  globalItem[friendlyName] = value;
  return value;
}

/* Load from filesystem gateway file to get gateway history. */
if (fs.existsSync(gatewayStorePath)) {
  var load = fs.readFileSync(gatewayStorePath);
  if (load !== '') {
    try {
      DeviceController.gatewayList = JSON.parse(load);
    } catch (e) {
      Logger.server.log('info', 'Error reading Gateway Store file');
    }
    Logger.server.log('info', 'Gateway Store File Read: ' + load);
  }
}

module.exports = DeviceController;
