// Copyright 2015 Silicon Laboratories, Inc.
var Logger             = require('./Logger.js');

var Utilities = { 
  formatNumberToHexString: function(number, padding) {
    if (typeof number !== 'number') {
      Logger.server.log('error', 'formatNumberToHexString not supplied number');
      return undefined; 
    }

    var stringVal = number.toString(16).toUpperCase();

    if (stringVal.length > padding) {
      Logger.server.log('error', 'formatNumberToHexString unable to pad');
      return undefined; 
    }

    for (var i = stringVal.length; i < padding; i++) {
      var stringVal = '0' + stringVal; 
    }

    return '0x' + stringVal; 
  },

  convertTemperatureCtoF: function(celcius) {
    return ((celcius * 9) / 5) + 32; 
  },

  formatNumberToHexBufferWithPadding: function(number, padlengthbytes) {
    if (typeof number !== 'number') {
      Logger.server.log('error', 'formatNumberToHexBuffer not supplied number');
      return '{01}'; 
    }

    var stringVal = number.toString(16).toUpperCase();
    var returnString = '';

    /* Pad to length p(2) FF  => 00FF and p(3) FF => 0000FF */
    var timesToPad = (padlengthbytes * 2) - stringVal.length;
    for (var j = 0; j < timesToPad; j = j + 1) {
      stringVal = '0' + stringVal;
    }

    /* Split stringVal from form F0F0F0 to F0 F0 F0 */
    for (var i = 0; i < stringVal.length; i = i + 2) {
      var returnString =  stringVal.substring(i, i+2) + ' ' + returnString;
    }

    return '{' + returnString.trim() + '}'; 
  },
};

module.exports = Utilities;