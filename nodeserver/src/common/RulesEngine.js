'use strict';
// Copyright 2015 Silicon Laboratories, Inc.
var ServerActions = require('./actions/ServerActions.js'),
    Constants     = require('./Constants.js'),
    fs            = require('fs-extra'),
    path          = require('path'),
    Logger        = require('./Logger.js'),
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

    switch (ruleType.type) {
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

  /* Rule information:
    Cluster, Attribute -> Match for which attributes we are tracking
    sourceEndpoint -> Match for source
    Type -> Identifies which bits to forward and what action to take 
    destEndpoint -> Where to send command to 
  */

  addRule(cluster, attribute, inDeviceEndpoint, outDeviceEndpoint, ruleType) {
    var ruleID = this.createRuleHash(cluster, attribute, inDeviceEndpoint); 

    if (!this.rules[ruleID]) {
      this.rules[ruleID] = [];
    }

    this.rules[ruleID].push({ inDeviceEndpoint, outDeviceEndpoint, ruleType });
    Logger.server.log('info', 'Rule added: ', cluster, attribute, inDeviceEndpoint, ruleType, outDeviceEndpoint, ruleID);
    fs.writeFileSync(rulesStorePath, JSON.stringify(this.rules));
  }

  deleteRule(cluster, attribute, inDeviceEndpoint, outDeviceEndpoint, ruleType) {
    var ruleID = this.createRuleHash(cluster, attribute, inDeviceEndpoint); 

    _.each(this.rules[ruleID], function(rule) {
      if (_.isEqual(rule, { inDeviceEndpoint, outDeviceEndpoint, ruleType })){
        delete this.rules[ruleID]; 
      }
    }.bind(this));
    fs.writeFileSync(rulesStorePath, JSON.stringify(this.rules));
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

