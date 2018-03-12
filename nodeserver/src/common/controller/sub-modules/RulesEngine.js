'use strict';
// Copyright 2015 Silicon Laboratories, Inc.
var ServerActions = require('../../actions/ServerActions.js'),
    Constants     = require('../../Constants.js'),
    Logger        = require('../../Logger.js'),
    fs            = require('fs-extra'),
    path          = require('path'),
    _             = require('underscore');

var rulesStorePath = path.join(__dirname, Constants.rulesStore);

class RulesEngine {
  constructor() {
    this.rules = {};

    /* Load from filesystem gateway file to get gateway history. */
    if (fs.existsSync(rulesStorePath)) {
      var load = fs.readFileSync(rulesStorePath);
      if (load) {
        try {
          this.rules = JSON.parse(load);
        } catch (e) {
          Logger.server.log('info', 'Error reading Rules Store file');
        }
        Logger.server.log('info', 'Rules Store File Read: ' + load);
      } else {
        Logger.server.log('info', 'Rules Store Empty');
      }
    }
  }

  onZCLAttribute(cluster, attribute, value, sourceEndpoint) {
    var ruleID = this.createRuleHash(cluster, attribute, sourceEndpoint);

    Logger.server.log('info', 'Attribute Rule triggered:', cluster, attribute, value, sourceEndpoint, ruleID);

    _.each(this.rules[ruleID], function(rule) {
      this.sendRuleCommand(value, rule.ruleType, rule.outDeviceEndpoint);
    }.bind(this));
  }

  onZCLCommand(cluster, command, value, sourceEndpoint) {
    var ruleID = this.createRuleHash(cluster, command, sourceEndpoint);

    Logger.server.log('info', 'Command Rule triggered:', cluster, command, value, sourceEndpoint, ruleID);

    _.each(this.rules[ruleID], function(rule) {
      this.sendRuleCommand(value, rule.ruleType, rule.outDeviceEndpoint);
    }.bind(this));
  }

  sendRuleCommand(value, ruleType, outDeviceEndpoint) {
    Logger.server.log('info', 'Sending Rule', value, ruleType, outDeviceEndpoint);

    switch (ruleType) {
      case 'SIMPLE_BIND':
        if (value) {
          ServerActions.GatewayInterface.zigbeeLightOn(outDeviceEndpoint);
        } else {
          ServerActions.GatewayInterface.zigbeeLightOff(outDeviceEndpoint);
        }
        break;
      default:
        Logger.server.log('info', 'Rule not recognized', ruleType);
    }
  }

  syncNodes(inputNodeWithAttribute, outputNode) {
    var inputNodeClusterId = inputNodeWithAttribute.clusterId;
    var outputNodeClusterId = outputNode.clusterId;

    if (parseInt(inputNodeClusterId) === Constants.OCCUPANCY_CLUSTER &&
        parseInt(outputNodeClusterId) === Constants.ON_OFF_CLUSTER) {
      if (inputNodeWithAttribute.occupancyReading == 1) {
        ServerActions.GatewayInterface.zigbeeLightOff(outputNode.deviceEndpoint);
      } else {
        ServerActions.GatewayInterface.zigbeeLightOn(outputNode.deviceEndpoint);
      }
    } else if (parseInt(inputNodeClusterId) === Constants.IAS_ZONE_CLUSTER &&
                parseInt(outputNodeClusterId) === Constants.ON_OFF_CLUSTER) {
      if (inputNodeWithAttribute.contactState == 1) {
        ServerActions.GatewayInterface.zigbeeLightOff(outputNode.deviceEndpoint);
      } else {
        ServerActions.GatewayInterface.zigbeeLightOn(outputNode.deviceEndpoint);
      }
    }
  }

  /* Rule information:
    Cluster, Attribute -> Match for which attributes we are tracking
    sourceEndpoint -> Match for source
    Type -> Identifies which bits to forward and what action to take
    destEndpoint -> Where to send command to
  */

  addRule(attribute, inDeviceInfo, outDeviceInfo, ruleType) {
    var inDeviceEndpoint = inDeviceInfo.deviceEndpoint;
    var outDeviceEndpoint = outDeviceInfo.deviceEndpoint;
    var ruleID = this.createRuleHash(inDeviceInfo.deviceEndpoint.clusterId,
                                      attribute,
                                      inDeviceEndpoint);

    if (!this.rules[ruleID]) {
      this.rules[ruleID] = [];
    }

    this.rules[ruleID].push({ inDeviceEndpoint, outDeviceEndpoint, ruleType });
    Logger.server.log('info',
                      'Rule added: ',
                      inDeviceInfo.deviceEndpoint.clusterId,
                      attribute,
                      inDeviceEndpoint,
                      ruleType,
                      outDeviceEndpoint,
                      ruleID);
    fs.writeFileSync(rulesStorePath, JSON.stringify(this.rules));
  }

  deleteRule(attribute, inDeviceInfo, outDeviceInfo, ruleType) {
    var inDeviceEndpoint = inDeviceInfo.deviceEndpoint;
    var outDeviceEndpoint = outDeviceInfo.deviceEndpoint;
    var ruleID = this.createRuleHash(inDeviceInfo.deviceEndpoint.clusterId,
                                      attribute,
                                      inDeviceEndpoint);

    _.each(this.rules[ruleID], function(rule) {
      if (_.isEqual(rule, { inDeviceEndpoint, outDeviceEndpoint, ruleType })){
        var itemIndex = _.indexOf(this.rules[ruleID], rule);
        this.rules[ruleID].splice(itemIndex, 1);
      }
    }.bind(this));
    fs.writeFileSync(rulesStorePath, JSON.stringify(this.rules));
  }

  deleteRulesByDeviceInfo(deviceEui, endpoint) {
    var inputDeviceMatches = false;
    var keys = _.keys(this.rules);

    for (var i in keys) {
      if (keys[i].indexOf(deviceEui) !== -1) {
        delete this.rules[keys[i]];
        fs.writeFileSync(rulesStorePath, JSON.stringify(this.rules));
        inputDeviceMatches = true;
      }
    }

    if (!inputDeviceMatches) {
      var removeItemIndex = [];
      _.each(this.rules, function(rulesList) {
        for (var i in rulesList) {
          if (rulesList[i].outDeviceEndpoint.eui64 === deviceEui &&
              rulesList[i].outDeviceEndpoint.endpoint === endpoint) {
            rulesList.splice(i, 1);
            break;
          }
        }
      }.bind(this));
      fs.writeFileSync(rulesStorePath, JSON.stringify(this.rules));
    }
  }

  getRulesArray() {
    return _.flatten(_.values(this.rules))
  }

  clearRules() {
    this.rules = {};
    fs.writeFileSync(rulesStorePath, JSON.stringify(this.rules));
  }

  createRuleHash(cluster, attribute, inDeviceEndpoint) {
    var sourceEndpointHash = inDeviceEndpoint.eui64 + '-' + inDeviceEndpoint.endpoint;
    return cluster + '-' + attribute + '.' + sourceEndpointHash;
  }
}

module.exports = RulesEngine;
