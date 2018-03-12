var Constants = require('../Constants');
var Fluxxor = require('fluxxor');
var CircularBuffer = require('circular-buffer');
var lights = require('./DeviceConstants').lights;
var switches = require('./DeviceConstants').switches;
var sensors = require('./DeviceConstants').sensors;
var smartplugs = require('./DeviceConstants').smartplugs;
var nodestate = require('./DeviceConstants').nodestate;
var nodeListBindableClusters = require('./DeviceConstants').nodeListBindableClusters;
var supportedBindingInCloudRules = require('./DeviceConstants').supportedBindingInCloudRules;

var Store = Fluxxor.createStore({
  initialize: function() {
    this.devices = [];
    this.groups = [];
    this.inputNodesList = [];
    this.outputNodesList = [];
    this.deviceContact = {};
    this.deviceTemp = {};
    this.gatewayEui = '';
    this.serverLog = '';
    this.gatewayLog = '';
    this.testLog = '';
    this.tests = [];
    this.rules = [];
    this.cloudRules = [];
    this.otafiles = [];
    this.ip = '';
    this.serversettings = '';
    this.gatewaysettings = '';
    this.heartbeat = '';
    this.groupsnum = 0;
    this.buildinfo = '';
    this.identifyModeEntry = {};
    this.installCodeFromServer = '';
    this.testing = false;
    this.networkSecurityLevel = 'Z3';
    this.addingDeviceProgress = 0;
    this.addingDevice = false;
    this.addingDeviceTimer = 0;
    this.addingDeviceTimerExpired = false;
    this.otaWaitingTimer = 0;
    this.isOtaInProgress = {
      status: false,
      policy: '',
      item: {}
    };
    this.cmdHistory = new CircularBuffer(Constants.COMMAND_HISTORY_LENGTH);

    /* Uncomment this line to add mock devices for UI validaiton */
    //this.testJoinColorControlLight();
    //this.testJoinDimmer();
    //this.testJoinOccupancy();

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
      Constants.OTA_EVENTS, this.onOtaEventUpdate,
      Constants.OTA_AVAILABLE_FILES, this.otaFilesReceived,
      Constants.SERVER_LOG, this.loadServerLog,
      Constants.GATEWAY_LOG, this.loadGatewayLog,
      Constants.TRAFFIC_TEST_LOG, this.loadTrafficTestLog,
      Constants.TRAFFIC_TEST_RESULTS, this.onTrafficTestResults,
      Constants.HEARTBEAT, this.onHeartbeat,
      Constants.NETWORK_SECURITY_LEVEL, this.onNetworkSecurityLevel,
      Constants.SERVER_LOG_STREAM, this.updateServerLogStream,
      Constants.GATEWAY_LOG_STREAM, this.updateGatewayLogStream,
      Constants.INSTALL_COLLECTION, this.updateInstallCodeFromServer
    );
  },

  onDeviceJoined: function(newNode) {
    _.remove(this.devices, function(device) {
      return ((device.deviceEndpoint.eui64 === newNode.deviceEndpoint.eui64) &&
              (device.deviceEndpoint.endpoint === newNode.deviceEndpoint.endpoint))
    });

    this.devices.push(newNode);
    this.removeNodeInfoInLists(newNode);
    this.pushNodeInfoToNodeLists(newNode);
    this.emit('change');
  },

  onDeviceListUpdated: function(messageParsed) {
    if (messageParsed.gatewayEui !== undefined) {
      this.gatewayEui = messageParsed.gatewayEui;
    }

    if (messageParsed.devices !== undefined) {
      this.devices = _.map(messageParsed.devices, function(device) {
        device.gatewayEui = this.gatewayEui;
        this.removeNodeInfoInLists(device);
        this.pushNodeInfoToNodeLists(device);

        if (this.isIdentifyServerClusterDetected(device)) {
          device.isIdentifyServerClusterDetected = true;
        } else {
          device.isIdentifyServerClusterDetected = false;
        }

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

      this.startUpNodeListsUpdate = false;
    }

    if (messageParsed.groups !== undefined &&
        messageParsed.groups.length > 0) {
      if (this.urlParameters.groups !== undefined &&
          this.urlParameters.hasOwnProperty('groups')) {
        this.groups = _.map(messageParsed.groups, function(group) {
          return group;
        }.bind(this), this);
      }
    }

    if (messageParsed.cloudRules !== undefined) {
      var removedDisconnectedDevices = this.pruneRulesOfDisconnectedDevices(messageParsed.cloudRules);
      var formattedCloudRules = this.convertRulesFromIndex(removedDisconnectedDevices);
      this.cloudRules = formattedCloudRules;
    }

    this.devices = this.devices.concat(this.groups);
    this.emit('change');
  },

  onDeviceUpdate: function(messageParsed) {
    this.devices = _.map(this.devices, function(deviceInList) {
      //If device is in list
      if ((deviceInList.deviceEndpoint.eui64 === messageParsed.deviceEndpoint.eui64) &&
         (deviceInList.deviceEndpoint.endpoint === messageParsed.deviceEndpoint.endpoint)) {
        messageParsed.isIdentifyServerClusterDetected = deviceInList.isIdentifyServerClusterDetected;
        deviceInList = messageParsed;
        return deviceInList;
      } else {
        return deviceInList;
      }
    }, this);

    this.emit('change');
  },

  onDeviceLeft: function(leftNodeEui) {
    _.remove(this.devices, function(device) {
      return (device.deviceEndpoint.eui64 === leftNodeEui)
    });
    this.removeNodeInfoInListsWithEuiOnly(leftNodeEui);
    this.emit('change');
  },

  onTrafficTestResults: function(testresults) {
    // Add contact to node data
    this.tests.push(testresults);
    this.testing = false;
    this.emit('change');
  },

  onRulesListUpdated: function(state) {
    var removedDisconnectedDevices = this.pruneRulesOfDisconnectedDevices(state.relays);
    var formattedRules = this.convertRulesFromIndex(removedDisconnectedDevices);
    this.rules = formattedRules;
    this.emit('change');
  },

  onHeartbeat: function(info) {
    this.heartbeat = info;
    this.emit('change');
  },

  onNetworkSecurityLevel: function(data) {
    this.networkSecurityLevel = data;
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

  onOtaEventUpdate: function(otaEvent) {
    if (otaEvent.messageType &&
       (otaEvent.messageType === 'otaFinished' ||
        otaEvent.messageType === 'otaFailed')) {
      this.resetOtaProgress();
    } else if (otaEvent.messageType &&
               otaEvent.messageType === 'otaBlockSent') {
      this.stopOtaWaitingCountdown();
    }
    this.emit('change');
  },

  removeNodeInfoInLists: function(node) {
    _.remove(this.inputNodesList, function(inputNode) {
      return ((inputNode.deviceEndpoint.eui64 === node.deviceEndpoint.eui64) &&
              (inputNode.deviceEndpoint.endpoint === node.deviceEndpoint.endpoint))
    });
    _.remove(this.outputNodesList, function(outputNode) {
      return ((outputNode.deviceEndpoint.eui64 === node.deviceEndpoint.eui64) &&
              (outputNode.deviceEndpoint.endpoint === node.deviceEndpoint.endpoint))
    });
  },

  removeNodeInfoInListsWithEuiOnly: function(eui64) {
    _.remove(this.inputNodesList, function(inputNode) {
      return (inputNode.deviceEndpoint.eui64 === eui64)
    });
    _.remove(this.outputNodesList, function(outputNode) {
      return (outputNode.deviceEndpoint.eui64 === eui64)
    });
  },

  pushNodeInfoToNodeLists: function(node) {
    // deviceEndpoint: {clusterInfo:[{clusterId:'0x0001',clusterType:'Out'},{...},...]}
    var clusterInfo = node.deviceEndpoint.clusterInfo;
    clusterInfo.forEach((clusterValue) => {
      if (nodeListBindableClusters[parseInt(clusterValue.clusterId)] !== undefined) {
        var nodeInfo = this.createNodeInfoTemplate(node);
        nodeInfo.deviceEndpoint.clusterId = clusterValue.clusterId;
        if (parseInt(clusterValue.clusterId) >= Constants.IN_OUT_DECISION_CLUSTER) {
          if (clusterValue.clusterType === "Out") {
            this.outputNodesList.push(nodeInfo);
          } else if (clusterValue.clusterType === "In") {
            this.inputNodesList.push(nodeInfo);
          }
        } else {
          if (clusterValue.clusterType == 'In') {
            this.outputNodesList.push(nodeInfo);
          } else if (clusterValue.clusterType == 'Out') {
            this.inputNodesList.push(nodeInfo);
          }
        }
      }
    });
  },

  createNodeInfoTemplate: function(node) {
    var nodeInfo = {};
    var deviceEndpoint = {};
    nodeInfo.nodeId = node.nodeId;
    nodeInfo.deviceType = node.deviceType;
    nodeInfo.supportsRelay = node.supportsRelay;
    deviceEndpoint.eui64 = node.deviceEndpoint.eui64;
    deviceEndpoint.endpoint = node.deviceEndpoint.endpoint;
    nodeInfo.deviceEndpoint = deviceEndpoint;
    return nodeInfo;
  },

  getOTAList: function() {
    return this.otafiles;
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

  startOtaWaitingCountdown: function() {
    if (this.otaWaitingTimer === 0) {
      this.otaWaitingTimer = setTimeout(() => {
        this.resetOtaProgress();
        this.otaWaitingTimer = 0;
        this.triggerDelayedRender();
      }, Constants.OTA_WAITING_TIMEOUT);
    }
  },

  stopOtaWaitingCountdown: function() {
    clearTimeout(this.otaWaitingTimer);
    this.otaWaitingTimer = 0;
  },

  setAddingDeviceStatus: function(addingDevice, addingDeviceProgress) {
    this.addingDevice = addingDevice;
    this.addingDeviceProgress = addingDeviceProgress;

    if (this.addingDeviceTimer === 0 &&
        addingDevice === true &&
        addingDeviceProgress > 0) {
      this.addingDeviceTimer = setInterval(this.addingDeviceTimerCountDown.bind(this),
                                           1000);
    }
  },

  loadAddingDeviceStatus: function() {
    var addingDeviceStatus = {};

    addingDeviceStatus['addingDevice'] = this.addingDevice;
    addingDeviceStatus['addingDeviceProgress'] = this.addingDeviceProgress;
    clearInterval(this.addingDeviceTimer);
    this.addingDeviceTimer = 0;
    return addingDeviceStatus;
  },

  addingDeviceTimerCountDown: function() {
    var timeLeft = this.addingDeviceProgress - 1;
    this.addingDeviceProgress = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(this.addingDeviceTimer);
      this.addingDeviceTimer = 0;
      this.addingDevice = false;
      this.addingDeviceTimerExpired = true;
    }
  },

  closeAddingDeviceIfExpired: function() {
    if (this.addingDeviceTimerExpired === true) {
      this.addingDeviceTimerExpired = false;
      return true;
    } else {
      return false;
    }
  },

  otaFilesReceived: function(otafiles) {
    this.otafiles = otafiles;
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

  updateInstallCodeFromServer: function(data) {
    this.installCodeFromServer = data.installCode;
    this.emit('change');
  },

  getLog: function() {
    return this.logText;
  },

  getGW: function() {
    return this.gatewayEui;
  },

  getNetworkSecurityLevel:function() {
    return this.networkSecurityLevel;
  },

  getOtaProgress: function() {
    return this.isOtaInProgress;
  },

  setOtaProgress: function(status, policy, item) {
    this.isOtaInProgress.status = status;
    this.isOtaInProgress.policy = policy;
    this.isOtaInProgress.item = item;
  },

  resetOtaProgress: function() {
    this.setOtaProgress(false, '', {});
  },

  setNetworkSecurityLevel:function(securityLevel) {
    this.networkSecurityLevel = securityLevel;
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
    // Split into form [{"eui64":"000B57FFFE1938FD", "endpoint":1, "clusterInfo":[]}, ...]
    var deviceEndpoints = _.pluck(this.devices, 'deviceEndpoint');
    // Split into form {"eui64":"000B57FFFE1938FD", "endpoint":1, "clusterInfo":[]},
    // <eui64>:{"eui64":"000B57FFFE1938FD", "endpoint":1}...}
    var devicesByEui = _.groupBy(deviceEndpoints, 'eui64');

    var filtered = _.filter(rulesupdate, function(rule) {
      return (devicesByEui[rule.inDeviceEndpoint.eui64] !== undefined) &&
              (devicesByEui[rule.outDeviceEndpoint.eui64] !== undefined)
    });

    return filtered;
  },

  getDeviceByEuiAndEndpoint: function(eui64, endpoint) {
    return _.find(this.devices, function(device) {
      return (device.deviceEndpoint.eui64 === eui64 &&
        device.deviceEndpoint.endpoint === endpoint)
    });
  },

  getInstallCodeFromServer: function() {
    return this.installCodeFromServer;
  },

  resetInstallCodeFromServer: function() {
    this.installCodeFromServer = '';
  },

  convertRulesFromIndex: function(rulesupdate) {
    // Split into form [{"eui64":"000B57FFFE1938FD", "endpoint":1,"clusterInfo":[]}, ...]
    var deviceEndpoints = _.pluck(this.devices, 'deviceEndpoint');
    // Split into form {<eui64>:{"eui64":"000B57FFFE1938FD", "endpoint":1},
    // <eui64>:{"eui64":"000B57FFFE1938FD", "endpoint":1}...}
    var devicesByEui = _.groupBy(deviceEndpoints, 'eui64');

    return _.map(rulesupdate, (rule) => {
      if (devicesByEui[rule.inDeviceEndpoint.eui64] !== undefined &&
          devicesByEui[rule.outDeviceEndpoint.eui64] !== undefined) {

        var fromDataDevice = this.getDeviceByEuiAndEndpoint(rule.inDeviceEndpoint.eui64,
                                                            rule.inDeviceEndpoint.endpoint)
        var toDataDevice = this.getDeviceByEuiAndEndpoint(rule.outDeviceEndpoint.eui64,
                                                          rule.outDeviceEndpoint.endpoint)
        var fromData = this.createNodeInfoTemplate(fromDataDevice);
        var toData = this.createNodeInfoTemplate(toDataDevice);
        // Append clusterId.
        fromData.deviceEndpoint.clusterId = rule.inDeviceEndpoint.clusterId;
        toData.deviceEndpoint.clusterId = rule.outDeviceEndpoint.clusterId;

        return {
          fromEui64: rule.inDeviceEndpoint.eui64,
          toEui64: rule.outDeviceEndpoint.eui64,
          fromData: fromData,
          toData: toData
        };
      }
    });
  },

  /* Get rules with additional data populated from device list */
  getRules: function() {
    return this.rules;
  },

  getCloudRules: function() {
    return this.cloudRules;
  },

  /* Update rules in Store */
  addRule: function(fromNode, toNode) {
    this.rules.push({fromEui64: fromNode.deviceEndpoint.eui64, fromData: fromNode,
                      toEui64: toNode.deviceEndpoint.eui64, toData: toNode});
    this.emit('change');
  },

  addCloudRule: function(fromNode, toNode) {
    this.cloudRules.push({fromEui64: fromNode.deviceEndpoint.eui64, fromData: fromNode,
                      toEui64: toNode.deviceEndpoint.eui64, toData: toNode});
    this.emit('change');
  },

  clearAllRules: function() {
    this.rules = [];
    this.cloudRules = [];
    this.emit('change');
  },

  deleteRule: function(ruleToDelete) {
    this.rules.forEach((rule, key) => {
      if (this.isDeviceEndpointIdentical(rule.fromData.deviceEndpoint,
                                          ruleToDelete.fromData.deviceEndpoint) &&
          this.isDeviceEndpointIdentical(rule.toData.deviceEndpoint,
                                          ruleToDelete.toData.deviceEndpoint)) {
        this.rules.splice(key, 1);
      }
    });
    this.emit('change');
  },

  deleteCloudRule: function(ruleToDelete) {
    this.cloudRules.forEach((rule, key) => {
      if (this.isDeviceEndpointIdentical(rule.fromData.deviceEndpoint,
                                          ruleToDelete.fromData.deviceEndpoint) &&
          this.isDeviceEndpointIdentical(rule.toData.deviceEndpoint,
                                          ruleToDelete.toData.deviceEndpoint)) {
        this.cloudRules.splice(key, 1);
      }
    });
    this.emit('change');
  },

  triggerDelayedRender(delayMs) {
    setTimeout(() => {
      this.emit('change');
    }, delayMs);
  },

  filterRulesListForDeletion: function(inputNode, outputNode) {
    var rules = this.rules;
    var cloudRules = this.cloudRules;

    var rulesList = rules.map(function(rule) {
      if (inputNode.deviceEndpoint.eui64 === rule.fromData.deviceEndpoint.eui64 &&
           inputNode.deviceEndpoint.endpoint === rule.fromData.deviceEndpoint.endpoint &&
           outputNode.deviceEndpoint.eui64 === rule.toData.deviceEndpoint.eui64 &&
           outputNode.deviceEndpoint.endpoint === rule.toData.deviceEndpoint.endpoint) {
        return rule;
      }
    }).filter(function(item) {
      return item !== undefined;
    });
    var cloudRulesList = cloudRules.map(function(rule) {
      if (inputNode.deviceEndpoint.eui64 === rule.fromData.deviceEndpoint.eui64 &&
           inputNode.deviceEndpoint.endpoint === rule.fromData.deviceEndpoint.endpoint &&
           outputNode.deviceEndpoint.eui64 === rule.toData.deviceEndpoint.eui64 &&
           outputNode.deviceEndpoint.endpoint === rule.toData.deviceEndpoint.endpoint) {
        return rule;
      }
    }).filter(function(item) {
      return item !== undefined;
    });
    return rulesList.concat(cloudRulesList);
  },

  filterRulesListForCreation: function(inputNode, outputNode) {
    var rulesList = [];
    var inputNodesList = this.inputNodesList;
    var outputNodesList = this.outputNodesList;

    var supportedInputNodeList = inputNodesList.map(function(inputNodeInfoInLocalList) {
      if (inputNodeInfoInLocalList.deviceEndpoint.eui64 === inputNode.deviceEndpoint.eui64 &&
          inputNodeInfoInLocalList.deviceEndpoint.endpoint === inputNode.deviceEndpoint.endpoint) {
        var tempNodeInfo = {};
        tempNodeInfo = inputNodeInfoInLocalList;
        return tempNodeInfo;
      }
    }).filter(function(item) {
      return item !== undefined;
    });

    supportedInputNodeList.forEach(function(supportedInputNodeInfo) {
      var supportedOutputNodeInfoForRelayRule = outputNodesList.find(function(outputNodeInfoInLocalList) {
        return outputNodeInfoInLocalList.deviceEndpoint.eui64 === outputNode.deviceEndpoint.eui64 &&
               outputNodeInfoInLocalList.deviceEndpoint.endpoint === outputNode.deviceEndpoint.endpoint &&
               outputNodeInfoInLocalList.deviceEndpoint.clusterId === supportedInputNodeInfo.deviceEndpoint.clusterId;
      });
      var supportedOutputNodeInfoForCloudRule = outputNodesList.find(function(outputNodeInfoInLocalList) {
        var isCloudRuleSupported = false;
        var filteredCloudRule = supportedBindingInCloudRules.find(function(item) {
          return item.inputCluster === parseInt(supportedInputNodeInfo.deviceEndpoint.clusterId);
        });
        if (filteredCloudRule !== undefined &&
            parseInt(outputNodeInfoInLocalList.deviceEndpoint.clusterId) === filteredCloudRule.outputCluster) {
          isCloudRuleSupported = true;
        }
        return outputNodeInfoInLocalList.deviceEndpoint.eui64 === outputNode.deviceEndpoint.eui64 &&
               outputNodeInfoInLocalList.deviceEndpoint.endpoint === outputNode.deviceEndpoint.endpoint &&
               isCloudRuleSupported;
      });
      if (supportedOutputNodeInfoForRelayRule !== undefined) {
        var rule = {};
        rule.inputNodeInfoInRule = supportedInputNodeInfo;
        rule.outputNodeInfoInRule = supportedOutputNodeInfoForRelayRule;
        rulesList.push(rule);
      }
      if (supportedOutputNodeInfoForCloudRule !== undefined) {
        var rule = {};
        rule.inputNodeInfoInRule = supportedInputNodeInfo;
        rule.outputNodeInfoInRule = supportedOutputNodeInfoForCloudRule;
        rulesList.push(rule);
      }
    });
    return rulesList;
  },

  setIdentifyModeStatus: function(status, node) {
    var hash = node.data.hash;

    this.identifyModeEntry[hash] = status;
  },

  getIdentifyModeStatus: function(node) {
    var hash = node.data.hash;
    var keyFound = _.findKey(this.identifyModeEntry, function(value, key) {
      return key.indexOf(hash) >= 0;
    });

    if (keyFound !== undefined) {
      return this.identifyModeEntry[hash];
    } else {
      return false;
    }
  },

  getHumanReadableDevice: function(device) {
    var humanFriendlyDisplay = this.getHumanNameAndImageForDevice(device);
    return {
      name: humanFriendlyDisplay.humanName + ' - ' + device.nodeId +
            ' - ' + device.deviceEndpoint.endpoint +
            ' - (' + nodestate[device.deviceState] + ')',
      simplename: humanFriendlyDisplay.humanName + ' - ' + device.nodeId +
            ' - ' + device.deviceEndpoint.endpoint,
      image: humanFriendlyDisplay.image,
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

  getSupportedClutersInfo: function(device) {
    return device.supportedCluster;
  },

  getHumanReadableNodeForRulesList: function(node) {
    var humanFriendlyDisplay = this.getHumanNameAndImageForDevice(node);
    return {
      name: node.nodeId + ' - ' +
        node.deviceEndpoint.clusterId + ' - ' +
        node.deviceEndpoint.endpoint,
      simplename: humanFriendlyDisplay.humanName + ' - ' +
        node.nodeId + ' - ' +
        node.deviceEndpoint.endpoint,
      image: humanFriendlyDisplay.image,
      data: node,
      ready: node.deviceState >= Constants.ND_JOINED
    };
  },

  getHumanNameAndImageForDevice: function(device) {
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
    } else {
      image = 'assets/silicon-labs-logo.png';
      humanName = 'Unknown Type Device';
    }

    return {
      humanName,
      image
    };
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
          to: this.getHumanReadableNodeForRulesList(rule.toData),
          from: this.getHumanReadableNodeForRulesList(rule.fromData)
        };
      }
    }.bind(this));
  },

  getHumanReadableCloudRules: function() {
    return _.map(this.getCloudRules(), function(rule) {
      if (rule.toData && rule.fromData) {
        return {
          to: this.getHumanReadableNodeForRulesList(rule.toData),
          from: this.getHumanReadableNodeForRulesList(rule.fromData)
        };
      }
    }.bind(this));
  },

  getCmdHistory: function() {
    return this.cmdHistory;
  },

  insertCmdHistory: function(command) {
    this.cmdHistory.enq(command);
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

  isMultiSensor: function(device) {
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

  isIdentifyServerClusterDetected: function(device) {
    var clusterDetected = false;
    var clusterInfo = device.deviceEndpoint.clusterInfo;

    clusterInfo.forEach((clusterValue) => {
      if (parseInt(clusterValue.clusterId) === Constants.IDNETIFY_CLUSTER &&
          clusterValue.clusterType === "In") {
        clusterDetected = true;
      }
    });
    return clusterDetected;
  },

  isDeviceEndpointIdentical: function(deviceEndpoint0, deviceEndpoint1) {
    return (deviceEndpoint0.eui64 === deviceEndpoint1.eui64 &&
            deviceEndpoint0.endpoint === deviceEndpoint1.endpoint) ? true : false;
  },

  isExistingRuleDetected: function(inputNode, outputNode, rulesList) {
    var ruleDetected = false;
    rulesList.forEach((rule) => {
      if (this.isDeviceEndpointIdentical(rule.fromData.deviceEndpoint, inputNode.deviceEndpoint) &&
          this.isDeviceEndpointIdentical(rule.toData.deviceEndpoint, outputNode.deviceEndpoint)) {
        ruleDetected = true;
      }
    });
    return ruleDetected;
  },

  getInputNodes: function() {
    return this.inputNodesList;
  },

  getOutputNodes: function() {
    return this.outputNodesList;
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

  /* ReactUI validation tests. */
  testJoinDimmer: function() {
    this.onDeviceJoined(
      {
        nodeId: '0x105',
        deviceState: 16,
        deviceType: 261,
        supportsRelay: true,
        deviceEndpoint: {
          eui64: '000000000000D105',
          endpoint: 1,
          clusterInfo: [
            {clusterId: '0x0006', clusterType: 'Out'},
            {clusterId: '0x0008', clusterType: 'Out'},
            {clusterId: '0x0300', clusterType: 'Out'},
            {clusterId: '0x0001', clusterType: 'In'},
            {clusterId: '0x0003', clusterType: 'In'}
          ]
        },
        supportedCluster: [
        ]
      }
    );
  },

  testJoinColorControlLight: function() {
    this.onDeviceJoined(
      {
        nodeId: '0x0102',
        deviceState: 16,
        deviceType: 258,
        supportsRelay: true,
        deviceEndpoint: {
          eui64: '000000000000D258',
          endpoint: 1,
          clusterInfo: [
            {clusterId: '0x0006', clusterType: 'In'},
            {clusterId: '0x0008', clusterType: 'In'},
            {clusterId: '0x0300', clusterType: 'In'},
            {clusterId: '0x0000', clusterType: 'In'},
            {clusterId: '0x0003', clusterType: 'In'}
          ]
        },
        supportedCluster: [
        ]
      }
    );
  },

  testJoinOccupancy: function() {
    this.onDeviceJoined(
      {
        nodeId: '0x0107',
        deviceState: 16,
        deviceType: 263,
        supportsRelay: false,
        deviceEndpoint: {
          eui64: '000000000000D107',
          endpoint: 1,
          clusterInfo: [
            {clusterId: '0x0001', clusterType: 'In'},
            {clusterId: '0x0003', clusterType: 'In'},
            {clusterId: '0x0406', clusterType: 'In'}
          ]
        },
        supportedCluster: [
        ]
      }
    );
  },

  testNodeJoinMixTypes: function() {
    this.onDeviceJoined({
      nodeId: '0xD234',
      deviceState: 16,
      deviceType: 200,
      supportsRelay: false,
      deviceEndpoint: {
        eui64: '000000000000D234',
        endpoint: 1,
        clusterInfo: [
          {clusterId: '0x1234', clusterType: 'In'},
          {clusterId: '0x1235', clusterType: 'In'}
        ]
      },
      supportedCluster: [
        {clusterId: '0x1234', clusterType: 'In'},
        {clusterId: '0x1235', clusterType: 'In'}
      ]
    });

    this.onDeviceJoined({
      nodeId: '0xD235',
      deviceState: 16,
      deviceType: 258,
      supportsRelay: true,
      deviceEndpoint: {
        eui64: '000000000000D235',
        endpoint: 1,
        clusterInfo: [
          {clusterId: '0x1236', clusterType: 'Out'},
          {clusterId: '0x1237', clusterType: 'Out'}
        ]
      },
      supportedCluster: [
        {clusterId: '0x1236', clusterType: 'Out'},
        {clusterId: '0x1237', clusterType: 'Out'}
      ]
    });
  },

  testDeviceListUpdateVoid: function() {
    this.onDeviceListUpdated({
      devices: [],
      cloudRules: [],
      groups: [],
      gatewayEui: '000D100010001000'
    });
  },

  testDeviceListUpdateNoCloudRelay: function() {
    this.onDeviceListUpdated({
      devices: [
        // Dimmable Color Light 1.
        {
          nodeId: '0xD234',
          deviceState: 16,
          deviceType: 258,
          supportsRelay: false,
          deviceEndpoint: {
            eui64: '000000000000D234',
            endpoint: 1,
            clusterInfo: [
              {clusterId: '0x1234', clusterType: 'In'},
              {clusterId: '0x1235', clusterType: 'In'}
            ]
          },
          supportedCluster: [
            {clusterId: '0x1234', clusterType: 'In'},
            {clusterId: '0x1235', clusterType: 'In'}
          ]
        },
        // Dimmable Color Light 2.
        {
          nodeId: '0xD234',
          deviceState: 16,
          deviceType: 258,
          supportsRelay: false,
          deviceEndpoint: {
            eui64: '000000000000D234',
            endpoint: 2,
            clusterInfo: [
              {clusterId: '0x1234', clusterType: 'In'},
              {clusterId: '0x1235', clusterType: 'In'}
            ]
          },
          supportedCluster: [
            {clusterId: '0x1234', clusterType: 'In'},
            {clusterId: '0x1235', clusterType: 'In'}
          ]
        },
        // Contact sensor.
        {
          nodeId: '0xD230',
          deviceState: 16,
          deviceType: 1026,
          supportsRelay: false,
          deviceEndpoint: {
            eui64: '000000000000D230',
            endpoint: 1,
            clusterInfo: [
              {clusterId: '0x1236', clusterType: 'Out'},
              {clusterId: '0x1237', clusterType: 'Out'}
            ]
          },
          supportedCluster: [
            {clusterId: '0x1236', clusterType: 'Out'},
            {clusterId: '0x1237', clusterType: 'Out'}
          ]
        },
        // Occupancy sensor.
        {
          nodeId: '0xD235',
          deviceState: 16,
          deviceType: 263,
          supportsRelay: false,
          deviceEndpoint: {
            eui64: '000000000000D235',
            endpoint: 1,
            clusterInfo: [
              {clusterId: '0x1236', clusterType: 'Out'},
              {clusterId: '0x1237', clusterType: 'Out'}
            ]
          },
          supportedCluster: [
            {clusterId: '0x1236', clusterType: 'Out'},
            {clusterId: '0x1237', clusterType: 'Out'}
          ]
        },
        // Unknown type.
        {
          nodeId: '0xD237',
          deviceState: 16,
          deviceType: 200,
          supportsRelay: true,
          deviceEndpoint: {
            eui64: '000000000000D237',
            endpoint: 1,
            clusterInfo: [
              {clusterId: '0x1234', clusterType: 'Out'},
              {clusterId: '0x1235', clusterType: 'Out'}
            ]
          },
          supportedCluster: [
            {clusterId: '0x1234', clusterType: 'Out'},
            {clusterId: '0x1235', clusterType: 'Out'}
          ]
        }
      ],
      cloudRules: [
        {
          inDeviceEndpoint: {
            eui64: '000000000000D235',
            endpoint: 1,
            clusterId: '0x1236'
          },
          outDeviceEndpoint: {
            eui64: '000000000000D234',
            endpoint: 2,
            clusterId: '0x1235'
          }
        },
        {
          inDeviceEndpoint: {
            eui64: '000000000000D235',
            endpoint: 1,
            clusterId: '0x1237'
          },
          outDeviceEndpoint: {
            eui64: '000000000000D234',
            endpoint: 2,
            clusterId: '0x1234'
          }
        }
      ],
      groups: [],
      gatewayEui: '000D100010001000'
    });

    this.onRulesListUpdated({
      relays:[
        {
          inDeviceEndpoint: {
            eui64: '000000000000D237',
            endpoint: 1,
            clusterId: '0x1234'
          },
          outDeviceEndpoint: {
            eui64: '000000000000D234',
            endpoint: 2,
            clusterId: '0x1235'
          }
        },
        {
          inDeviceEndpoint: {
            eui64: '000000000000D237',
            endpoint: 1,
            clusterId: '0x1235'
          },
          outDeviceEndpoint: {
            eui64: '000000000000D234',
            endpoint: 2,
            clusterId: '0x1234'
          }
        }
      ]
    });
  }
});

module.exports = Store;
