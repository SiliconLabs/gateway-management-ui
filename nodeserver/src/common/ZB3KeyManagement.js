'use strict';
// Copyright 2015 Silicon Laboratories, Inc.
var ServerActions   = require('./actions/ServerActions.js'),
    Constants       = require('./Constants.js'),
    fs              = require('fs-extra'),
    path            = require('path'),
    Logger          = require('./Logger.js'),
    child_process   = require('child_process'),
    _               = require('underscore');

var keyDerivationPath = path.join(__dirname, Constants.keyDerivationPath);
var ZB3KeysStorePath = path.join(__dirname, Constants.zb3KeysStore);

class ZB3KeyManagement {
  constructor() {
    this.ZB3KeysList = {};

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
                                                           formattedLinkKey);
      } else {
        ServerActions.GatewayInterface.zigbee3PermitJoinMsInstallCode(formattedDeviceEui,
                                                                      formattedLinkKey);
      }
      this.addKey(deviceEui, installCode, linkKey);
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
}

module.exports = ZB3KeyManagement;
