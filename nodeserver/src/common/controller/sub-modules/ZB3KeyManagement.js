'use strict';
// Copyright 2015 Silicon Laboratories, Inc.
var ServerActions   = require('../../actions/ServerActions.js'),
    Constants       = require('../../Constants.js'),
    Logger          = require('../../Logger.js'),
    fs              = require('fs-extra'),
    path            = require('path'),
    child_process   = require('child_process'),
    _               = require('underscore');

var keyDerivationPath = path.join(__dirname, Constants.keyDerivationPath);
var ZB3KeysStorePath = path.join(__dirname, Constants.zb3KeysStore);

class ZB3KeyManagement {
  constructor() {
    this.ZB3KeysList = {};
    // The following variables are to improve multiple node joining
    this.reopenNetworkWithLinkKey = false;
    this.reopenNetworkType = '';
    this.latestLinkKey = '';

    /* Load from filesystem gateway file to get gateway history. */
    if (fs.existsSync(ZB3KeysStorePath)) {
      var load = fs.readFileSync(ZB3KeysStorePath);
      if (load) {
        try {
          this.ZB3KeysList = JSON.parse(load);
        } catch (e) {
          Logger.server.log('info', 'Error reading ZB3Keys Store file');
        }
        Logger.server.log('info', 'ZB3Keys Store File Read: ' + load);
      } else {
        Logger.server.log('info', 'ZB3Keys Store Empty');
      }
    }
  }

  startZB3Join(deviceEui, installCode, delayMs, installCodeOnly) {
    var linkKey = this.getLinkKey(deviceEui, installCode);
    if (linkKey) {
      Logger.server.log('info', 'Link key: ' + linkKey);
      var formattedDeviceEui = this.formatCliByteString(deviceEui);
      var formattedLinkKey = this.formatCliByteString(linkKey);
      if (!installCodeOnly) {
        ServerActions.GatewayInterface.zigbee3PermitJoinMs(formattedDeviceEui,
                                                           formattedLinkKey,
                                                           false);
      } else {
        ServerActions.GatewayInterface.zigbee3PermitJoinMsInstallCode(formattedDeviceEui,
                                                                      formattedLinkKey,
                                                                      false);
      }
      this.addKey(deviceEui, installCode, linkKey);
      this.latestLinkKey = linkKey;
    }
  }

  tryReopenNetworkWithLinkKey() {
    if (this.reopenNetworkWithLinkKey) {
      var formattedDeviceEui = this.formatCliByteString(Constants.WILDCARD_DEVICE_EUI);
      var formattedLinkKey = this.formatCliByteString(this.latestLinkKey);
      switch(this.reopenNetworkType) {
        case 'installCodeOnly':
          if (this.latestLinkKey){
            ServerActions.GatewayInterface.zigbee3PermitJoinMsInstallCode(formattedDeviceEui,
                                                                          formattedLinkKey,
                                                                          true);
          }
          break;
        case 'centralized':
          ServerActions.GatewayInterface.zigbee3PermitJoinMsOpenNetworkOnly();
          break;
        case 'mixed':
          if (this.latestLinkKey){
            ServerActions.GatewayInterface.zigbee3PermitJoinMs(formattedDeviceEui,
                                                               formattedLinkKey,
                                                               true);
          }
          break;
        default:
          break;
      }
    }
  }

  getLinkKey(deviceEui, installCode) {
    var linkKey = '';
    var keyDerivationProcess = child_process.execFileSync(keyDerivationPath + Constants.keyDerivationExec, ['-i', installCode], {
      cwd: keyDerivationPath
    });
    var results = keyDerivationProcess.toString().trim();
    linkKey = results.substring(Constants.LINKKEY_START_INDEX, results.length).trim();

    return linkKey;
  }

  findInstallCodeFromLocalStorage(deviceEui) {
    var installCode = '';
    if (this.ZB3KeysList[deviceEui]) {
      installCode = this.ZB3KeysList[deviceEui][0];
    }
    return installCode;
  }

  uploadMatchedInstallCode(deviceEui) {
    var installCode = this.findInstallCodeFromLocalStorage(deviceEui);
    if (installCode) {
      var uploadObj = {};
      uploadObj['eui64'] = deviceEui;
      uploadObj['installCode'] = installCode;
      ServerActions.SocketInterface.publishMatchedInstallCode(uploadObj);
    }
  }

  formatCliByteString(originalString) {
    var CliByteString = '';
    for (var i = 0; i < (originalString.length - 1); i += 2) {
      CliByteString += originalString[i];
      CliByteString += originalString[i+1];
      CliByteString += ' ';
    }
    return CliByteString.trim();
  }

  addKey(deviceEui, installCode, linkKey) {
    var keysArray = [];
    keysArray.push(installCode);
    keysArray.push(linkKey);

    if (this.ZB3KeysList[deviceEui]) {
      this.ZB3KeysList[deviceEui] = [];
    }
    this.ZB3KeysList[deviceEui] = keysArray;
    fs.writeFileSync(ZB3KeysStorePath, JSON.stringify(this.ZB3KeysList));
  }

  deleteKey(deviceEui) {
    if (this.ZB3KeysList[deviceEui]) {
      delete this.ZB3KeysList[deviceEui];
      fs.writeFileSync(ZB3KeysStorePath, JSON.stringify(this.ZB3KeysList));
    }
  }

  clearKeys(){
    this.ZB3KeysList = {};
    fs.writeFileSync(ZB3KeysStorePath, JSON.stringify(this.ZB3KeysList));
  }

  updateReopenNetworkFlag(actionType, deviceEui) {
    switch(actionType) {
      case 'installCodeOnly':
        if (deviceEui.toUpperCase() === Constants.WILDCARD_DEVICE_EUI){
          this.reopenNetworkWithLinkKey = true;
          this.reopenNetworkType = 'installCodeOnly';
        }
        break;
      case 'centralized':
        this.reopenNetworkWithLinkKey = true;
        this.reopenNetworkType = 'centralized';
        break;
      case 'mixed':
        if (deviceEui.toUpperCase() === Constants.WILDCARD_DEVICE_EUI){
          this.reopenNetworkWithLinkKey = true;
          this.reopenNetworkType = 'mixed';
        }
        break;
      case 'close':
        this.reopenNetworkWithLinkKey = false;
        this.latestLinkKey = '';
        this.reopenNetworkType = '';
        break;
      default:
        Logger.server.log('info', 'openNetworkType not recognized.');
        break;
    }
  }
}

module.exports = ZB3KeyManagement;
