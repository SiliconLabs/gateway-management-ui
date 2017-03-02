var Constants = require('../Constants');
var Fluxxor = require('fluxxor');

var lights = {};
lights[Constants.DEVICE_ID_ON_OFF_LIGHT] = 'Light';
lights[Constants.DEVICE_ID_DIMMABLE_LIGHT] = 'Dimmable Light';
lights[Constants.DEVICE_ID_HA_ON_OFF_LIGHT] = 'Ha On/Off Light Switch';
lights[Constants.DEVICE_ID_COLOR_DIMMABLE_LIGHT] = 'Dimmable Color Light';
lights[Constants.DEVICE_ID_EXTENDED_COLOR_LIGHT] = 'Extended Color Light';
lights[Constants.DEVICE_ID_COLOR_TEMPERATURE_LIGHT] = 'Color Temperature Light';

var switches = {};
switches[Constants.DEVICE_ID_ON_OFF_SWITCH] = 'Switch';
switches[Constants.DEVICE_ID_LEVEL_CONTROL_SWITCH] = 'Dimmer';
switches[Constants.DEVICE_ID_COLOR_DIMMER_SWITCH] = 'Dimmer';

var sensors = {};
sensors[Constants.DEVICE_TYPE_SENSOR] = 'Multi Sensor';
sensors[Constants.DEVICE_TYPE_CONTACT_SENSOR] = 'Contact Sensor';
sensors[Constants.DEVICE_TYPE_OCCUPANCY_SENSOR] = 'Occupancy Sensor';

var smartplugs = {};
smartplugs[Constants.DEVICE_TYPE_SMART_PLUG] = 'Smart Plug';

var nodestate = {};
nodestate[Constants.ND_JUST_JOINED] = 'Joining';
nodestate[Constants.ND_HAVE_ACTIVE] = 'Joining';
nodestate[Constants.ND_HAVE_EP_DESC] = 'Joining';
nodestate[Constants.ND_JOINED] = 'Joined';
nodestate[Constants.ND_UNRESPONSIVE] = 'Unresponsive';
nodestate[Constants.ND_LEAVE_SENT] = 'Leave Sent';
nodestate[Constants.ND_LEFT] = 'Left';
nodestate[Constants.ND_UNKNOWN] = 'Unknown';

var Store = Fluxxor.createStore({
  initialize: function() {
    this.devices = [];
    this.groups = [];
    this.deviceContact = {};
    this.deviceTemp = {};
    this.gatewayEui = '';
    this.serverLog = '';
    this.gatewayLog = '';
    this.testLog = '';
    this.tests = []; 
    this.rules = [];
    this.otafiles = {};
    this.ip = '';
    this.serversettings = '';
    this.gatewaysettings = '';
    this.heartbeat = '';
    this.testing = false;
    this.groupsnum = 0;
    this.buildinfo = '';

    /* Uncomment this line to add mock devices for UI validaiton */
    //this.testDevices();

    this.urlParameters = {};
    window.location.search
      .replace(/[?&]+([^=&]+)=([^&]*)/gi, (str,key,value) => {
        this.urlParameters[key] = value;
      }
    );

    this.bindActions(
      Constants.DEVICE_LIST_UPDATED, this.onDeviceListUpdated,
      Constants.RULES_LIST_UPDATED, this.onRulesListUpdated,
      Constants.DEVICE_JOINED, this.onDeviceJoined,
      Constants.DEVICE_LEFT, this.onDeviceLeft,
      Constants.DEVICE_UPDATE, this.onDeviceUpdate,
      Constants.SERVER_SETTINGS, this.onServerSettings,
      Constants.GATEWAY_SETTINGS, this.onGatewaySettings,
      Constants.OTA_AVAILABLE_FILES, this.otaFilesReceived,
      Constants.SERVER_LOG, this.loadServerLog,
      Constants.GATEWAY_LOG, this.loadGatewayLog,
      Constants.TRAFFIC_TEST_LOG, this.loadTrafficTestLog,
      Constants.TRAFFIC_TEST_RESULTS, this.onTrafficTestResults,
      Constants.HEARTBEAT, this.onHeartbeat,
      Constants.SERVER_LOG_STREAM, this.updateServerLogStream,
      Constants.GATEWAY_LOG_STREAM, this.updateGatewayLogStream
    );
  },

  getBuildInfo: function(callback) {
    if (this.buildinfo === '') {
      $.getJSON('/assets/version.json', function(data) {
        this.buildinfo = data;
        callback(this.buildinfo);
      }.bind(this));
    } else {
      callback(this.buildinfo);
    }
  },

  onDeviceListUpdated: function(messageParsed) {
    this.gatewayEui = messageParsed.gatewayEui;

    this.devices = _.map(messageParsed.devices, function(device) {
      device.gatewayEui = messageParsed.gatewayEui;

      if (!device.hasOwnProperty('otaUpdating')) {
        device.otaUpdating = false; 
      }

      if (!device.hasOwnProperty('otaTotalBytesSent')) {
        device.otaTotalBytesSent = 0; 
      }

      if (!device.hasOwnProperty('otaUpdatePercent')) {
        device.otaUpdatePercent = 0; 
      }

      if (!device.hasOwnProperty('otaTargetImageSizeKB')) {
        device.otaTargetImageSizeKB = 0; 
      }

      if (!device.hasOwnProperty('otaTargetFirmwareVersion')) {
        device.otaTargetFirmwareVersion = 0; 
      }

      return device;
    }.bind(this), this);

    if (this.urlParameters.hasOwnProperty('groups')) {
      this.groups = _.map(messageParsed.groups, function(group) {
        return group;
      }.bind(this), this);
    }

    var removedDisconnectedDevices = this.pruneRulesOfDisconnectedDevices(messageParsed.cloudRules);
    var formattedCloudRules = this.convertRulesFromIndex(removedDisconnectedDevices);
    this.cloudRules = formattedCloudRules; 

    this.devices = this.devices.concat(this.groups);
    this.emit('change');
  },

  onHeartbeat: function(info) {
    this.heartbeat = info;
    this.emit('change');
  },

  onServerSettings: function(messageParsed) {
    this.serversettings = messageParsed;
    this.ip = messageParsed.ip;
    this.emit('change');
  },

  onGatewaySettings: function(messageParsed) {
    this.gatewaysettings = messageParsed;
    this.emit('change');
  },

  getOTAList: function() {
    return this.otafiles;
  },

  otaFilesReceived: function(otafiles) {
    this.otafiles = otafiles;
    this.emit('change');
  },

  onRulesListUpdated: function(state) {
    var removedDisconnectedDevices = this.pruneRulesOfDisconnectedDevices(state.relays);
    var formattedRules = this.convertRulesFromIndex(removedDisconnectedDevices);
    this.rules = formattedRules;
    this.emit('change');
  },

  loadTrafficTestLog: function(log) {
    this.testLog = log; 
    this.emit('change');
  },

  loadServerLog: function(log) {
    this.serverLog = log; 
    this.emit('change');
  },

  loadGatewayLog: function(log) {
    this.gatewayLog = log;
    this.emit('change');
  },

  updateServerLogStream: function(line) {
    this.serverLog += line;
    this.emit('change');
  },

  updateGatewayLogStream: function(line) {
    this.gatewayLog += line;
    this.emit('change');
  },

  getLog: function() {
    return this.logText;
  },

  onDeviceUpdate: function(messageParsed) {
    this.devices = _.map(this.devices, function(deviceInList) {
      //If device is in list
      if ((deviceInList.deviceEndpoint.eui64 === messageParsed.deviceEndpoint.eui64) && 
         (deviceInList.deviceEndpoint.endpoint === messageParsed.deviceEndpoint.endpoint)) {
        deviceInList = messageParsed;
        return deviceInList; 
      } else {
        return deviceInList;
      }
    }, this);
    
    this.emit('change');
  },

  onTrafficTestResults: function(testresults) {
    // Add contact to node data
    this.tests.push(testresults);
    this.testing = false;
    this.emit('change');
  },

  onDeviceLeft: function(leftNode) {
    _.remove(this.devices, function(device) {
      return ((device.deviceEndpoint.eui64 === leftNode.deviceEndpoint.eui64) && 
              (device.deviceEndpoint.endpoint === leftNode.deviceEndpoint.endpoint))
    });

    this.emit('change');
  },

  onDeviceJoined: function(newNode) {
    _.remove(this.devices, function(device) {
      return ((device.deviceEndpoint.eui64 === newNode.deviceEndpoint.eui64) && 
              (device.deviceEndpoint.endpoint === newNode.deviceEndpoint.endpoint))
    });

    this.devices.push(newNode);
    this.emit('change');
  },

  getGW: function() {
    return this.gatewayEui;
  },

  removeAllGroups: function() {
    var items =  _.filter(this.getDevices(), function(group) {
      var deviceType = group.deviceType;
      return !(deviceType === 'group');
    });

    this.devices = items; 
  },

  getDevices: function() {
    return this.devices;
  },

  pruneRulesOfDisconnectedDevices: function(rulesupdate) {
    // Split into form [{"eui64":"000B57FFFE1938FD", "endpoint":1}, ...]
    var deviceEndpoints = _.pluck(this.devices, 'deviceEndpoint');
    // Split into form {<eui64>:{"eui64":"000B57FFFE1938FD", "endpoint":1}, 
    // <eui64>:{"eui64":"000B57FFFE1938FD", "endpoint":1}...}
    var devicesByEui = _.groupBy(deviceEndpoints, 'eui64');

    var filtered = _.filter(rulesupdate, function(rule) {
      return !((devicesByEui[rule.inDeviceEndpoint.eui64] === undefined) &&
          (devicesByEui[rule.outDeviceEndpoint.eui64] === undefined))
    });

    return filtered; 
  },

  getDeviceByEuiAndEndpoint: function(eui64, endpoint) {
    return _.find(this.devices, function(device) {
      return (device.deviceEndpoint.eui64 === eui64 && 
        device.deviceEndpoint.endpoint === endpoint)
    });
  }, 

  convertRulesFromIndex: function(rulesupdate) {
    // Split into form [{"eui64":"000B57FFFE1938FD", "endpoint":1}, ...]
    var deviceEndpoints = _.pluck(this.devices, 'deviceEndpoint');
    // Split into form {<eui64>:{"eui64":"000B57FFFE1938FD", "endpoint":1}, 
    // <eui64>:{"eui64":"000B57FFFE1938FD", "endpoint":1}...}
    var devicesByEui = _.groupBy(deviceEndpoints, 'eui64');

    return _.map(rulesupdate, (rule) => {
      if (devicesByEui[rule.inDeviceEndpoint.eui64] !== undefined &&
          devicesByEui[rule.outDeviceEndpoint.eui64] !== undefined) {

        var fromData = this.getDeviceByEuiAndEndpoint(rule.inDeviceEndpoint.eui64, 
                                                      rule.inDeviceEndpoint.endpoint)
        var toData = this.getDeviceByEuiAndEndpoint(rule.outDeviceEndpoint.eui64, 
                                                    rule.outDeviceEndpoint.endpoint)

        return {
          fromEui64: rule.inDeviceEndpoint.eui64,
          toEui64: rule.outDeviceEndpoint.eui64, 
          fromData: fromData,
          toData: toData
        };
      } else {
        return {
          fromEui64: null,
          toEui64: null, 
          fromData: null,
          toData: null
        };
      }
    });
  },
  
  /* Gets rules with additional data populated from device list */
  getRules: function() {
    return this.rules; 
  },

  getCloudRules: function() {
    return this.cloudRules; 
  },

  addRule: function(fromNode, toNode) {
    this.rules.push({fromEui64: fromNode.nodeEui, fromData: fromNode, toEui64: toNode.nodeEui, toData: toNode});
    this.emit('change');
  },

  clearRules: function() {
    this.rules = [];
    this.emit('change');
  },

  deleteRule: function(ruleToDelete) {
    this.rules.forEach((rule, key) => {
      if (rule.fromData.deviceEndpoint.eui64 === ruleToDelete.from.data.deviceEndpoint.eui64 && 
          rule.toData.deviceEndpoint.eui64 === ruleToDelete.to.data.deviceEndpoint.eui64) {
        this.rules.splice(key, 1)
      }
    });
    this.emit('change');
  },

  deleteCloudRule: function(ruleToDelete) {
    this.cloudRules.forEach((rule, key) => {
      if (rule.fromData.deviceEndpoint.eui64 === ruleToDelete.from.data.deviceEndpoint.eui64 && 
          rule.toData.deviceEndpoint.eui64 === ruleToDelete.to.data.deviceEndpoint.eui64) {
        this.cloudRules.splice(key, 1)
      }
    });
    this.emit('change');
  },

  getHumanReadableDevice: function(device) {
    var deviceType = parseInt(device.deviceType);
    var humanName;
    var image = null;
    if (switches[deviceType]) {
      image = 'assets/switch.png';
      humanName = switches[deviceType];
    } else if (lights[deviceType]) {
      image = 'assets/bulb.png';
      humanName = lights[deviceType];
    } else if (sensors[deviceType] && sensors[deviceType] !== 'Occupancy Sensor') {
      image = 'assets/contact.png';
      humanName = sensors[deviceType];
    } else if (sensors[deviceType] === 'Occupancy Sensor') {
      image = 'assets/occupancy.png';
      humanName = sensors[deviceType];
    } else if (smartplugs[deviceType]) {
      image = 'assets/outlet.png';
      humanName = smartplugs[deviceType];
    } else if (deviceType === 'group') {
      return {
        name: device.groupName,
        simplename: device.groupName,
        image: 'assets/3bulb.png',
        data: device
      };
    }

    return {
      name: humanName + ' - ' + device.nodeId + ' - (' + nodestate[device.deviceState] + ')',
      simplename: humanName + ' - ' + device.nodeId,
      image: image,
      data: device,
      ready: device.deviceState >= Constants.ND_JOINED
    };
  },

  getHumanReadableDevices: function(devices) {
    if (!devices) {
      devices = this.getDevices();
    }
    return _.map(devices, this.getHumanReadableDevice);
  },

  getHumanReadableLights: function(devices) {
    if (!devices) {
      devices = this.getLights();
    }
    return _.map(devices, this.getHumanReadableDevice);
  },

  getHumanReadableRules: function() {
    return _.map(this.getRules(), function(rule) {
      if (rule.toData && rule.fromData) {
        return {
          to: this.getHumanReadableDevice(rule.toData),
          from: this.getHumanReadableDevice(rule.fromData)
        };
      }
    }.bind(this));
  },

  getHumanReadableCloudRules: function() {
    return _.map(this.getCloudRules(), function(rule) {
      if (rule.toData && rule.fromData) {
        return {
          to: this.getHumanReadableDevice(rule.toData),
          from: this.getHumanReadableDevice(rule.fromData)
        };
      }
    }.bind(this));
  },

  isLight: function(device) {
    var deviceType = parseInt(device.deviceType);
    return lights[deviceType];
  },

  isGroup: function(device) {
    var deviceType = parseInt(device.deviceType);
    return (deviceType === 'group');
  },

  isContact: function(device) {
    var deviceType = parseInt(device.deviceType);
    return sensors[deviceType] === 'Contact Sensor';
  },

  isTemp: function(device) {
    var deviceType = parseInt(device.deviceType);
    return sensors[deviceType] === 'Multi Sensor';
  },

  isSmartPlug: function(device) {
    var deviceType = parseInt(device.deviceType);
    return smartplugs[deviceType];
  },

  isOccupancy: function(device) {
    var deviceType = parseInt(device.deviceType);
    return sensors[deviceType] === 'Occupancy Sensor';
  },

  getSwitches: function() {
    return _.filter(this.getDevices(), function(device) {
      var deviceType = parseInt(device.deviceType);
      return switches[deviceType] || sensors[deviceType];
    });
  },

  getLights: function() {
    return _.filter(this.getDevices(), function(device) {
      var deviceType = parseInt(device.deviceType);
      return lights[deviceType] || deviceType === 'group' || smartplugs[deviceType];
    });
  },

  testDevices: function() {
    this.onDeviceJoined({
      nodeEui: '0000000000001234',
      nodeId: 'D283',
      deviceTableIndex: 0,
      deviceState: 16,
      endpoints: [
        {endpointNumber: 1, deviceType: 258} 
      ]
    });

    this.onDeviceJoined({
      nodeEui: '0000000000001236',
      nodeId: 'D284',
      deviceTableIndex: 1,
      deviceState: 16,
      endpoints: [
        {endpointNumber: 1, deviceType: 261} 
      ]
    });

    this.onDeviceJoined({
      nodeEui: '0000000000001235',
      nodeId: 'D285',
      deviceTableIndex: 2,
      contactState: 1,
      tamperState: 1,
      deviceState: 16,
      temperatureValue: "75.33",
      endpoints: [
        {endpointNumber: 1, deviceType: 1026} 
      ]
    });

    this.onDeviceJoined({
      nodeEui: '0000000000001236',
      nodeId: 'D286',
      deviceTableIndex: 3,
      contactState: 0,
      tamperState: 0,
      deviceState: 16,
      endpoints: [
        {endpointNumber: 1, deviceType: 1026} 
      ]
    });

    this.onDeviceJoined({
      nodeEui: '0000000000001237',
      nodeId: 'D287',
      deviceTableIndex: 4,
      deviceState: 16,
      endpoints: [
        {endpointNumber: 1, deviceType: 1026} 
      ]
    });
  }
});

module.exports = Store;
