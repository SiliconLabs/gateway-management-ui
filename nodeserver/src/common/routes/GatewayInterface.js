// Copyright 2015 Silicon Laboratories, Inc.

/* This file implements the Silicon Labs Smart Gateway MQTT API */

var mqtt                = require('mqtt'),
  ip                    = require('ip'),
  fs                    = require('fs'),
  MQTTEmitter           = require('mqtt-emitter'),
  DeviceController      = require('../controller/DeviceController.js'),
  DeviceDBManagement    = require('../controller/DeviceDBManagement.js'),
  Constants             = require('../Constants.js'),
  Config                = require('../Config.js'),
  _                     = require('underscore'),
  Logger                = require('../Logger.js');

// The MQTT Mosquitto broker is running on localhost:1883
// ip.address() is the local address.
var mqttBrokerPort = 1883;
var mqttBrokerAddress = "127.0.0.1";

if (Config.CLOUD_ENABLED && Config.CLOUD_MQTT_SSL_ENABLED) {
  try {
    var mqttKey = fs.readFileSync(Constants.MQTT_PRIVKEY_FILELOCATION);
    var mqttCert = fs.readFileSync(Constants.MQTT_CERT_FILELOCATION);
    var mqttCA = fs.readFileSync(Constants.MQTT_CA_FILELOCATION);

    var options = {
      host: mqttBrokerAddress,
      port: mqttBrokerPort,
      key: mqttKey,
      cert: mqttCert,
      ca: mqttCA,
      protocol: "mqtts",
      rejectUnauthorized : true
    };
  } catch(e) {
    Logger.server.log('info', 'Error Loading Keys' + e);
  }
} else {
  var options = {
    port: mqttBrokerPort,
    host: mqttBrokerAddress
  };
}

var mqttClient =  mqtt.connect(options);

Logger.server.log('info', 'Connecting to MQTT at: ' + mqttBrokerAddress
     + ':' + mqttBrokerPort);

mqttClient.on('connect', function() {
  // Subscribe to all topics
  Logger.server.log('info', 'MQTT Client connected to broker at: ' + mqttBrokerAddress
  + ':' + mqttBrokerPort);

  mqttClient.subscribe({'#': 2}, function(err) {
    if (!err) {
      Logger.server.log('info', 'MQTT Client Subscribed to #');
    } else {
      Logger.server.log('info', 'MQTT Client Error: ' + err);
    }
  });
});

mqttClient.on('error', function() {
  // Subscribe to all topics
  Logger.server.log('info', 'MQTT Client Error: ');
});

var events = new MQTTEmitter();

mqttClient.on('message', function(topic, message) {
  if (topic.indexOf('heartbeat') === -1){
    Logger.server.log('info', 'MQTT Received (topic): ' + topic);
    Logger.server.log('info', 'MQTT Received (message): ' + message);
  }

  try {
    var messageParsed = JSON.parse(message);

    events.emit(topic, messageParsed);
  } catch (e) {
    Logger.server.log('info', 'Error Parsing MQTT Received: ' + e + ' \ntopic: '
      + topic + ' message: ' + message);
  }
});

/*
  MQTT is the primary channel for communication with the Silicon Labs
  Raspberry Pi Gateway. These events are triggered when the gateway sends
  information to this server inteface. IE: Gateway --> Server.
  These routes send gateway data to the cloud and/or to a browser/client.
*/

/*
this event is fired when a node joins the gateway
mqtt message format:
  {
  "nodeId":"0xE834",
  "deviceState":16,
  "deviceType":"0x0107",
  "timeSinceLastMessage":581,
  "deviceEndpoint":{
    "eui64":"000B57FFFE1938FD",
    "endpoint":1,
    "clusterInfo": [
      {
          "clusterId": <String>,
          "clusterType": <String>
      },
      {
          "clusterId": <String>,
          "clusterType": <String>
      }
    ]
  }
},
*/
events.on('gw/+gatewayEui/devicejoined', function(messageParsed, params) {
  DeviceDBManagement.onNodeJoin(messageParsed, params.gatewayEui, true);
});

/*
This event is fired when a node leaves
mqtt message format:
  {
    nodeEui: "nodeEuiString",
  }
*/
events.on('gw/+gatewayEui/deviceleft', function(messageParsed) {
  DeviceDBManagement.onNodeLeft(messageParsed.eui64);
});

/*
This event is fired when a client requests the list of all devices
mqtt message format:
{
  "devices":[
    {
    "nodeId":"0xE834",
    "deviceState":16,
    "deviceType":"0x0107",
    "timeSinceLastMessage":581,
    "deviceEndpoint":{
      "eui64":"000B57FFFE1938FD",
      "endpoint":1,
      "clusterInfo": [
        {
            "clusterId": <String>,
            "clusterType": <String>
        },
        {
            "clusterId": <String>,
            "clusterType": <String>
        }
      ]
      }
    },
    {
    "nodeId":"0xF4F0",
    "deviceState":16,
    "deviceType":"0x0105",
    "timeSinceLastMessage":192,
    "deviceEndpoint":{
      "eui64":"000D6F000AEF245F",
      "endpoint":1,
      "clusterInfo": [
        {
            "clusterId": <String>,
            "clusterType": <String>
        },
        {
            "clusterId": <String>,
            "clusterType": <String>
        }
      ]
      }
    }
  ]
}
*/
events.on('gw/+gatewayEui/devices', function(messageParsed, params) {
  DeviceDBManagement.onDeviceListReceived(messageParsed, params.gatewayEui);
});

/*
This event is fired when the server sends the ruleslist
mqtt message format:
{
  "relays":[
    {
      "inDeviceEui64":"000b57fffe1938fd",
      "inDeviceEndpoint":1,
      "outDeviceEui64":"000d6f000aef245f",
      "outDeviceEndpoint":1
    }
  ]
}

*/
events.on('gw/+gatewayEui/relays', function(messageParsed) {
  DeviceController.onRelayList(messageParsed);
});

/*
This event is fired when the server sends state of network.
mqtt message format:
{
  networkUp: true, false,
  networkPanId: "panIDString",
  radioTxPower: <power>,
  radioChannel: <channel>,
  trafficReporting: <true or false>
}
*/
events.on('gw/+gatewayEui/settings', function(messageParsed) {
  DeviceController.onGatewaySettings(messageParsed);
});

/* This event is fired when a device sends a new attribute
mqtt message format:
{
  "clusterId":"0x0019",
  "commandId":"0x01",
  "commandData":"00021005A005000000",
  "clusterSpecific":true,
  "deviceEndpoint":{
    "eui64":"000D6F000AEF245F",
    "endpoint":1
  }
}
*/
events.on('gw/+gatewayEui/zclresponse', function(messageParsed) {
    DeviceController.onZCLResponse(messageParsed);
});

/* This event is fired when a node changes state (Joined, Unresponsive, etc)
mqtt message format:
{
  nodeId: "nodeIDString",
  nodeEui: "nodeEuiString",
  deviceState: <deviceStateInt>,
}
*/
events.on('gw/+gatewayEui/devicestatechange', function(messageParsed) {
  DeviceDBManagement.onNodeStateChange(messageParsed);
});

/* This event is fired when the gateway reports OTA activity
ota message types (otaTypeString):
  otaFinished
  otaBlockSent
  otaStarted
  otaFailed

MQTT message format:
{
  messageType: "<otaTypeString>",
  nodeId: "nodeIDString",
  nodeEui: "nodeEuiString",
  returnStatus: <0 or 1>,         //optional
  blocksSent: <numberOfBlocks>,   //optional
  blockSize: <sizeOfBlocksInBytes>, //optional
  manufacturerId: "%04String",  //optional
  imageTypeId: "%04String", //optional
  firmwareVersion: "%08String" //optional
}
*/
events.on('gw/+gatewayEui/otaevent', function(messageParsed) {
  DeviceController.onOtaEvent(messageParsed);
});

/* This event is periodically fired by the gateway to show network status
MQTT message format:
{
  networkUp: true, false
  networkPanId: "panIDString",
  radioTxPower: <power>,
  radioChannel: <channel>,
}
*/
events.on('gw/+gatewayEui/heartbeat', function(messageParsed, params) {
  DeviceController.onHeartbeat(messageParsed, params.gatewayEui);
});

/* This event is acknowledges commands were executed
MQTT message format:

{
  command: "<cli>",
}
or
{
  delay: <msDelay>,
}
*/
events.on('gw/+gatewayEui/executed', function(messageParsed) {
  DeviceController.onMessageExecuted(messageParsed);
});

module.exports = mqttClient;
