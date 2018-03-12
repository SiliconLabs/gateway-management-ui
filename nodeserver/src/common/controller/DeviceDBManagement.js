// Copyright 2017 Silicon Laboratories, Inc.

var ip               = require('ip'),
  path               = require('path'),
  _                  = require('underscore'),
  fs                 = require('fs-extra'),
  ServerActions      = require('../actions/ServerActions.js'),
  ota                = require('./sub-modules/OverTheAirUpdate.js'),
  Logger             = require('../Logger.js'),
  CustomerTest       = require('../CustomerTest.js'),
  Constants          = require('../Constants.js'),
  Config             = require('../Config.js'),
  Utilities          = require('../Utilities.js'),
  ZCLDataTypes       = require('../zcl-definitions/ZCLDataTypes.js'),
  ZCLResponseActions = require('./ZCLResponseActions.js'),
  ZB3KeyManagement   = require('./sub-modules/ZB3KeyManagement.js'),
  ZCLAttributeNames  = require('../zcl-definitions/ZCLAttributeNames.js').ZCLAttributeNames;
  ReportableZCLAttributeNames = require('../zcl-definitions/ZCLAttributeNames.js').ReportableZCLAttributeNames;

var DeviceDBManagement = {
  // Cloud device list
  devices: {},
  // Instantiate ZB3KeyManagement
  zb3KeyManagement: new ZB3KeyManagement(),

  onNodeJoin: function(joiningDevice, gatewayEui) {
    if (this.isEndpointSupported(joiningDevice) &&
        this.isDeviceDisplayable(joiningDevice)) {
      this.createDeviceTemplate(joiningDevice, gatewayEui, true);
      this.requestNodeDefaultAttributes(joiningDevice);
      this.bindAndSetNodeReportableAttributes(joiningDevice, gatewayEui);
      // Preserve the new nodeId in case duplication.
      var newNodeId = joiningDevice.nodeId;
      // Copy data from existing device (if it exists)
      _.extend(joiningDevice, this.devices[joiningDevice.hash]);
      // Assign new nodeId back.
      joiningDevice.nodeId = newNodeId;
      // Add to cloud state
      this.devices[joiningDevice.hash] = joiningDevice;
      // Update tables in ZCLResponseActions
      ZCLResponseActions.insertDeviceTable(joiningDevice.hash, joiningDevice);

      ServerActions.SocketInterface.publishDeviceJoinedToClients(joiningDevice);
      ServerActions.GatewayInterface.requestState();
      // Try to reopen the network with key to improve multiple node joining
      this.zb3KeyManagement.tryReopenNetworkWithLinkKey();
    }
  },

  onDeviceListReceived: function(messageParsed, gatewayEui) {
    var devices = {};

    _.each(messageParsed.devices, function(joiningDevice) {
      if (this.isEndpointSupported(joiningDevice) &&
          this.isDeviceDisplayable(joiningDevice)) {
        this.createDeviceTemplate(joiningDevice, gatewayEui, false);
        // Preserve the new nodeId in case duplication
        var newNodeId = joiningDevice.nodeId;
        // Copy data from existing device (if it exists)
        _.extend(joiningDevice, this.devices[joiningDevice.hash]);
        // Assign new nodeId back.
        joiningDevice.nodeId = newNodeId;
        // Add to cloud state
        devices[joiningDevice.hash] = joiningDevice;
      }
    }.bind(this));

    // Delete old devices
    this.devices = {};
    // Set to joined devices
    this.devices = devices;

    // Check if need to request attributes
    _.each(this.devices, function(device) {
      if(device.zclRequested === undefined
          || !device.zclRequested) {
        this.requestNodeDefaultAttributes(joiningDevice);
        device.zclRequested = true;
      }
    }.bind(this));

    this.sendCloudStateToClients();
  },

  onNodeLeft: function(leavingDeviceEui) {
    // Add to cloud state
    _.each(this.devices, function(value, key) {
      if (key.split('-')[0] == leavingDeviceEui) {
        delete this.devices[key];
      }
    }.bind(this));
    // Update tables in ZCLResponseActions
    ZCLResponseActions.deleteDeviceFromTable(leavingDeviceEui);
    ServerActions.SocketInterface.publishDeviceLeftToClients(leavingDeviceEui);
    this.sendCloudStateToClients();
  },

  onNodeStateChange: function(messageParsed) {
    // Add to cloud state
    _.each(this.devices, function(value, key, list) {
      if (key.split('-')[0] == messageParsed.eui64) {
        _.extend(value, {deviceState: messageParsed.deviceState});
        ServerActions.SocketInterface.publishDeviceUpdateToClients(value);
      }
    }.bind(this));
  },

  clearDevicesList: function() {
    this.devices = {};
  },

  getEuiByNodeId: function(nodeId) {
    var deviceEui = '';
    _.each(this.devices, function(device, key, list) {
      if(device.nodeId == nodeId) {
        deviceEui = key.split('-')[0].split('x')[1];
        return deviceEui;
      }
    }.bind(this));
    return deviceEui;
  },

  createDeviceTemplate: function(joiningDevice, gatewayEui, isOnNodeJoin) {
    var deviceType = joiningDevice.deviceType;

    joiningDevice.hash = this.getHash(joiningDevice.deviceEndpoint);
    joiningDevice.gatewayEui = gatewayEui;
    if (isOnNodeJoin) {
      joiningDevice.zclRequested = true;
    }
    if (this.isSleepyDevice(joiningDevice)) {
      joiningDevice.sleepyDevice = true;
    } else {
      joiningDevice.sleepyDevice = false;
    }
    joiningDevice.otaUpdating = false;
    joiningDevice.otaTotalBytesSent = 0;
    joiningDevice.otaUpdatePercent = 0;
    joiningDevice.otaTargetImageSizeKB = 0;
    joiningDevice.otaTargetFirmwareVersion = 0;
    joiningDevice.supportsRelay = this.isRelaySupported(deviceType);

    // Create supportedCluster array.
    if (joiningDevice.deviceEndpoint.clusterInfo) {
        joiningDevice.supportedCluster = [];
        _.each(joiningDevice.deviceEndpoint.clusterInfo, function(clusterInfoElement) {
          if (parseInt(clusterInfoElement.clusterId) in ZCLAttributeNames) {
            newElement = this.allocateClusterType(clusterInfoElement);
            joiningDevice.supportedCluster.push(newElement);
          }
        }.bind(this));
    }
  },

  isSleepyDevice: function(device) {
    var deviceType = device.deviceType;

    if (parseInt(deviceType) in Constants.NON_SLEEPY_DEVICE_TYPE_TABLE){
      return false;
    }
    return true;
  },

  allocateClusterType: function(clusterInfoElement) {
    var element = {};
    element.clusterId = clusterInfoElement.clusterId;
    if (parseInt(clusterInfoElement.clusterId) >= Constants.IN_OUT_DECISION_CLUSTER) {
      element.clusterType = clusterInfoElement.clusterType;
    } else {
      if (clusterInfoElement.clusterType == 'In') {
        element.clusterType = 'Out';
      } else if (clusterInfoElement.clusterType == 'Out') {
        element.clusterType = 'In';
      }
    }
    return element;
  },

  // Check if ZB3 Gw supports relay by default.
  // If not, cloud rules will support.
  isRelaySupported: function(deviceType) {
    supportsRelay = true;
    if (deviceType == Constants.DEVICE_TYPE_OCCUPANCY_SENSOR ||
        deviceType == Constants.DEVICE_TYPE_CONTACT_SENSOR) {
      supportsRelay = false;
    }
    return supportsRelay;
  },

  requestNodeDefaultAttributes: function(joiningDevice) {
    if (Config.CLOUD_ENABLED) return;

    for (var i = 0; i < joiningDevice.supportedCluster.length; i++) {
      var clusterId = parseInt(joiningDevice.supportedCluster[i].clusterId);

      for (var property in ZCLAttributeNames[clusterId]) {
        if (ZCLAttributeNames[clusterId].hasOwnProperty(property)) {
          ServerActions.GatewayInterface.zigbeeRequestAttribute(joiningDevice.deviceEndpoint,
                                                                ZCLAttributeNames[clusterId][property]);
        }
      }
    }
  },

  bindAndSetNodeReportableAttributes: function(joiningDevice, gatewayEui) {
    if (Config.CLOUD_ENABLED) return;

    for (var i = 0; i < joiningDevice.supportedCluster.length; i++) {
      var clusterId = parseInt(joiningDevice.supportedCluster[i].clusterId);

      if (joiningDevice.supportedCluster[i].clusterType === 'In'
          && clusterId !== Constants.BOOTLOADER_CLUSTER) {
        for (var property in ReportableZCLAttributeNames[clusterId]) {
          if (ReportableZCLAttributeNames[clusterId].hasOwnProperty(property)) {
            ServerActions.GatewayInterface.genericConfigureBind(joiningDevice.deviceEndpoint,
                                                                gatewayEui,
                                                                joiningDevice.nodeId,
                                                                clusterId);
            ServerActions.GatewayInterface.genericConfigureReporting(joiningDevice.deviceEndpoint,
                                                                     ReportableZCLAttributeNames[clusterId][property]);
          }
        }
      }
    }
  },

  sendCloudStateToClients: function() {
    // Cloud device state
    var cloudState = {
      devices: {},
    };

    // Refresh Cloud State
    cloudState.devices = _.values(this.devices);
    ServerActions.SocketInterface.publishDeviceStateToClients(cloudState);
  },

  getHash: function(joinedDevice) {
    return joinedDevice.eui64 + '-' + joinedDevice.endpoint
  },

  isDeviceDisplayable: function(joiningDevice) {
    return (joiningDevice.deviceState == Constants.ND_UNRESPONSIVE ||
            joiningDevice.deviceState == Constants.ND_JOINED ||
            joiningDevice.deviceState == Constants.ND_LEAVE_SENT ||
            joiningDevice.deviceState == Constants.ND_LEFT) ? true : false;
  },

  isEndpointSupported: function(joiningDevice) {
    var endpoint = joiningDevice.deviceEndpoint.endpoint;
    return (endpoint == Constants.SELF_ENDPOINT ||
            endpoint == Constants.SMART_ENERGY_ENDPOINT ||
            endpoint == Constants.GREEN_POWER_ENDPOINT) ? false : true;
  },

  checkMatchingDevice: function(joinedDevice, cloudDevice) {
    return this.getHash(joinedDevice) === this.getHash(cloudDevice);
  },

  checkIfDeviceIsInCloud: function(joinedDevice) {
    return !(this.devices[this.getHash(joinedDevice.deviceEndpoint)] === undefined);
  },

  removeDeviceFromCloud: function(leavingDevice) {
    delete this.devices[this.getHash(leavingDevice.deviceEndpoint)]
  }
};

module.exports = DeviceDBManagement;
