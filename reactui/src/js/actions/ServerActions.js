var Constants = require('../Constants');
var _socket = null;

function restfulCall(type, url, data, success, error) {
  $.ajax({
    type: type,
    url: ApiUrl + url,
    contentType: 'application/json',
    xhrFields: {
      withCredentials: true
    },
    data: JSON.stringify(data),
    processData: false,
    success: success,
    error: error,
    crossDomain: true
  });
}

var ServerActions = {
  // Bind all actions to socket callback
  connect: function(address, callback) {
    _socket = io.connect(address);

    _socket.on('devices', function(message) {
      this.dispatch(Constants.DEVICE_LIST_UPDATED, message);
    }.bind(this));

    _socket.on('rules', function(message) {
      this.dispatch(Constants.RULES_LIST_UPDATED, message);
    }.bind(this));

    _socket.on('devicejoined', function(newNode) {
      this.dispatch(Constants.DEVICE_JOINED, newNode);
    }.bind(this));

    _socket.on('deviceleft', function(leftNode) {
      this.dispatch(Constants.DEVICE_LEFT, leftNode);
    }.bind(this));

    _socket.on('deviceupdate', function(updatedNode) {
      this.dispatch(Constants.DEVICE_UPDATE, updatedNode);
    }.bind(this));

    _socket.on('otaevents', function(otaEvent) {
      this.dispatch(Constants.OTA_EVENTS, otaEvent);
    }.bind(this));

    _socket.on('serversettings', function(data) {
      this.dispatch(Constants.SERVER_SETTINGS, data);
    }.bind(this));

    _socket.on('gatewaysettings', function(data) {
      this.dispatch(Constants.GATEWAY_SETTINGS, data);
    }.bind(this));

    _socket.on('otaavailablefiles', function(ota) {
      this.dispatch(Constants.OTA_AVAILABLE_FILES, ota);
    }.bind(this));

    _socket.on('serverlog', function(log) {
      this.dispatch(Constants.SERVER_LOG, log);
    }.bind(this));

    _socket.on('gatewaylog', function(log) {
      this.dispatch(Constants.GATEWAY_LOG, log);
    }.bind(this));

    _socket.on('traffictestlog', function(log) {
      this.dispatch(Constants.TRAFFIC_TEST_LOG, log);
    }.bind(this));

    _socket.on('traffictestresults', function(payload) {
      this.dispatch(Constants.TRAFFIC_TEST_RESULTS, payload);
    }.bind(this));

    _socket.on('heartbeat', function(data) {
      this.dispatch(Constants.HEARTBEAT, data);
    }.bind(this));

    _socket.on('networkSecurityLevel', function(data) {
      this.dispatch(Constants.NETWORK_SECURITY_LEVEL, data)
    }.bind(this));

    _socket.on('serverlogstream', function(log) {
      this.dispatch(Constants.SERVER_LOG_STREAM, log);
    }.bind(this));

    _socket.on('gatewaylogstream', function(stream) {
      this.dispatch(Constants.GATEWAY_LOG_STREAM, stream);
    }.bind(this));

    _socket.on('installcodecollection', function(data) {
      this.dispatch(Constants.INSTALL_COLLECTION, data);
    }.bind(this));

    _socket.on('connect', function() {
      callback(true);
    }.bind(this));

    if(Constants.CONSOLE_LOG_ENABLED) {
      _socket.on('executed', function(executed) {
        console.log('Gateway Executed: ' + JSON.stringify(executed));
      }.bind(this));

      _socket.on('connect_error', function() {
        console.log('connect_error');
      }.bind(this));

      _socket.on('connect_timeout', function() {
        console.log('connect_timeout');
      }.bind(this));

      _socket.on('reconnect_attempt', function() {
        console.log('reconnect_attempt');
      }.bind(this));

      _socket.on('reconnect_failed', function() {
        console.log('Reconnection failed');
      }.bind(this));
    }
  },

  gatewayPermitJoiningZB3: function(deviceEui, installCode, delayMs) {
    _socket.emit('action', {"type":"permitjoinZB3", deviceEui, installCode, delayMs});
  },

  gatewayPermitJoiningZB3OpenNetworkOnly: function(delayMs) {
    _socket.emit('action', {"type":"permitjoinZB3OpenNetworkOnly", delayMs});
  },

  gatewayPermitJoiningZB3InstallCodeOnly: function(deviceEui, installCode, delayMs) {
    _socket.emit('action', {"type":"permitjoinZB3InstallCodeOnly", deviceEui, installCode, delayMs});
  },

  gatewayPermitJoiningOffZB3: function() {
    _socket.emit('action', {"type":"permitjoinoffZB3"});
  },

  createRule: function(inDeviceInfo, outDeviceInfo) {
    _socket.emit('action', {"type":"addrelay", inDeviceInfo, outDeviceInfo});
  },

  createCloudRule: function(inDeviceInfo, outDeviceInfo) {
    _socket.emit('action', {"type":"addcloudrule", inDeviceInfo,
                                                   outDeviceInfo});
  },

  deleteRule: function(inDeviceInfo, outDeviceInfo) {
    _socket.emit('action', {"type":"deleterelay", inDeviceInfo,
                                                  outDeviceInfo});
  },

  deleteCloudRule: function(inDeviceInfo, outDeviceInfo) {
    _socket.emit('action', {"type":"deletecloudrule", inDeviceInfo,
                                                      outDeviceInfo});
  },

  clearCloudRules: function() {
    _socket.emit('action', {"type":"clearcloudrules"});
  },

  clearRules: function() {
    _socket.emit('action', {"type":"clearrelays"});
  },

  requestInstallCodeFromServer: function(eui64) {
    _socket.emit('action', {"type":"installcoderequest", eui64});
  },

  syncNodesOnRuleCreation: function(inputNodeWithAttribute, outputNode) {
    _socket.emit('action', {"type":"syncnodesonrulecreation", inputNodeWithAttribute,
                                                              outputNode});
  },

  createGroup: function(groupMessage) {
    var itemList = [];
    var group = {};
    Object.keys(groupMessage).forEach(function(key) {
      if (groupMessage[key] === true) {
        itemList.push(key);
      }
    });

    group.devices = itemList;
    _socket.emit('servermessage', {"type":"addgroup", group});
  },

  removeGroup: function(groupName) {
    _socket.emit('servermessage', {"type":"removegroup", groupName});
  },

  removeGroups: function(groupName) {
    _socket.emit('servermessage', {"type":"removegroups"});
  },

  createGroupRule: function(from, toList) {
    toList.forEach(function(toIndex) {
      ServerActions.createRule(from, toIndex)
    });
  },

  simpleReformZB3Network: function() {
    _socket.emit('action', {"type":"simpleReformZB3Network"});
  },

  reformZB3Network: function(radioChannel, networkPanId, radioTxPower) {
    _socket.emit('action', {"type":"reformZB3network", radioChannel, networkPanId, radioTxPower});
  },

  removeNode: function(node) {
    var nodeId = node.data.nodeId;
    var deviceEui = node.data.deviceEndpoint.eui64;
    var endpoint = node.data.deviceEndpoint.endpoint;

    _socket.emit('action', {"type":"removedevice", nodeId, deviceEui, endpoint});
  },

  setDeviceToggle: function(node) {
    if (node.data.deviceType === 'group') {
      var deviceTableIndex = node.data.itemList;
      _socket.emit('action', {"type":"lighttoggle", deviceTableIndex});
    } else {
      var deviceEndpoint = node.data.deviceEndpoint;
      _socket.emit('action', {"type":"lighttoggle", deviceEndpoint});
    }
  },

  setDeviceOff: function(node) {
    if (node.data.deviceType === 'group') {
      var deviceTableIndex = node.data.itemList;
      _socket.emit('action', {"type":"lightoff", deviceTableIndex});
    } else {
      var deviceEndpoint = node.data.deviceEndpoint;
      _socket.emit('action', {"type":"lightoff", deviceEndpoint});
    }
  },

  setDeviceOn: function(node) {
    if (node.data.deviceType === 'group') {
      var deviceTableIndex = node.data.itemList;
      _socket.emit('action', {"type":"lighton", deviceTableIndex});
    } else {
      var deviceEndpoint = node.data.deviceEndpoint;
      _socket.emit('action', {"type":"lighton", deviceEndpoint});
    }
  },

  enterIdentify: function(node) {
    var deviceEndpoint = node.data.deviceEndpoint;
    _socket.emit('action', {"type":"enterIdentify", deviceEndpoint});
  },

  exitIdentify: function(node) {
    var deviceEndpoint = node.data.deviceEndpoint;
    _socket.emit('action', {"type":"exitIdentify", deviceEndpoint});
  },

  setLightLevel: function(level, node) {
    var hex = parseInt(level, 10).toString(16).toUpperCase();

    if (node.data.deviceType === 'group') {
      var deviceTableIndex = node.data.itemList;
      _socket.emit('action', {"type":"setlightlevel", deviceTableIndex, level});
    } else {
      var deviceEndpoint = node.data.deviceEndpoint;
      _socket.emit('action', {"type":"setlightlevel", deviceEndpoint, level});
    }
  },

  setLightTemp: function(colorTemp, node) {
    if (node.data.deviceType === 'group') {
      var deviceTableIndex = node.data.itemList;
      _socket.emit('action', {"type":"setlightcolortemp", deviceTableIndex, colorTemp});
    } else {
      var deviceEndpoint = node.data.deviceEndpoint;
      _socket.emit('action', {"type":"setlightcolortemp", deviceEndpoint, colorTemp});
    }
  },

  setLightColor: function(hue, sat, node) {
    if (node.data.deviceType === 'group') {
      var deviceTableIndex = node.data.itemList;
      _socket.emit('action', {"type":"setlighthuesat", deviceTableIndex, hue, sat});
    } else {
      var deviceEndpoint = node.data.deviceEndpoint;
      _socket.emit('action', {"type":"setlighthuesat", deviceEndpoint, hue, sat});
    }
  },

  enableCliTerminal: function() {
    _socket.emit('action', {"type":"enableCliTerminal"});
  },

  disableCliTerminal: function() {
    _socket.emit('action', {"type":"disableCliTerminal"});
  },

  requestNodeAttribute: function(deviceEndpoint, attributeString) {
    _socket.emit('action', {"type":"requestattribute", deviceEndpoint, attributeString});
  },

  testNetwork: function(deviceTableIndex, periodMs, iterations, nodeId, deviceType) {
    _socket.emit('action', {"type":"starttraffictest", deviceTableIndex, periodMs, iterations, nodeId, deviceType});
  },

  gatewayUpgradePolicy: function(upgrade) {
    _socket.emit('action', {"type":"otasetupgrade", upgrade});
  },

  gatewayNotify: function(otaitem, item) {
    var nodeId = item.data.nodeId;
    var manufacturerId = otaitem.manufacturerId;
    var imageTypeId = otaitem.imageTypeId;
    var firmwareVersion = otaitem.firmwareVersion;

    _socket.emit('action', {"type":"otaupgradenotify", nodeId, manufacturerId, imageTypeId, firmwareVersion});
  },

  getGatewayState: function() {
    _socket.emit('action', {"type":"requestgatewaystate"});
  },

  setGatewayAttribute: function(attribute, value) {
    _socket.emit('action', {"type":"setgatewayattribute", attribute, value});
  },

  sendCommandsScriptName: function(fileName) {
    _socket.emit('action', {"type":"sendCommandsScriptName", fileName});
  },

  getOtaFiles: function() {
    _socket.emit('servermessage', {"type":"getotafiles"});
  },

  otaClearDirectory: function() {
    _socket.emit('servermessage', {"type":"otaclear"});
  },

  otaCopyFile: function(otaitem) {
    var otaFilename = otaitem.filename;
    _socket.emit('servermessage', {"type":"otacopyimagetostage", otaFilename});
  },

  getWebserverState: function() {
    _socket.emit('servermessage', {"type":"getwebserverinfo"});
  },

  setWebserverAttribute: function(attribute, value) {
    _socket.emit('servermessage', {"type":"setwebserverattribute", attribute, value});
  },

  requestTestLog: function() {
    _socket.emit('servermessage', {"type":"loadtraffictestlog"});
  },

  requestServerLog: function() {
    _socket.emit('servermessage', {"type":"loadserverlog"});
  },

  requestGatewayLog: function() {
    _socket.emit('servermessage', {"type":"loadgatewaylog"});
  },

  sendCommands: function(commands) {
    _socket.emit('command', commands);
  },
};

module.exports = ServerActions;
