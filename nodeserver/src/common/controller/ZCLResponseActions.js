// Copyright 2017 Silicon Laboratories, Inc.

var Constants          = require('../Constants.js'),
  ServerActions      = require('../actions/ServerActions.js'),
  Utilities          = require('../Utilities.js'),
  Logger             = require('../Logger.js'),
  _                  = require('underscore');

var ZCLResponseActions = {
  sleepyDeviceTable: {},
  nonSleepyDeviceTable: {},

  insertDeviceTable: function(key, device) {
    if(device.sleepyDevice !== undefined &&
       device.sleepyDevice) {
      this.sleepyDeviceTable[key] = device;
    } else if (device.sleepyDevice !== undefined &&
               !device.sleepyDevice) {
      this.nonSleepyDeviceTable[key] = device;
    }
  },

  deleteDeviceFromTable: function(deviceEui) {
    var deviceRemoved = false;

    _.each(this.nonSleepyDeviceTable, function(device, key) {
      if (key.split('-')[0] == deviceEui) {
        delete this.nonSleepyDeviceTable[key];
        deviceRemoved = true;
      }
    }.bind(this));

    if (!deviceRemoved) {
      _.each(this.sleepyDeviceTable, function(device, key) {
        if (key.split('-')[0] == deviceEui) {
          delete this.sleepyDeviceTable[key];
        }
      }.bind(this));
    }
  },

  triggerRssiLqiRequest: function(zclResponseMessage) {
    if (!this.isSpecificClusterMsgDetected(zclResponseMessage, Constants.DIAGNOSTICS_CLUSTER) &&
        this.isDeviceInSpecificTable(this.nonSleepyDeviceTable, zclResponseMessage.deviceEndpoint) &&
        this.deviceCountInSpecificTable(this.nonSleepyDeviceTable) <= Constants.RSSI_LQI_REQ_DEVICE_LIMIT) {
      ServerActions.GatewayInterface.zigbeeRequestAttribute(zclResponseMessage.deviceEndpoint, 'rssiValue');
      ServerActions.GatewayInterface.zigbeeRequestAttribute(zclResponseMessage.deviceEndpoint, 'lqiValue');
    }
  },

  isSpecificClusterMsgDetected: function(zclResponseMessage, clusterId) {
    return (parseInt(zclResponseMessage.clusterId) === clusterId) ? true : false;
  },

  isDeviceInSpecificTable: function(deviceTable, deviceEndpoint) {
    var deviceInTable = false;

    _.each(deviceTable, function(device, key) {
      if ((deviceEndpoint.eui64 + '-' + deviceEndpoint.endpoint) === key) {
        deviceInTable = true;
      }
    }.bind(this));
    return deviceInTable;
  },

  deviceCountInSpecificTable: function(deviceTable) {
    return _.size(deviceTable);
  }
};

module.exports = ZCLResponseActions;
