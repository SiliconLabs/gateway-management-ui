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
      isZB3NetworkReformSelected: true,
      installCodeOnlyForJoin: false,
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
      deviceEui: '',
      installCode: '',
      validZB3Keys: false,
      ZB3KeysEmpty: true,
      isPjoinInProgress: false,
      isZB3PjoinInProgress: false,
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
      if (Flux.stores.store.getInstallCodeFromServer()) {
        this.setState({
          installCode: Flux.stores.store.getInstallCodeFromServer(),
          validZB3Keys: true
        });
        Flux.stores.store.resetInstallCodeFromServer();
      }
      this.setState({
        cloudRules: Flux.stores.store.getHumanReadableCloudRules(),
        relayRules: Flux.stores.store.getHumanReadableRules(),
        gatewaysettings: Flux.stores.store.gatewaysettings
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
    var ZB3PjoinEnabled = false;
    var pjoinEnabled = false;
    if (!this.state.ZB3KeysEmpty &&
        this.state.validZB3Keys &&
        !this.state.installCodeOnlyForJoin &&
        (Flux.stores.store.getNetworkSecurityLevel() == 'Z3')) {
      Flux.actions.gatewayPermitJoiningZB3(this.state.deviceEui,
                                            this.state.installCode,
                                            120);
      ZB3PjoinEnabled = true;
    } else if (!this.state.ZB3KeysEmpty &&
                this.state.validZB3Keys &&
                this.state.installCodeOnlyForJoin &&
                (Flux.stores.store.getNetworkSecurityLevel() == 'Z3')) {
      Flux.actions.gatewayPermitJoiningZB3InstallCodeOnly(this.state.deviceEui,
                                                          this.state.installCode,
                                                          120);
      ZB3PjoinEnabled = true;
    } else if (this.state.ZB3KeysEmpty &&
              (Flux.stores.store.getNetworkSecurityLevel() == 'Z3')) {
      Flux.actions.gatewayPermitJoiningZB3OpenNetworkOnly(120);
      ZB3PjoinEnabled = true;
    } else {
      Flux.actions.gatewayPermitJoining(120);
      pjoinEnabled = true;
    }
    // Progress display stuff
    this.setState({
      addingDeviceProgress: 120,
      addingDevice: true,
      isZB3PjoinInProgress: ZB3PjoinEnabled,
      isPjoinInProgress: pjoinEnabled
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
            if (this.state.isPjoinInProgress ||
                this.state.isZB3PjoinInProgress) {
              Flux.actions.gatewayPermitJoiningOff();
            }
            this.setState({
              addingDevice: false,
              isPjoinInProgress: false,
              isZB3PjoinInProgress: false
            });
          }
        }.bind(this), 1000);
      }.bind(this);
      waitForNextSecond();
    }
  }

  onDisablePjoin() {
    if (this.state.isZB3PjoinInProgress) {
      Flux.actions.gatewayPermitJoiningOffZB3();
    } else if (this.state.isPjoinInProgress) {
      Flux.actions.gatewayPermitJoiningOff();
    }
    this.setState({
      addingDeviceProgress: 0,
      addingDevice: false,
      isPjoinInProgress: false,
      isZB3PjoinInProgress: false
    });
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

  validateDeviceEui(deviceEui) {
    if (deviceEui
      && (deviceEui.length === 16
      || deviceEui === '*')){
      return true;
    } else {
      return false;
    }
  }

  validateInstallCode(installCode) {
    if (installCode
      && (installCode.length === 32
      || installCode.length === 24
      || installCode.length === 16
      || installCode.length === 12)) {
        return true;
    } else {
      return false;
    }
  }

  validateZB3Keys(deviceEui, installCode) {
    return this.validateDeviceEui(deviceEui) && this.validateInstallCode(installCode);
  }

  isZB3KeysEmpty(deviceEui, installCode) {
    return (!deviceEui || 0 === deviceEui.trim().length)
        && (!installCode || 0 === installCode.trim().length);
  }

  setDeviceEui(e) {
    var str = e.target.value.trim();

    if (str === '*') {
      this.setState({deviceEui: Constants.DEVICE_EUI_WILDCARD});
    } else if (str !== '*') {
      this.setState({deviceEui: str});
    }

    if (this.isZB3KeysEmpty(str, this.state.installCode)) {
      this.setState({ZB3KeysEmpty: true});
    } else {
      this.setState({ZB3KeysEmpty: false});
    }

    if (str !== '*' && this.validateDeviceEui(str)) {
      Flux.actions.requestInstallCodeFromServer(str);
    } else if (str === '*') {
      Flux.actions.requestInstallCodeFromServer(Constants.DEVICE_EUI_WILDCARD);
    }

    if (this.validateZB3Keys(str, this.state.installCode)) {
      this.setState({validZB3Keys: true});
    } else {
      this.setState({validZB3Keys: false});
    }
  }

  setInstallCode(e) {
    var str = e.target.value.trim();

    this.setState({installCode: str});
    if (this.isZB3KeysEmpty(this.state.deviceEui, str)) {
      this.setState({ZB3KeysEmpty: true});
    } else {
      this.setState({ZB3KeysEmpty: false});
    }

    if (this.validateZB3Keys(this.state.deviceEui, str)) {
      this.setState({validZB3Keys: true});
    } else {
      this.setState({validZB3Keys: false});
    }
  }

  onReform(channel, pan, power) {
    this.setState({
      deviceEui: '',
      installCode: '',
      ZB3KeysEmpty: true,
      validZB3Keys: false,
      installCodeOnlyForJoin: false
    });
    if (this.validateAll(channel, pan, power)) {
      if (this.state.isZB3NetworkReformSelected) {
        Flux.actions.reformZB3Network(channel, pan, power - 22);
        Flux.stores.store.setNetworkSecurityLevel('Z3');
      } else {
        Flux.actions.reformNetwork(channel, pan, power - 22);
        Flux.stores.store.setNetworkSecurityLevel('HA');
      }
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
    this.setState({
      deviceEui: '',
      installCode: '',
      ZB3KeysEmpty: true,
      validZB3Keys: false,
      installCodeOnlyForJoin: false
    });
    if (this.state.isZB3NetworkReformSelected) {
      Flux.actions.simpleReformZB3Network();
      Flux.stores.store.setNetworkSecurityLevel('Z3');
    } else {
      if (this.validateAll(this.state.channel, this.state.pan, this.state.power)) {
        Flux.actions.reformNetwork(this.state.channel, this.state.pan, this.state.power - 22);
        Flux.stores.store.setNetworkSecurityLevel('HA');
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
    Flux.stores.store.clearAllRules();
    Flux.actions.clearCloudRules();
    Flux.actions.clearRules();
  }

  onRemoveRule(rule) {
    var rulesList = Flux.stores.store.filterRulesListForDeletion(rule.from.data,
                                                                 rule.to.data);
    if (rule.from.data.supportsRelay) {
      rulesList.forEach(function(rule) {
        Flux.stores.store.deleteRule(rule);
        Flux.actions.deleteRule(rule.fromData, rule.toData);
      });
    } else {
      rulesList.forEach(function(rule) {
        Flux.stores.store.deleteCloudRule(rule);
        Flux.actions.deleteCloudRule(rule.fromData, rule.toData);
      });
    }
  }

  onCreateRule(state) {
    if (Flux.stores.store.isGroup(state.outputNode)) {
      Flux.actions.createGroupRule(state.inputNode.deviceTableIndex,
                                   state.outputNode.itemList);
    } else {
      if (!Flux.stores.store.isExistingRuleDetected(state.inputNode,
                                                    state.outputNode,
                                                    Flux.stores.store.rules) &&
          !Flux.stores.store.isExistingRuleDetected(state.inputNode,
                                                    state.outputNode,
                                                    Flux.stores.store.cloudRules)) {
        var rulesList = Flux.stores.store.filterRulesListForCreation(state.inputNode,
                                                                     state.outputNode);

        if (state.inputNode.supportsRelay) {
          rulesList.forEach(function(rule) {
            Flux.stores.store.addRule(rule.inputNodeInfoInRule, rule.outputNodeInfoInRule);
            Flux.actions.createRule(rule.inputNodeInfoInRule, rule.outputNodeInfoInRule);
          });
        } else {
          rulesList.forEach(function(rule) {
            Flux.stores.store.addCloudRule(rule.inputNodeInfoInRule, rule.outputNodeInfoInRule);
            Flux.actions.createCloudRule(rule.inputNodeInfoInRule, rule.outputNodeInfoInRule);
          });
        }
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
    Flux.actions.setDeviceToggle(node);
  }

  onDeviceOn(node) {
    Flux.actions.setDeviceOn(node);
  }

  onDeviceOff(node) {
    Flux.actions.setDeviceOff(node);
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

  toggleZB3Network() {
    this.setState({isZB3NetworkReformSelected: !this.state.isZB3NetworkReformSelected});
  }

  toggleInstallCodeOnly() {
    this.setState({installCodeOnlyForJoin: !this.state.installCodeOnlyForJoin});
  }

  getEuiAndEndpointHash(eui64, endpoint) {
    return eui64 + '-' + endpoint.toString();
  }

  _generateInputNodesList() {
    var tempNodeList = [];
    return _.chain(Flux.stores.store.getInputNodes()).map(function(node) {
      var name = Flux.stores.store.getHumanReadableNodeForRulesList(node);
      return {value: node, name: name.name, simplename: name.simplename};
    }).value().filter(node => {
      var euiAndEndpointHashKey = this.getEuiAndEndpointHash(node.value.deviceEndpoint.eui64,
                                                             node.value.deviceEndpoint.endpoint);
      var isDuplicationDetected = (tempNodeList.indexOf(euiAndEndpointHashKey) === -1) ? false : true;
      if (!isDuplicationDetected) {
        tempNodeList.push(euiAndEndpointHashKey);
      }
      return !isDuplicationDetected;
    });
  }

  _generateOutputNodesList() {
    var tempNodeList = [];
    return _.chain(Flux.stores.store.getOutputNodes()).map(function(device) {
      var name = Flux.stores.store.getHumanReadableNodeForRulesList(device);
      return {value: device, name: name.name, simplename: name.simplename};
    }).value().filter(node => {
      var euiAndEndpointHashKey = this.getEuiAndEndpointHash(node.value.deviceEndpoint.eui64,
                                                             node.value.deviceEndpoint.endpoint);
      var isDuplicationDetected = (tempNodeList.indexOf(euiAndEndpointHashKey) === -1) ? false : true;
      if (!isDuplicationDetected) {
        tempNodeList.push(euiAndEndpointHashKey);
      }
      return !isDuplicationDetected;
    });
  }

  _generateDevicesList() {
    return _.chain(Flux.stores.store.getDevices()).map(function(device) {
      var name = Flux.stores.store.getHumanReadableDevice(device);
      return {value: device, name: name.name, simplename: name.simplename};
    }).value();
  }

  render() {
    var addDeviceButtonText = this.state.addingDevice ?
      'Listening for ' + this.state.addingDeviceProgress + ' seconds' :
      (Flux.stores.store.getNetworkSecurityLevel() != 'Z3') ? 'ZigBee HA Device' :
      (this.state.installCodeOnlyForJoin &&
       !this.state.ZB3KeysEmpty &&
       this.state.validZB3Keys) ? 'ZigBee3.0 Device (Install Code Only)' :
       'ZigBee3.0 Device';

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
          onDeviceOn={this.onDeviceOn.bind(this)}
          onDeviceOff={this.onDeviceOff.bind(this)}
          bindTemp={this.bindTemp.bind(this)}/>
        <div style={{'display': 'inline-block'}}>
          Device EUI:
          <div className="ui input" style={{"width":200, 'paddingLeft':'0.8em', 'paddingRight': '0.5em'}}>
            <input
              type="text"
                value={this.state.deviceEui}
                onChange={this.setDeviceEui.bind(this)}
                disabled={Flux.stores.store.getNetworkSecurityLevel() === 'HA'}
            />
          </div>
        </div>
        <div style={{'display': 'inline-block'}}>
          Install Code:
          <div className="ui input" style={{"width":200, 'paddingLeft':'0.5em', 'paddingRight': '0.5em'}}>
            <input
              type="text"
                value={this.state.installCode}
                onChange={this.setInstallCode.bind(this)}
                disabled={Flux.stores.store.getNetworkSecurityLevel() === 'HA'}
            />
          </div>
          {!this.state.ZB3KeysEmpty ?
            <i className={(Flux.stores.store.getNetworkSecurityLevel() !== 'Z3') ? "" :
                           this.state.validZB3Keys ? "green checkmark icon" : "red remove icon"}>
            </i> : ""
          }
        </div>
        <br/>
        {!this.state.ZB3KeysEmpty && !this.state.validZB3Keys ?
          <div className="ui icon error message">
            <i className="small attention circle icon"></i>
            <div className="content">
              <p>Invalid install code or Device EUI. Please check the length of the install code, and make sure Device EUI is 16 digits.</p>
            </div>
          </div> : ""
        }
        <br/>
        <div className="ui toggle checkbox">
          <input id="Install Code only"
            checked={this.state.installCodeOnlyForJoin}
            onChange={this.toggleInstallCodeOnly.bind(this)}
            disabled={Flux.stores.store.getNetworkSecurityLevel() === 'HA' || !this.state.validZB3Keys}
            type="checkbox" name="public" />
          <label htmlFor="Install Code only">Allow Join Only With Install Code</label>
        </div>
        <br/>
        <br/>
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
            inputNodesList={this._generateInputNodesList()}
            outputNodesList={this._generateOutputNodesList()}
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
    var reformButtonText = this.state.isZB3NetworkReformSelected ? 'Reform ZigBee3.0 Network' : 'Reform ZigBee HA Network';
    if (this.state.reformbutton) {
      reformButton = (
        <div>
        <div className='ui left attached basic silabsglobal button'
          onTouchTap={this.onSimpleReform.bind(this)} >
          {reformButtonText}
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
        !this.state.networkUp ?
        'ZigBee Network: Down' : (Flux.stores.store.getNetworkSecurityLevel() == 'Z3') ?
        'ZigBee3.0 Network: Up' : 'ZigBee HA Network: Up'}
        </h4>
        <br/>
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
        <br/>
        <div className="ui toggle checkbox">
          <input id="ZB3 Security"
            checked={this.state.isZB3NetworkReformSelected}
            onChange={this.toggleZB3Network.bind(this)}
            type="checkbox" name="public" />
          <label htmlFor="ZB3 Security">ZigBee3.0 Security For Network Reform</label>
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
          <h5 className="ui right aligned header">ZigBee Gateway Version: {this.state.version}</h5>
          <h5 className="ui right aligned header">
            {this.state.gatewaysettings ? 'NCP Stack Version: ' + this.state.gatewaysettings.ncpStackVersion : 'NCP: Down'}
          </h5>
        </div>
      </div>
    );
  }
}

module.exports = ControlPanel;
