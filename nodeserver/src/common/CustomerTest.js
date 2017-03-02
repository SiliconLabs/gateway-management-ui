// Copyright 2015 Silicon Laboratories, Inc.

function Test(number, loggerTesting, period, iterations, nodeId, deviceType) {
  this.KeyedMessages = {};
  this.Paired = {};
  this.AllMessage = [];
  this.AllResponses = [];
  this.BuildMessages = [];
  this.rawMessages = [];

  this.sentMessages = [];
  this.preRecv = [];
  this.preSendCB = [];

  this.AllDefaultResponses = [];
  this.UnprocessedDefaults = [];
  this.DuplicateSeqSend = [];

  this.roundTrips = [];
  this.LQI = [];
  this.RSSI = [];
  this.duplicateResponses = 0;
  this.missedResponses = 0;
  this.MatchedDefaults = 0;
  this.failedAcks = 0;

  this.testing = false; 

  this.logger = loggerTesting;
  this.testNum = number; 
  this.period = period;
  this.iterations = iterations;
  this.nodeId = nodeId;
  this.deviceType = deviceType;
  this.legacy = '';

  this.avgRound = 9999;
  this.avgRSSI = 9999;
  this.avgLQI = 9999;
}

Test.prototype.isTesting = function() {
  return this.testing;
};

Test.prototype.setTesting = function(bool) {
  this.testing = bool;
};

Date.prototype.yyyymmddhhmmssfff = function() {
  var yyyy = this.getFullYear();
  var mm = this.getMonth() < 9 ? '0' + (this.getMonth() + 1) : (this.getMonth() + 1); // getMonth() is zero-based
  var dd  = this.getDate() < 10 ? '0' + this.getDate() : this.getDate();
  var hh = this.getHours() < 10 ? '0' + this.getHours() : this.getHours();
  var min = this.getMinutes() < 10 ? '0' + this.getMinutes() : this.getMinutes();
  var ss = this.getSeconds() < 10 ? '0' + this.getSeconds() : this.getSeconds();
  var fff = this.getMilliseconds() < 10 ? '00' + this.getMilliseconds() : 
  this.getMilliseconds() >= 10 && this.getMilliseconds() < 100 ? '0' + this.getMilliseconds() : this.getMilliseconds();
  return yyyy + '/' + mm + '/' + dd + ' ' + hh + ':' + min + ':' + ss + '.' + fff;  
};

Test.prototype.addRaw = function(message) {
  this.rawMessages.push(message);
};

Test.prototype.messageToString = function(message) {
  if (message !== undefined) {
    var timeData = new Date(parseInt(message.currentTimeMs, 10));
    message.timestamp = timeData.yyyymmddhhmmssfff();

    if (message.messageType === 'messageBuilt') {
      return message.timestamp + ' ' + message.messageType + ' Seq:' + message.sequenceNumber;
    } else if (message.messageType === 'preMessageSend') {
      return message.timestamp + ' ' + message.messageType;
    } else if (message.messageType === 'preMessageReceived') {
      return message.timestamp + ' ' + message.messageType 
      + ' LQI:' + message.linkQuality + ' RSSI:' + message.rssi;
    } else if (message.messageType === 'messageSent') {
      return message.timestamp + ' ' + message.messageType + ' Ack:'
      + (message.returnStatus === 0 ? 'True' : 'False');
    } else if (message.messageType === 'defaultResponse') {
      return message.timestamp + ' ' + message.messageType + ' Seq:' + message.sequenceNumber;
    } else {
      return 'Not found';
    }
  } else {
    return 'Undefined message';
  }
};

Test.prototype.handleTestMessage = function(message) {
  if (message.messageType === 'messageBuilt') {
    this.addMsgBuild(message);
  } else if (message.messageType === 'defaultResponse') {
    this.addDefault(message);
  } else if (message.messageType === 'preMessageReceived') {
    this.addPreRecv(message);
  } else if (message.messageType === 'messageSent') {
    this.addMsgSent(message);
  } else if (message.messageType === 'preMessageSend') {
    this.addPreSend(message);
  } else {

  }
  this.addRaw(message);
};

Test.prototype.setLegacy = function(legacy) {
  this.legacy = legacy; 
};

/* 
message format: 
{ 
  messageType: "messageBuilt", 
  sequenceNumber: <int>, 
  currentTimeMs: <intMs>
}
*/
Test.prototype.addMsgBuild = function(message) {
  if (message.sequenceNumber in this.KeyedMessages) {
    this.DuplicateSeqSend.push(message);
  } else {
    this.KeyedMessages[message.sequenceNumber] = message;
  }
  this.BuildMessages.push(message);
};

/* 
message format: 
{
  messageType: "defaultResponse",
  returnStatus: <0 or 1>, 
  sequenceNumber: <int>, 
  currentTimeMs: <intMs>
}
*/
Test.prototype.addDefault = function(message) {
  if (message !== undefined) {
    this.UnprocessedDefaults.push(message);
    this.AllDefaultResponses.push(message);
  }
};

/* 
message format: 
{ 
  messageType: "preMessageReceived", 
  sequenceNumber: <int>, 
  currentTimeMs: <intMs>,
  rssi: <int>,
  linkQuality: <int>
}
*/
Test.prototype.addPreRecv = function(message) {
  this.preRecv.push(message);
};

/* 
message format: 
{ 
  messageType: "messageSent", 
  sequenceNumber: <int>, 
  currentTimeMs: <intMs>,
}
*/
Test.prototype.addMsgSent = function(message) {
  this.sentMessages.push(message);
};

/* 
message format: 
{ 
  messageType: "preMessageSend",
  returnStatus: <0 or 1>,
  sequenceNumber: <int>,
  currentTimeMs: <intMs>,
}
*/
Test.prototype.addPreSend = function(message) {
  this.preSendCB.push(message);
};

Test.prototype.processBuildDefault = function() {
  // Fill blank test array
  for (var key in this.KeyedMessages) {
    if (this.KeyedMessages.hasOwnProperty(key)) {
      var messagePair = {};
      messagePair.resp = [];
      messagePair.message = this.KeyedMessages[key];

      this.Paired[key] = messagePair; 
    }
  }

  // Add responses
  this.UnprocessedDefaults = this.UnprocessedDefaults.filter (function(resp) {
    if (resp.sequenceNumber in this.Paired) {
      this.Paired[resp.sequenceNumber].resp.push(resp);
      // processed //remove
      return false; 
    } else {
      return true;
    }
  }.bind(this));

  // Display test information
  this.logger.info('\nTest Number: ' + this.testNum + ' Light: ' + this.nodeId + ' At Period: ' 
    + this.period + ' Iterations: ' + this.iterations + ' DeviceType: ' + this.deviceType);
  
  this.logger.info('\nRAW DATA');

  // Print raw data
  for (var i = 0; i < this.rawMessages.length; i++) {
    this.logger.info(this.messageToString(this.rawMessages[i]));
  }

  this.logger.info('\nPAIRED MESSAGES');

  // Print paired messages
  for (var key in this.Paired) {
    if (this.Paired.hasOwnProperty(key)) {
      this.logger.info('Build Message: ' + this.messageToString(this.Paired[key].message));

      for (var i = 0; i < this.Paired[key].resp.length; i++) {
        var roundTrip = (this.Paired[key].resp[i].currentTimeMs - this.Paired[key].message.currentTimeMs);
        this.Paired[key].resp[i].roundtripmsec = roundTrip; 

        // Append Roundtrip Array
        this.roundTrips.push(roundTrip);

        this.MatchedDefaults += 1;

        this.logger.info('  Default Response: ' + this.messageToString(this.Paired[key].resp[i]) + ' RoundTrip(ms):' + roundTrip);
      }

      // Missed Responses
      if (this.Paired[key].resp.length === 0) {
        this.missedResponses += 1;
      }

      // Duplicate Responses
      if (this.Paired[key].resp.length > 1) {
        this.duplicateResponses += this.Paired[key].resp.length - 1; 
      }
    }
  }

  // Unmatched Default Responses
  this.logger.info('\n\rUNMATCHED DEFAULT RESPONSES:');

  this.UnprocessedDefaults.map(function(leftover) {
    this.logger.info('  Default Response: ' + this.messageToString(leftover));
  }.bind(this));

  this.logger.info('\n\rDUPLICATED BUILD MESSAGES:');
  // Duplicated Seq Send
  this.DuplicateSeqSend.map(function(leftover) {
    this.logger.info('  Duplicated Build Messages: ' + this.messageToString(leftover));
    return leftover; 
  }.bind(this)); 

  // Build failed Acks
  this.sentMessages.map(function(message) {
    if (message.returnStatus !== 0) {
      this.failedAcks += 1; 
    }
  }.bind(this)); 

  // Build all LQI:RSSI
  this.preRecv.map(function(message) {
    this.LQI.push(message.linkQuality);
    this.RSSI.push(message.rssi);
  }.bind(this));

  // FinalInfo
  this.logger.info('\n\rTEST DESCRIPTION:');
  this.logger.info('  TestNumber: ' + this.testNum);
  this.logger.info('  Period: ' + this.period);
  this.logger.info('  NumberOfMessages: ' + this.iterations);
  this.logger.info('RESULTS / STATISTICS:');
  this.logger.info('  Calls To deviceTableSend: ' + this.BuildMessages.length);
  this.logger.info('  Calls To MessageSentCallback: ' + this.sentMessages.length);
  this.logger.info('  Calls To DefaultResponseCallback: ' + this.AllDefaultResponses.length);
  this.logger.info('  Total Number of PreSend Callbacks: ' + this.preSendCB.length);
  this.logger.info('  Total Number of PreRecv Callbacks: ' + this.preRecv.length);
  this.logger.info('  MessageSentCallback status failed: ' + this.failedAcks);
  this.logger.info('  Default Response Retries: ' + this.duplicateResponses);
  this.logger.info('  MsgBuilds with Missing Responses: ' + this.missedResponses);
  this.logger.info('  Unmatched Default Responses: ' + this.UnprocessedDefaults.length);
  this.logger.info('  Legacy Info: ' + JSON.stringify(this.legacy));

  // Compute average roundtrip
  var avgRound;
  try {
    var sumRound = this.roundTrips.reduce(function(a, b) { 
      return a + b; 
    });
    if (this.roundTrips.length > 1) {
      avgRound = (sumRound / this.roundTrips.length).toFixed(3);
    } else {
      avgRound = 'No Readings';
    }
  } catch (e) {
    console.log('Test error: Empty Array');
    avgRound = 'No Readings';
  }

  this.logger.info('  AVG ROUNDTRIP FOR MATCHED: ' + avgRound + " ms");

  // Compute average RSSI/LQI
  var avgRSSI;
  try {
    var sumRSSI = this.RSSI.reduce(function(a, b) { 
      return a + b; 
    });
    if (this.RSSI.length > 1) {
      avgRSSI = (sumRSSI / this.RSSI.length).toFixed(3);
    } else {
      avgRSSI = 'No Readings';
    }
  } catch (e) {
    console.log('Test error: Empty Array');
    avgRSSI = 'No Readings';
  }

  this.logger.info('  AVG RSSI: ' + avgRSSI);

  var avgLQI;
  try {
    var sumLQI = this.LQI.reduce(function(a, b) { 
      return a + b; 
    });
    if (this.LQI.length > 1) {
      avgLQI = (sumLQI / this.LQI.length).toFixed(3);
    } else {
      avgLQI = 'No Readings';
    }
  } catch (e) {
    console.log('Test error: Empty Array');
    avgLQI = 'No Readings';
  }

  this.logger.info('  AVG LQI: ' + avgLQI);

  this.logger.info('\n\rEND LOG FOR Test Number: ' + this.testNum + ' Light: ' + this.nodeId + ' At Period: '
    + this.period + ' Iterations: ' + this.iterations + ' DeviceType: ' + this.deviceType);

};

module.exports = Test;