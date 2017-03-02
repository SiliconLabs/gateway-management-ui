/**
 * @jsx React.DOM
 */

var DeviceListControl = require('./DeviceListControl.react');
var Flux = require('../Flux');
var React = require('react');
var Constants = require('../Constants');
var ReactCSSTransitionGroup = require('react-addons-css-transition-group');
var RuleCreationDialog = require('./RuleCreationDialog.react');
var ExtendedNetworkDialog = require('./ExtendedNetworkDialog.react');
var RulesListControl = require('./RulesListControl.react');
var AddGroupDialog = require('./AddGroupDialog.react');
var Random = require("random-js");
var engine = Random.engines.mt19937().autoSeed();

class ControlPanel extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      addingDevice: false,
      addingDeviceProgress: 0,
      addingRule: false,
      reforming: false,
      showRulesAdd: true,
      extendedForm: false,
      reformbutton: true,
      addingGroup: false,
      addGroupButton: true, 
      groupsEnabled: false,
      relayRules: [],
      cloudRules: [],
      validNetInfo: true,
      displayName: 'ControlPanel',
    };
  }

  componentDidMount() {
    Flux.stores.store.getBuildInfo(function(info) {
      this.setState({
        version: info.version
      });
      this.forceUpdate();
    }.bind(this));

    if (Flux.stores.store.urlParameters.hasOwnProperty('groups')){
      this.setState({
        groupsEnabled: true,
      });
    }
    
    Flux.stores.store.on('change', function() {
      if (Flux.stores.store.heartbeat.hasOwnProperty("networkUp")) {
        if (!Flux.stores.store.heartbeat.networkUp || Flux.stores.store.heartbeat.networkUp === null) {
          this.setState({
            networkUp: false,
            channel: '14',
            pan: this.generateRandomPan(),
            power: '0',
          });
        } else if (Flux.stores.store.heartbeat.networkUp && !this.state.reforming) {
          this.setState({
            networkUp: true,
            channel: Flux.stores.store.heartbeat.radioChannel.toString(),
            pan: Flux.stores.store.heartbeat.networkPanId.slice(2),
            power: (Flux.stores.store.heartbeat.radioTxPower).toString(),
          });
        }
      }
      this.setState({
        cloudRules: Flux.stores.store.getHumanReadableCloudRules(),
        relayRules: Flux.stores.store.getHumanReadableRules()
      });
    }.bind(this));
  }

  componentWillUnmount() {
    Flux.stores.store.removeListener('change')
  }

  generateRandomPan() {
    var randomPanValue = Random.integer(1, 65535)(engine);
    return String('0000' + randomPanValue.toString(16)).slice(-4).toString().toUpperCase();
  }

  onAddDevice() {
    Flux.actions.gatewayPermitJoining(16);
    // Progress display stuff
    this.setState({
      addingDeviceProgress: 16,
      addingDevice: true
    });

    var waitForNextSecond; 
    if (!this.state.addingDevice) {
      waitForNextSecond = function() {
        window.setTimeout(function() {
          if (this.state.addingDeviceProgress > 0) {
            this.setState({
              addingDeviceProgress: this.state.addingDeviceProgress - 1});
            waitForNextSecond();
          } else {
            Flux.actions.gatewayPermitJoiningOff();
            this.setState({addingDevice: false});
          }
        }.bind(this), 1000);
      }.bind(this);
      waitForNextSecond();
    }
  }

  onDisablePjoin() {
    this.setState({
      addingDeviceProgress: 0,
      addingDevice: false
    });
    Flux.actions.gatewayPermitJoiningOff();
  }

  validateChannel(chanStr) {
    if (chanStr === undefined) {
      return false;
    }

    chanStr = chanStr.trim();
    var matches  = /(^[0-9]+$)/.test(chanStr);

    if ((chanStr.length <= 2)
      && (parseInt(chanStr, 10) <= 26) 
      && (parseInt(chanStr, 10) >= 11)
      && (matches)) {
      return true;
    } else {
      return false;
    }
  }

  validatePAN(panStr) {
    if (panStr === undefined) {
      return false;
    }

    panStr = panStr.trim();
    var matches  = /(^[0-9A-Fa-f]+$)/.test(panStr);

    if (panStr.length <= 4 && matches) {
      return true;
    } else {
      return false;
    }
  }

  validatePower(powStr) {
    if (powStr === undefined) {
      return false;
    }

    powStr = powStr.trim();
    var matches  = /(^[0-9\-]+$)/.test(powStr);

    if ((powStr.length <= 3)
      && (parseInt(powStr, 10) >= -20)
      // this corresponds to -2 power setting
      && (parseInt(powStr, 10) <= 20)
      && (matches)) {
      return true;
    } else {
      return false;
    }
  }

  validateAll(channel, pan, power) {
    return this.validatePower(power) 
        && this.validatePAN(pan) 
        && this.validateChannel(channel);
  }

  onReform(channel, pan, power) {
    if (this.validateAll(channel, pan, power)) {
      Flux.actions.reformNetwork(channel, pan, power - 22);
      this.setState({
        networkUp: false,
        reforming: true,
        validNetInfo: true,
        extendedForm: false,
        channel: channel,
        pan: pan,
        power: power,
      });

      setTimeout(function() {
        this.setState({ reforming: false })
        Flux.actions.getGatewayState();
      }.bind(this), Constants.REFORM_TIMEOUT);
    } else {
      this.setState({ validNetInfo: false });
    }
  }

  onSimpleReform() {
    if (this.validateAll(this.state.channel, this.state.pan, this.state.power)) {
      Flux.actions.reformNetwork(this.state.channel, this.state.pan, this.state.power - 22);
      this.setState({
        networkUp: false,
        reforming: true,
        validNetInfo: true,
        extendedForm: false,
      });
      setTimeout(function() {
        this.setState({ reforming: false })
        Flux.actions.getGatewayState();
      }.bind(this), Constants.REFORM_TIMEOUT);
    } else {
      this.setState({ validNetInfo: false });
    }
  }

  onAddRule() {
    this.setState({
      addingRule: true,
      showRulesAdd: false
    });
  }

  onAddGroup() {
    this.setState({
      addingGroup: true,
      addGroupButton: false
    });
  }

  onClearRules() {
    Flux.stores.store.clearRules();
    Flux.actions.clearCloudRules();
    Flux.actions.clearRules();
  }

  onRemoveRule(rule) {
    if (rule.from.data.supportsRelay) {
      Flux.stores.store.deleteRule(rule);
      Flux.actions.deleteRule(rule.from.data.deviceEndpoint, rule.to.data.deviceEndpoint); 
    } else {
      Flux.stores.store.deleteCloudRule(rule);
      Flux.actions.deleteCloudRule(rule.from.data.deviceEndpoint, 
                                   rule.to.data.deviceEndpoint,
                                   rule.from.data.deviceType,
                                   rule.to.data.deviceType,
                                   {type: 'SIMPLE_BIND'});
    }
  }

  onCreateRule(state) {
    if (Flux.stores.store.isGroup(state.light)) {
      Flux.actions.createGroupRule(state.switch.deviceTableIndex, state.light.itemList);
    } else {
      Flux.stores.store.addRule(state.switch, state.light);
      if (state.switch.supportsRelay) {
        Flux.actions.createRule(state.switch.deviceEndpoint, state.light.deviceEndpoint);
      } else {
        Flux.actions.createCloudRule(state.switch.deviceEndpoint, 
                                     state.light.deviceEndpoint,
                                     state.switch.deviceType,
                                     state.light.deviceType,
                                     {type: 'SIMPLE_BIND'});
      }
    }
    this.setState({addingRule: false});
  }

  onCreateGroup(group) {
    if (!(Object.getOwnPropertyNames(group).length === 0)) {
      Flux.actions.createGroup(group);
    }
    this.setState({addingGroup: false});
  }

  onRemoveNode(node) {
    if (!Flux.stores.store.isGroup(node.data)) {
      Flux.actions.removeNode(node);
    } else {
      Flux.actions.removeGroup(node.data.groupName);
    }
    
    this.forceUpdate();
  }

  onDeviceToggle(node) {
    node.isOn = !node.isOn;
    Flux.actions.setLightToggle(node);
  }

  bindTemp(node) {
  }

  onCancelRuleCreation() {
    this.setState({addingRule: false});
  }

  onCancelGroupCreation() {
    this.setState({addingGroup: false});
  }

  onExtendedCancel() {
    this.setState({extendedForm: false});
  }

  onRulesUnmount() {
    window.setTimeout(function() {
      this.setState({showRulesAdd: true});
    }.bind(this), 100);
  }

  onExtendedUnmount() {
    window.setTimeout(function() {
      this.setState({reformbutton: true});
    }.bind(this), 100);
  }

  onGroupUnmount() {
    window.setTimeout(function() {
      this.setState({addGroupButton: true});
    }.bind(this), 100);
  }

  onExtendedForm() {
    this.setState({
      extendedForm: true,
      reformbutton: false
    });
  }
  
  _generateSwitchesList() {
    return _.chain(Flux.stores.store.getSwitches()).map(function(device) {
      var name = Flux.stores.store.getHumanReadableDevice(device);
      return {value: device, name: name.name, simplename: name.simplename};
    }).value();
  }

  _generateDevicesList() {
    return _.chain(Flux.stores.store.getDevices()).map(function(device) {
      var name = Flux.stores.store.getHumanReadableDevice(device);
      return {value: device, name: name.name, simplename: name.simplename};
    }).value();
  }

  _generateLightsList() {
    return _.chain(Flux.stores.store.getLights()).map(function(device) {
      var name = Flux.stores.store.getHumanReadableDevice(device);
      return {value: device, name: name.name, simplename: name.simplename};
    }).value();
  }

  render() {
    var addDeviceButtonText = this.state.addingDevice ?
      'Listening for ' + this.state.addingDeviceProgress + ' seconds' :
      'Device';

    var cancel;
    if (this.state.addingDevice) {
      cancel = (
        <div className={'ui button basic silabsglobal'}
          onTouchTap={this.onDisablePjoin.bind(this)} >
        Disable Joining
        </div>
      );
    }

    var addGroupButton;
    if (this.state.addGroupButton && this.state.groupsEnabled) {
      addGroupButton = (
        <div className={'ui basic silabsglobal button'}
            onTouchTap={this.onAddGroup.bind(this)}
        >
        <i className="plus icon"></i>
          Group
        </div>
      );
    }

    var groupCreation;
    if (this.state.addingGroup) {
      groupCreation = (
        <div className='ui segment adding-rule'>
          <AddGroupDialog
            devices={this._generateDevicesList()}
            onCancel={this.onCancelGroupCreation.bind(this)}
            onCreateGroup={this.onCreateGroup.bind(this)} 
            onUnmount={this.onGroupUnmount.bind(this)}
          />
        </div>
      )
    }
    

    var devices = (
      <div className="column">
        <h4 className="ui header">Attached Devices</h4>
        <DeviceListControl items={Flux.stores.store.getHumanReadableDevices()}
          onRemove={this.onRemoveNode.bind(this)}
          onDeviceToggle={this.onDeviceToggle.bind(this)}
          bindTemp={this.bindTemp.bind(this)}/>
        <div>
          <div className={'ui basic silabsglobal button'}
            onTouchTap={this.onAddDevice.bind(this)}>
          <i className="plus icon"></i>
          {addDeviceButtonText}
        </div>
        {addGroupButton}
        </div>
        {groupCreation}
        <br/>
        <ReactCSSTransitionGroup transitionName="rulescreation" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
          {cancel}
        </ReactCSSTransitionGroup>
      </div>
    );

    var RulesCreation;
    if (this.state.addingRule) {
      RulesCreation = (
        <div className='ui segment adding-rule'>
          <RuleCreationDialog
            switches={this._generateSwitchesList()}
            lights={this._generateLightsList()}
            onCancel={this.onCancelRuleCreation.bind(this)}
            onRuleCreate={this.onCreateRule.bind(this)} 
            onUnmount={this.onRulesUnmount.bind(this)}/>
        </div>
      );
    }

    var extendedFormDialog;
    if (this.state.extendedForm) {
      extendedFormDialog = (
        <div className='ui segment adding-rule'>
          <ExtendedNetworkDialog
            channel={this.state.channel}
            pan={this.state.pan}
            power={this.state.power}
            onCancel={this.onExtendedCancel.bind(this)}
            onReform={this.onReform.bind(this)} 
            onUnmount={this.onExtendedUnmount.bind(this)}
            validatePAN={this.validatePAN.bind(this)}
            validatePower={this.validatePower.bind(this)}
            validateChannel={this.validateChannel.bind(this)}/>
        </div>
      );
    }

    var RulesSet;
    if (this.state.showRulesAdd) {
      RulesSet = (
        <div>
          <div>
            <div className='ui basic silabsglobal button'
              onTouchTap={this.onAddRule.bind(this)} >
            <i className="plus icon"/>
              Set Rule
            </div>
            <div className='ui basic silabsglobal button'
              onTouchTap={this.onClearRules.bind(this)}>
              Clear Rules
            </div>
          </div>
        </div>
      );
    }

    var rules = (
      <div className="column">
        <h4>Device Binding Rules</h4>
        <RulesListControl 
          relayRules={this.state.relayRules}
          cloudRules={this.state.cloudRules}
          onRemove={this.onRemoveRule.bind(this)}/>
        {RulesSet}
        <br/>
        <ReactCSSTransitionGroup transitionName="rulescreation" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
          {RulesCreation}
        </ReactCSSTransitionGroup>
      </div>
    );

    var reformButton; 
    if (this.state.reformbutton) {
      reformButton = (
        <div>
        <div className='ui left attached basic silabsglobal button'
          onTouchTap={this.onSimpleReform.bind(this)} >
        Reform Network
        </div>
        <div className='ui right attached basic silabsglobal button'
          onTouchTap={this.onExtendedForm.bind(this)} >
        <i className="settings icon"></i>
        </div>
        {!this.state.validNetInfo ?
          <div className="ui icon error message">
            <i className="small attention circle icon"></i>
            <div className="content">
              <div className="header">{this.state.status}</div>
              <p>Please choose new network infomation. </p>
            </div>
          </div>
          : ''}
        </div>
      );
    }

    return (
      <div className="ui segment control-panel" style={{margin: '0rem', borderRadius: '0rem'}}>
        <div className="header">
        <img className="logo" 
          src="assets/silicon-labs-logo.png" />
        <h3 className="title">ZigBee Network Setup</h3>
        </div>
        <div className="ui divider"></div>
        <div className="ui stackable two column grid">
          {devices}
          {rules}
        </div>

        <h4 className='ui header'>Network Maintenance</h4>
        <div className="ui divider"></div>

        <h4 className={(this.state.networkUp === undefined) ? 
          'ui yellow header' : this.state.networkUp ? 
          'ui green header' : 'ui red header'}>
        {(this.state.networkUp === undefined) ?
        'ZigBee Network: Unknown' : 
        this.state.networkUp ? 
        'ZigBee Network: Up' : 'ZigBee Network: Down'}
        </h4>
        {(this.state.networkUp === undefined) ? 
        '' : this.state.networkUp ?
        <div className="ui list">
        <div className="item" style={{"paddingLeft":'1.5em'}}>
        Channel: {this.state.channel}
        </div>
        <div className="item" style={{"paddingLeft":'1.5em'}}>
        Pan: 0x{this.state.pan}
        </div>
        <div className="item" style={{"paddingLeft":'1.5em'}}>
        Power(dBm): {this.state.power}
        </div>
        </div>
        : ''}

        <br/>
          <div className="ui stackable two column grid">
            <div className="column">
            {reformButton}
            <ReactCSSTransitionGroup transitionName="rulescreation" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
              {extendedFormDialog}
            </ReactCSSTransitionGroup>
          </div>
        </div>
        <div className="ui divider"></div>

        <div className="footer">
          <h5 className="ui right aligned header">{this.state.version}</h5>
        </div>
      </div>
    );
  }
}

module.exports = ControlPanel;
