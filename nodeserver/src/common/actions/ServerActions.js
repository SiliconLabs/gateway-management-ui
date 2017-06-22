// Copyright 2015 Silicon Laboratories, Inc.

var fs                 = require('fs'),
    scriptReader       = require('readline'),
    path               = require('path'),
    Logger             = require('../Logger.js'),
    Utilities          = require('../Utilities.js'),
    ZCLAttributeInfo   = require('../ZCLAttributeInfo'),
    ZCLDataTypes       = require('../ZCLDataTypes.js'),
    Constants          = require('../Constants.js'),
    _                  = require('underscore');

var commandsScriptPath = path.join(__dirname, Constants.commandsScriptsPath);

/*
  These functions are used to send commands to the Gateway.
  Server --> Gateway.
*/
var GatewayInterfaceSend = {
  mqttClient: null,
  commandListQueue: null,
  currentGatewayEui: '',

  /*
    Handle Command List queue
  */
  handleCommandListQueue: function(commandlist, callback) {
    GatewayInterfaceSend.publishCommandList(commandlist);
    callback(true);
  },

  /*
    Throttled version of publishCommandList
  */
  publishCommandListThrottled: function(commandlist) {
    GatewayInterfaceSend.commandListQueue.push(commandlist, function() {
      Logger.server.log('info', 'Handled queued command');
    });
  },

  /*
    Publish command list
    Publishes multiple cli commands channel to be interpreted by
    the gateway.

    gw/<eui64_id>/commands
    {
      “commands”:[
       {“command”:”<cli>”, postDelayMs: <time>},
       {“command”:”<cli>”, postDelayMs: <time>}
      ]
    }

    Params: commandlist is a list of form: [{“command”:”<cli>”, postDelayMs: <time>},..]
  */
  publishCommandList: function(commandlist) {
    if (GatewayInterfaceSend.currentGatewayEui === '') {
      Logger.server.log('info', 'Error: No current gateway');
      return false;
    } else {
      var channel = 'gw/' + GatewayInterfaceSend.currentGatewayEui + '/commands';
    }

    var commandPayload = {commands: commandlist};

    try {
      GatewayInterfaceSend.mqttClient.publish(channel, JSON.stringify(commandPayload), {qos: 2}, function(e) {
        Logger.server.log('info', 'MQTT Published Topic: commands'
          + ' Payload: ' + JSON.stringify(commandPayload));
      });
    } catch (e) {
      Logger.server.log('info', 'Error attempting to publish to commands: ' + JSON.stringify(commandPayload));
    }
  },

  /*
    Requests the Gateway state (devices, rules, settings)
    format:
    gw/<eui64_id>/publishstate
    {}
  */
  requestState: function() {
    if (GatewayInterfaceSend.currentGatewayEui === '') {
      Logger.server.log('info', 'Error: No current gateway');
      return false;
    } else {
      var channel = 'gw/' + GatewayInterfaceSend.currentGatewayEui + '/publishstate';
    }

    try {
      GatewayInterfaceSend.mqttClient.publish(channel, '{}', {qos: 2}, function(e) {
        Logger.server.log('info', 'MQTT Published Topic: publishstate');
      });
    } catch (e) {
      Logger.server.log('info', 'Error attempting to publish to publishstate: ');
    }
  },

  /*
    Updates a setting on the gateway.
    gw/<eui64_id>/updatesettings
    {
      "trafficReporting" : "true"
    }
  */
  gatewaySetAttribute: function(attribute, value) {
    if (GatewayInterfaceSend.currentGatewayEui === '') {
      Logger.server.log('info', 'Error: No current gateway');
      return false;
    } else {
      var channel = 'gw/' + GatewayInterfaceSend.currentGatewayEui + '/updatesettings';
    }

    var commandPayload = {};
    commandPayload[attribute] = value;

    try {
      GatewayInterfaceSend.mqttClient.publish(channel, JSON.stringify(commandPayload), {qos: 2}, function(e) {
        Logger.server.log('info', 'MQTT Published Topic: updatesettings'
          + ' Payload: ' + JSON.stringify(commandPayload));
      });
    } catch (e) {
      Logger.server.log('error', 'gatewaySetAttribute error: ' + JSON.stringify(commandPayload));
    }
  },

  /*
    Enables zigbee permit joining for time joinMs
  */
  zigbeePermitJoinMs: function(joinMs) {
    GatewayInterfaceSend.publishCommandList([
      {command: 'network broad-pjoin ' + joinMs, postDelayMs: 100},
    ]);
  },

  /*
    Enable zigbee3.0 device joining for time joinMs
  */
  zigbee3PermitJoinMs: function(deviceEui, linkKey)  {
    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin network-creator-security set-joining-link-key {' + deviceEui + '} {' + linkKey + '}', postDelayMs:100},
      {command: 'plugin network-creator-security open-network', postDelayMs: 100}
    ]);
  },

  /*
    Enable zigbee3.0 device joining for time joinMs and install code only
  */
  zigbee3PermitJoinMsInstallCode: function(deviceEui, linkKey)  {
    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin network-creator-security clear-joining-link-keys'},
      {command: 'plugin network-creator-security open-with-key {' + deviceEui + '} {' + linkKey + '}', postDelayMs: 100}
    ]);
  },

  /*
    Enable zigbee3.0 device for time joinMs and only open-network
  */
  zigbee3PermitJoinMsOpenNetworkOnly: function()  {
    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin network-creator-security open-network', postDelayMs: 100}
    ]);
  },

  /*
    Disables zigbee permit joining
  */
  zigbeePermitJoinOff: function() {
    GatewayInterfaceSend.publishCommandList([
      {command: 'network broad-pjoin 0'},
    ]);
  },

  /*
    Disable zigbee3.0 permit joining
  */
  zigbee3PermitJoinOff: function() {
    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin network-creator-security close-network', postDelayMs: 100},
    ]);
  },

  /*
    Adds zigbee rule
    plugin command-relay add {<inDeviceEui>} <inDeviceEndpoint> <inClusterId>
                             {<outDeviceEui>} <outDeviceEndpoint> <outClusterId>
  */
  zigbeeAddRule: function(inDeviceInfo, outDeviceInfo) {
    var inEui = '{' + inDeviceInfo.deviceEndpoint.eui64.replace('0x', '') + '}';
    var inEndpoint = inDeviceInfo.deviceEndpoint.endpoint;
    var inClusterId = inDeviceInfo.deviceEndpoint.clusterId;

    var outEui =  '{' + outDeviceInfo.deviceEndpoint.eui64.replace('0x', '') + '}';
    var outEndpoint = outDeviceInfo.deviceEndpoint.endpoint;
    var outClusterId = outDeviceInfo.deviceEndpoint.clusterId;

    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin command-relay add ' + inEui + ' ' + inEndpoint + ' ' +
        inClusterId + ' ' + outEui + ' ' + outEndpoint + ' ' + outClusterId}
    ]);
  },

  /*
    Delete zigbee rule
    plugin command-relay remove {<inDeviceEui>} <inDeviceEndpoint> {<outDeviceEui>}
      <outDeviceEndpoint>
  */
  zigbeeDeleteRule: function(inDeviceInfo, outDeviceInfo) {
    var inEui = '{' + inDeviceInfo.deviceEndpoint.eui64.replace('0x', '') + '}';
    var inEndpoint = inDeviceInfo.deviceEndpoint.endpoint;
    var inClusterId = inDeviceInfo.deviceEndpoint.clusterId;

    var outEui =  '{' + outDeviceInfo.deviceEndpoint.eui64.replace('0x', '') + '}';
    var outEndpoint = outDeviceInfo.deviceEndpoint.endpoint;
    var outClusterId = outDeviceInfo.deviceEndpoint.clusterId;

    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin command-relay remove ' + inEui + ' ' + inEndpoint + ' '
        + inClusterId + ' ' + outEui + ' ' + outEndpoint + ' ' + outClusterId}
    ]);
  },

  /*
    Clears zigbee rules
  */
  zigbeeClearRules: function() {
    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin command-relay clear'},
    ]);
  },

  /*
    Clears ias-zone-client, device-table, rules, group and scene
  */
  zigbeeClearEntries: function() {
    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin device-table clear'},
      {command: 'plugin command-relay clear', postDelayMs: 100},
      {command: 'plugin ias-zone-client clear-all', postDelayMs: 100},
      {command: 'plugin groups-server clear', postDelayMs: 100},
      {command: 'plugin scenes clear', postDelayMs: 100}
    ]);
  },

  /*
    Send a reform network command to the gateway
  */
  zigbeeReformNetwork: function(chan, power, pan) {
    this.zigbeeClearEntries();
    GatewayInterfaceSend.publishCommandList([
      {command: 'network leave', postDelayMs: 1000},
      {command: 'network form ' + chan + ' ' + power + ' ' + '0x' + pan, postDelayMs: 1000},
      {command: 'network broad-pjoin 0'}
    ]);
  },

  /*
    Send a simple reform ZB3.0 network command to the gateway.
    The command would search for a clean channel.
  */
  zigbee3SimpleReformNetwork: function() {
    this.zigbeeClearEntries();
    GatewayInterfaceSend.publishCommandList([
      {command: 'network leave', postDelayMs: 1000},
      {command: 'plugin network-creator start ' + Constants.CENTRALIZED_SECURITY},
    ]);
  },

  /*
    Send a reform ZB3.0 network command to the gateway
  */
  zigbee3ReformNetwork: function(chan, power, pan) {
    this.zigbeeClearEntries();
    GatewayInterfaceSend.publishCommandList([
      {command: 'network leave', postDelayMs: 1000},
      {command: 'plugin network-creator form ' + Constants.CENTRALIZED_SECURITY +
        ' ' + '0x' + pan + ' ' + power + ' ' + chan},
    ]);
  },

  /*
    Zigbee remove device
  */
  zigbeeRemoveDevice: function(nodeId) {
    GatewayInterfaceSend.publishCommandList([
      {command: 'zdo leave ' + nodeId + ' 1 0'},
    ]);

    Logger.server.info('Zigbee remove device');
  },

  /*
    Light toggle
  */
  zigbeeLightToggle: function(deviceEndpoint) {
    if (Array.isArray(deviceEndpoint)) {
      var commandlist = [];
      deviceEndpoint.forEach(function(devEndpoint) {
        var eui64String = '{' + devEndpoint.eui64.replace('0x', '') + '}';

        commandlist.push({command:"zcl on-off toggle"})
        commandlist.push({command: 'plugin device-table send ' + eui64String +
          ' ' + devEndpoint.endpoint})
      });
      GatewayInterfaceSend.publishCommandList(commandlist);
    } else {
      var eui64String = '{' + deviceEndpoint.eui64.replace('0x', '') + '}';

      GatewayInterfaceSend.publishCommandList([
        {command: 'zcl on-off toggle'},
        {command: 'plugin device-table send ' + eui64String + ' ' +
          deviceEndpoint.endpoint},
      ]);
    }
  },

  /*
    Light off
  */
  zigbeeLightOff: function(deviceEndpoint) {
    if (Array.isArray(deviceEndpoint)) {
      var commandlist = []
      deviceEndpoint.forEach(function(devEndpoint) {
        var eui64String = '{' + devEndpoint.eui64.replace('0x', '') + '}';

        commandlist.push({command:"zcl on-off off"})
        commandlist.push({command: 'plugin device-table send ' + eui64String +
          ' ' + devEndpoint.endpoint})
      });
      GatewayInterfaceSend.publishCommandList(commandlist);
    } else {
      var eui64String = '{' + deviceEndpoint.eui64.replace('0x', '') + '}';

      GatewayInterfaceSend.publishCommandList([
        {command: 'zcl on-off off'},
        {command: 'plugin device-table send ' + eui64String + ' ' + deviceEndpoint.endpoint},
      ]);
    }
  },

  /*
    Light on
  */
  zigbeeLightOn: function(deviceEndpoint) {
    if (Array.isArray(deviceEndpoint)) {
      var commandlist = []
      deviceEndpoint.forEach(function(devEndpoint) {
        var eui64String = '{' + devEndpoint.eui64.replace('0x', '') + '}';

        commandlist.push({command:"zcl on-off on"})
        commandlist.push({command: 'plugin device-table send  ' + eui64String + ' ' + devEndpoint.endpoint})
      });
      GatewayInterfaceSend.publishCommandList(commandlist);
    } else {
      var eui64String = '{' + deviceEndpoint.eui64.replace('0x', '') + '}';

      GatewayInterfaceSend.publishCommandList([
        {command: 'zcl on-off on'},
        {command: 'plugin device-table send ' + eui64String + ' ' + deviceEndpoint.endpoint},
      ]);
    }
  },

  /*
    Light Brightness
  */
  zigbeeLightBrightness: function(deviceEndpoint, level) {
    if (Array.isArray(deviceEndpoint)) {
      var commandlist = []
      deviceEndpoint.forEach(function(devEndpoint) {
        var eui64String = '{' + devEndpoint.eui64.replace('0x', '') + '}';

        commandlist.push({command:'zcl level-control o-mv-to-level ' + level + ' 1'})
        commandlist.push({command: 'plugin device-table send  ' + eui64String + ' ' + devEndpoint.endpoint})
      });
      GatewayInterfaceSend.publishCommandList(commandlist);
    } else {
      var eui64String = '{' + deviceEndpoint.eui64.replace('0x', '') + '}';

      GatewayInterfaceSend.publishCommandList([
        {command: 'zcl level-control o-mv-to-level ' + level + ' 1'},
        {command: 'plugin device-table send ' + eui64String + ' ' + deviceEndpoint.endpoint},
      ]);
    }
  },

  /*
    Light Color Temp
  */
  zigbeeLightColorTemp: function(deviceEndpoint, colorTemp) {
    if (Array.isArray(deviceEndpoint)) {
      var commandlist = []
      deviceEndpoint.forEach(function(devEndpoint) {
        var eui64String = '{' + devEndpoint.eui64.replace('0x', '') + '}';

        commandlist.push({command:'zcl color-control movetocolortemp ' + colorTemp + ' 1'})
        commandlist.push({command: 'plugin device-table send  ' + eui64String + ' ' + devEndpoint.endpoint})
      });
      GatewayInterfaceSend.publishCommandList(commandlist);
    } else {
      var eui64String = '{' + deviceEndpoint.eui64.replace('0x', '') + '}';

      GatewayInterfaceSend.publishCommandList([
        {command: 'zcl color-control movetocolortemp ' + colorTemp + ' 1'},
        {command: 'plugin device-table send ' + eui64String + ' ' + deviceEndpoint.endpoint},
      ]);
    }
  },

  /*
    Light Hue Sat
  */
  zigbeeLightHueSat: function(deviceEndpoint, hue, sat) {
    if (Array.isArray(deviceEndpoint)) {
      var commandlist = []
      deviceEndpoint.forEach(function(devEndpoint) {
        var eui64String = '{' + devEndpoint.eui64.replace('0x', '') + '}';

        commandlist.push({command:'zcl color-control movetohueandsat ' + Math.floor((hue * 254) / 356) + ' ' + Math.floor((sat * 254) / 100) + ' 1'})
        commandlist.push({command: 'plugin device-table send  ' + eui64String + ' ' + devEndpoint.endpoint})
      });
      GatewayInterfaceSend.publishCommandList(commandlist);
    } else {
      var eui64String = '{' + deviceEndpoint.eui64.replace('0x', '') + '}';

      GatewayInterfaceSend.publishCommandList([
        {command: 'zcl color-control movetohueandsat ' + Math.floor((hue * 254) / 356) + ' ' + Math.floor((sat * 254) / 100) + ' 1'},
        {command: 'plugin device-table send ' + eui64String + ' ' + deviceEndpoint.endpoint},
      ]);
    }
  },

  /*
    Requests an cluster/attribute from a zigbee node or gateway
  */
  zigbeeRequestAttribute: function(deviceEndpoint, friendlyZigbeeAttribute) {
    var clusterString = ZCLAttributeInfo[friendlyZigbeeAttribute].clusterID;
    var attributeString = ZCLAttributeInfo[friendlyZigbeeAttribute].attributeID;
    var eui64String = '{' + deviceEndpoint.eui64.replace('0x', '') + '}';

    if (friendlyZigbeeAttribute === 'firmwareVersion' ||
      friendlyZigbeeAttribute === 'imageTypeId' ||
      friendlyZigbeeAttribute === 'manufacturerId') {

      var commandList = [
        {command: 'zcl global direction 1'},
        {command: 'zcl global read ' + clusterString + ' ' + attributeString},
        {command: 'plugin device-table send ' + eui64String + ' ' + deviceEndpoint.endpoint},
        {command: 'zcl global direction 0'},
      ];
    } else {
      var commandList = [
        {command: 'zcl global direction 0'},
        {command: 'zcl global read ' + clusterString + ' ' + attributeString},
        {command: 'plugin device-table send ' + eui64String + ' ' + deviceEndpoint.endpoint},
      ];
    }

    GatewayInterfaceSend.publishCommandListThrottled(commandList);

    Logger.server.info('Global Read Requesting Global Cluster: '
      +  clusterString + ' Attrib: ' + attributeString
      + ' deviceEndpoint: ' + deviceEndpoint);
  },

  /*
    Start traffic test
  */
  zigbeeStartTrafficTest: function(index, period, iterations) {
    var periodParsed = parseInt(period)
    var iterationsParsed = parseInt(iterations)

    if (periodParsed < 0) {
      periodParsed = 0;
    } else if (periodParsed > 5000) {
      periodParsed = 5000;
    }

    if (iterationsParsed < 0) {
      iterationsParsed = 0;
    } else if (iterationsParsed > 110) {
      iterationsParsed = 100;
    }

    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin traffic-test on-off ' + index + ' ' + periodParsed + ' ' + iterationsParsed, postDelayMs: 100},
    ]);
  },

  /*
    Set gateway firmware ota upgrade direction
    (true = upgrade, false = downgrade)
  */
  gatewayOtaUpgradeDirection: function(upgrade) {
    if(upgrade === undefined)
    {
      Logger.server.log('error', 'gatewayOtaUpgradeDirection has undefined parameter');
      return false;
    }

    if (upgrade) {
      upgrade = 0;
    } else {
      upgrade = 1;
    }

    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin ota-server policy query ' + upgrade, postDelayMs: 100},
    ]);
  },


  /*
    Notify a node to check for ota upgrades
  */
  otaUpgradeNotifyNode: function(nodeId, manufacturerId, imageTypeId, firmwareVersion) {
    if(!(nodeId && manufacturerId && imageTypeId && firmwareVersion))
    {
      Logger.server.log('error', 'otaUpgradeNotifyNode has undefined parameter' +
        nodeId + manufacturerId + imageTypeId + firmwareVersion);
      return false;
    }

    GatewayInterfaceSend.publishCommandList([
      {command: 'plugin ota-server notify ' + nodeId + ' 1 3 127 ' +
        manufacturerId + ' ' + imageTypeId + ' ' + firmwareVersion
        , postDelayMs: 100},
    ]);
  },

  /*
    Reload the ota-storage-common
  */
  reloadOTAStorageCommon: function() {

    GatewayInterfaceSend.publishCommandList([{command: 'plugin ota-storage-common reload'}]);
  },

  /*
    Set up reporting
  */
  genericConfigureReporting: function(deviceEndpoint, friendlyZigbeeAttribute, zclReportingOverrides) {
    var zclAttributeObject = ZCLAttributeInfo[friendlyZigbeeAttribute];
    _.assign(zclAttributeObject, zclReportingOverrides);

    var cluster = zclAttributeObject.clusterID;
    var attribute = zclAttributeObject.attributeID;
    var datatype = zclAttributeObject.datatype;
    var minSeconds = zclAttributeObject.defaultReportingMin;
    var maxSeconds = zclAttributeObject.defaultReportingMax;
    var reportableChange = zclAttributeObject.defaultReportableChangeThreshold;

    var reportableString = Utilities.formatNumberToHexBufferWithPadding(reportableChange, ZCLDataTypes[datatype].bytes);
    var clusterHexString = Utilities.formatNumberToHexString(cluster, 4);
    var attributeHexString = Utilities.formatNumberToHexString(attribute, 4);
    var datatypeHexString = Utilities.formatNumberToHexString(datatype, 2);
    var minTimeHexString = Utilities.formatNumberToHexString(minSeconds, 4);
    var maxTimeHexString = Utilities.formatNumberToHexString(maxSeconds, 4);

    if(!(clusterHexString && attributeHexString && datatypeHexString
      && minTimeHexString && maxTimeHexString)) {
      Logger.server.log('error', 'genericConfigureReporting has undefined parameter');
      return false;
    }

    var reportCommandString = 'zcl global send-me-a-report ' + clusterHexString + ' ' + attributeHexString +
    ' ' + datatypeHexString + ' ' + minTimeHexString + ' ' + maxTimeHexString + ' ' + reportableString;

    var eui64String = '{' + deviceEndpoint.eui64.replace('0x', '') + '}';

    GatewayInterfaceSend.publishCommandListThrottled([
      {command: reportCommandString},
      {command: 'plugin device-table send ' + eui64String + ' ' + deviceEndpoint.endpoint, postDelayMs: Constants.REPORTING_POST_DELAY},
    ]);

    Logger.server.info('Set up reporting.' + 'Attribute: ' + friendlyZigbeeAttribute + ' deviceEndpoint: ' + deviceEndpoint
      + ' Cluster: ' + clusterHexString + ' Attribute: ' + attributeHexString + ' Datatype: '
      + datatypeHexString + ' minSeconds: ' + minTimeHexString + ' maxSeconds: ' + maxTimeHexString);
  },

  /*
    Set up generic reporting
  */
  genericConfigureBind: function(deviceEndpoint, gatewayEui, nodeId, cluster) {
    var clusterHexString = Utilities.formatNumberToHexString(cluster, 4);

    if(!(clusterHexString && deviceEndpoint && gatewayEui && nodeId))
    {
      Logger.server.log('error', 'genericConfigureBind has undefined parameter');
      return false;
    }

    var eui64String = '{' + deviceEndpoint.eui64.replace('0x', '') + '}';
    var bindCommandString = 'zdo bind ' + nodeId + ' 1 1 ' + clusterHexString + ' ' + eui64String + ' {' + gatewayEui + '}';

    GatewayInterfaceSend.publishCommandListThrottled([
      {command: bindCommandString},
      {command: 'plugin device-table send ' + eui64String + ' ' + deviceEndpoint.endpoint, postDelayMs: Constants.BIND_POST_DELAY},
    ]);

    Logger.server.info('Set up bind entry: DeviceTable: ' + deviceEndpoint  + ' Cluster: ' + clusterHexString);
  },

  /*
    Parse command script and send commands via MQTT
  */
  sendCommandsInScript: function(fileName) {
    var scriptFullPath = commandsScriptPath + '/' + fileName;
    var scriptStream = fs.createReadStream(scriptFullPath);
    scriptStream.on('error', function() {
      Logger.server.info('Error: Failure in parsing ' + fileName + '. No such file or directory.');
      return;
    });
    var scriptLines = scriptReader.createInterface({input: scriptStream});
    scriptLines.on('line', function(line) {
      if (line.trim()) {
      	var parsedDelayMs = Constants.POSTDELAYMS_DEFAULT;
        var parsedCommand = '';
        if (line.indexOf(Constants.POSTDELAY_KEYWORD) !== -1) {
          parsedDelayMs = parseInt(line.split(',')[1].trim().split(':')[1].trim());
          parsedCommand = line.split(',')[0].trim();
        } else {
          parsedCommand = line.trim();
        }
        GatewayInterfaceSend.publishCommandList([
          {command: parsedCommand, postDelayMs: parsedDelayMs},
        ]);
      }
    });
  }
};

var SocketInterfaceSend = {
  ioserver: null,

  /*
    Generic send to all clients
  */
  sendToAllClientsOnChannel: function(channel, message) {
    SocketInterfaceSend.ioserver.sockets.emit(channel, message);
  },

  /*
    Sends the device state to all clients
  */
  publishDeviceStateToClients: function(cloudState) {
    SocketInterfaceSend.sendToAllClientsOnChannel('devices', cloudState);
  },

  /*
    Sends a server log packet to all of the clients.
  */
  publishRulesStateSocketMessage: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('rules', message);
  },

  /*
    Sends the device state to all clients
  */
  publishDeviceLeftToClients: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('deviceleft', message);
  },

  /*
    Sends the device state to all clients
  */
  publishDeviceJoinedToClients: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('devicejoined', message);
  },

  /*
    Sends a device update to all clients
  */
  publishDeviceUpdateToClients: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('deviceupdate', message);
  },

  /*
    Send Server info to all clients
  */
  sendServerSettings: function(info) {
    SocketInterfaceSend.sendToAllClientsOnChannel('serversettings', info);
  },

  /*
    Gateway Settings
  */
  publishGatewayInfoMessageToClients: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('gatewaysettings', message);
  },

  /*
    Sends the list of OTA files
  */
  sendOTAContents: function(files) {
    SocketInterfaceSend.sendToAllClientsOnChannel('otaavailablefiles', files);
  },

  /*
    Echos executed message for debugging
  */
  publishExecutedMessageToClients: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('executed', message);
  },

  sendServerLog: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('serverlog', message);
  },

  sendGatewayLog: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('gatewaylog', message);
  },

  sendTrafficLog: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('traffictestlog', message);
  },

  sendTrafficTestResults: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('traffictestresults', message);
  },

  /*
    Sends the heartbeat to all clients
  */
  publishHeartbeatToClients: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('heartbeat', message);
  },

  /*
    Sends the network security level to all clients
  */
  publishNetworkSecurityLevelToClients: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('networkSecurityLevel', message);
  },

  /*
    Sends a server log packet to all of the clients.
  */
  publishServerSocketMessage: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('serverlogstream', this.timestamp + ' ' + message + '\n\r');
  },

  /*
    Sends a server stream packet to all of the clients.
  */
  publishGatewayStreamSocketMessage: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('gatewaylogstream', message);
  },

  /*
    Sends matched install code to all of the clients.
  */
  publishMatchedInstallCode: function(message) {
    SocketInterfaceSend.sendToAllClientsOnChannel('installcodecollection', message);
  },
};

var ServerActions = {
  GatewayInterface: GatewayInterfaceSend,
  SocketInterface: SocketInterfaceSend
};

module.exports = ServerActions;
