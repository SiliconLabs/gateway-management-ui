// Copyright 2015 Silicon Laboratories, Inc.

var fs             = require('fs-extra'),
  path             = require('path'),
  Constants        = require('../../Constants.js'),
  Utilities        = require('../../Utilities.js'),
  Logger           = require('../../Logger.js');

var otaArchivePath = path.join(__dirname, Constants.otaArchiveSearchingPath);

// Variable definitions for the ZigBee firmware over-the-air upgrade
var MAGIC_NUMBER_OFFSET   = 0;
var HEADER_VERSION_OFFSET = 4;
var HEADER_LENGTH_OFFSET  = 6;
var FIELD_CONTROL_OFFSET  = 8;
var MANUFACTURER_ID_OFFSET = 10;
var IMAGE_TYPE_ID_OFFSET   = 12;
var VERSION_OFFSET         = 14;
var STACK_VERSION_OFFSET   = 18;
var HEADER_STRING_OFFSET   = 20;
var IMAGE_SIZE_OFFSET      = 52;
var OPTIONAL_FIELDS_OFFSET = 56;

var ota = {
  otaFiles: [],
  files: {},

  getOTAImages: function() {
    return this.otaFiles;
  },

  readOTAFiles: function() {
    try {
      this.files = fs.readdirSync(otaArchivePath);
      this.otaFiles = [];
      for (var x = 0; x < this.files.length; x++)  {
        if (this.files[x].indexOf('.ota') !== -1) {
          this.otaFiles.push(JSON.parse('{ "filename":"' + this.files[x] + '"}'));
        }
      }

      for (var x = 0; x < this.otaFiles.length; x++)  {
        if (this.otaFiles[x] !== undefined) {
          var path = otaArchivePath + '/' + this.otaFiles[x].filename;

          var fd = fs.openSync(path, 'r');

          var buffer = new Buffer(56);
          fs.readSync(fd, buffer, 0, buffer.length, 0);

          var manfid = buffer.readUInt16LE(MANUFACTURER_ID_OFFSET).toString(16).toUpperCase();
          var imagetype = buffer.readUInt16LE(IMAGE_TYPE_ID_OFFSET).toString(16).toUpperCase();
          var fwversion = buffer.readUInt32LE(VERSION_OFFSET).toString(16).toUpperCase();
          var size = buffer.readUInt32LE(IMAGE_SIZE_OFFSET);

          this.otaFiles[x].manufacturerId = "0x" + manfid;
          this.otaFiles[x].imageTypeId = "0x" + imagetype;
          this.otaFiles[x].firmwareVersion = Utilities.formatNumberToHexString(buffer.readUInt32LE(VERSION_OFFSET), 8);
          this.otaFiles[x].imageSizeKB = size;
          this.otaFiles[x].key = String('00000000' + fwversion).slice(-8) + imagetype + manfid;

          fs.closeSync(fd);
        }
      }

      return this.otaFiles;
    } catch(e) {
      Logger.server.info('readOTAFiles exception: ' + e);
      return [];
    }
  },

  copyFile: function(fileName) {
    this.clearOta();

    Logger.server.info('Znet OTA Directory: ' + Constants.znetOtaDirectory + ' Cleared');

    Logger.server.info('Copying to:' + Constants.znetOtaDirectory +
      ' from: ' + otaArchivePath + '/' + fileName);

    // From, To
    try {
      fs.copySync(otaArchivePath + '/' + fileName, Constants.znetOtaDirectory + '/' + fileName);
      fs.chmodSync(Constants.znetOtaDirectory + '/' + fileName, '777');
      Logger.server.info('Successful file transfer');
    } catch (e) {
      Logger.server.log('error', 'Error copying: ' + e.toString());
    }
  },

  clearOta: function() {
    try {
      fs.emptyDirSync(Constants.znetOtaDirectory);
      Logger.server.info('Cleared Znet OTA Directory: ' + Constants.znetOtaDirectory);
    } catch (e) {
      Logger.server.log('error', 'Error clearing: ' + e.toString());
    }
  }
};

module.exports = ota;
