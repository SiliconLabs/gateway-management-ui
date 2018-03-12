/**
 * @jsx React.DOM
 */

var React = require('react');
var Flux = require('../Flux');
var Constants = require('../Constants');

class Testing extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      cmdPointer: 0,
      period: '50',
      interations: '50',
      deviceTableIndex: -1,
      currentTab: 'gateway',
      cli: '',
      lights: this._generateLightsList(),
      status: '',
      did: '',
      dtype: '',
      trafficReporting: Flux.stores.store.gatewaysettings.trafficReporting,
      logStreaming: Flux.stores.store.serversettings.logStreaming,
      cliTerminal: Flux.stores.store.serversettings.cliTerminal,
      displayName: 'Testing',
      testing: Flux.stores.store.serversettings.customerTesting,
    };
  }

  selectTab(tab) {
    this.setState({ currentTab: tab });
    this.scollToBottom();
    this.forceUpdate();
  }

  handleClick(tab) {
    this.selectTab(tab);
  }

  componentDidMount() {
    Flux.stores.store.getBuildInfo(function(info) {
      this.setState({
        version: info.version
      });
      this.forceUpdate();
    }.bind(this));

    Flux.stores.store.on('change', function() {
      if (Flux.stores.store.serversettings.logStreaming) {
        this.scollToBottom();
      }
      this.setState({ lights: this._generateLightsList(),
        trafficReporting: Flux.stores.store.gatewaysettings.trafficReporting,
        logStreaming: Flux.stores.store.serversettings.logStreaming,
        testing: Flux.stores.store.serversettings.customerTesting
      });
    }.bind(this));
  }

  componentWillUnmount() {
    Flux.stores.store.removeListener('change')
  }

  setPeriod(e) {
    this.setState({period: e.target.value});
  }

  setIterations(e) {
    this.setState({interations: e.target.value});
  }

  onTest() {
    if (this.state.deviceTableIndex !== -1 && parseInt(this.state.period) <= 5000 && parseInt(this.state.period) >= 1
      && parseInt(this.state.interations) <= 110 && parseInt(this.state.interations) >= 1) {
        this.setState({ testing: true })
        Flux.actions.testNetwork(this.state.deviceTableIndex, parseInt(this.state.period), parseInt(this.state.interations), this.state.did, this.state.dtype);
    } else {
      this.setState({ status: "Please check your inputs" });
      window.setTimeout(function() {
        this.setState({ status: '' });
      }.bind(this), 4000);
    }
  }

  onLightSelect(light) {
    this.setState({
      deviceTableIndex: light.deviceTableIndex,
      did: light.nodeId,
      dtype: light.deviceType
    });
  }

  refreshTestLog() {
    Flux.actions.requestTestLog();
    this.scollToBottom();
  }

  refreshServerLog() {
    Flux.actions.requestServerLog();
    this.scollToBottom();
  }

  refreshGatewayLog() {
    Flux.actions.requestGatewayLog();
    this.scollToBottom();
  }

  setStreaming(value) {
    Flux.actions.setWebserverAttribute('logStreaming', value);
    this.scollToBottom();
  }

  toggleLogging() {
    if(this.state.trafficReporting) {
      Flux.actions.setGatewayAttribute('trafficReporting', false);
    } else {
      Flux.actions.setGatewayAttribute('trafficReporting', true);
    }
    this.setState({trafficReporting: !this.state.trafficReporting});
  }

  toggleStreaming() {
    if(this.state.logStreaming) {
      Flux.actions.setWebserverAttribute('logStreaming', false);
    } else {
      Flux.actions.setWebserverAttribute('logStreaming', true);
    }
    this.setState({logStreaming: !this.state.logStreaming});
  }

  toggleCliTernimal() {
    if(this.state.cliTerminal) {
      Flux.actions.disableCliTerminal();
    } else {
      Flux.actions.enableCliTerminal();
    }
    this.setState({cliTerminal: !this.state.cliTerminal});
  }

  getCliCommandsFilePath(e) {
    Flux.actions.sendCommandsScriptName(e.target.files[0].name);
  }

  resetFilePathValue(e) {
    e.target.value = null;
  }

  _generateLightsList() {
    var lights = Flux.stores.store.getLights();

    lights =  _.filter(lights, function(group) {
      var deviceType = group.deviceType;
      return !(deviceType === 'group');
    });

    return _.chain(lights).map(function(device) {
      var name = Flux.stores.store.getHumanReadableDevice(device);
      return {value: device, name: name.name, simplename: name.simplename};
    }).value();
  }

  scollToBottom() {
    var height = document.getElementById("scrollbox").scrollHeight;
    var howTall = document.getElementById("scrollbox").style.height;
    var bottom = (parseInt(height, 10) - parseInt(howTall, 10)).toString();
    document.getElementById("scrollbox").scrollTop = bottom;
  }

  sendMessage(message) {
    if (message) {
      Flux.actions.setWebserverAttribute('logStreaming', true);
      Flux.actions.sendCommands([{commandcli: message}]);
      this.changeCmdHistory(message);
      this.setState({logStreaming: true, cmdPointer: 0, cli: ''});
    };
  }

  rotateBuffer(n, cmdPointer, bufferSize) {
    if(bufferSize === 0) return 0;
    return (bufferSize + (cmdPointer + n) % bufferSize) % bufferSize;
  }

  rotateCmdHistory(n) {
    var cmdHistory = Flux.stores.store.getCmdHistory();
    if(cmdHistory.size() === 0) return;
    var cmdPointer = this.rotateBuffer(n,
                                       this.state.cmdPointer,
                                       cmdHistory.size());
    var inputText = cmdHistory.get(cmdPointer);
    this.setState({cmdPointer: cmdPointer, cli: inputText});
  }

  changeCmdHistory(command) {
    if(command === '') return;
    var cmdHistory = Flux.stores.store.getCmdHistory();
    if(command !== cmdHistory.get(0)) {
      Flux.stores.store.insertCmdHistory(command);
    }
  }

  previousHistoryCmd() {
    this.rotateCmdHistory(1);
  }

  nextHistoryCmd() {
    this.rotateCmdHistory(-1);
  }

  handleChange(e) {
    this.setState({cli: e.target.value.toString()});
  }

  handleKeyDown(e) {
    if (e.nativeEvent.keyCode == 13) {
      // return key.
      this.sendMessage(e.target.value.toString());
    } else if(e.nativeEvent.keyCode == 38) {
      // up key.
      this.previousHistoryCmd();
    } else if(e.nativeEvent.keyCode == 40) {
      // down key.
      this.nextHistoryCmd();
    }
  }

  handleEmpty() {}

  render() {
    var inputLabel = "Cli Command >";
    var tabmenu = (
      <div className="ui tabular menu">
        <a className={this.state.currentTab == 'server' ? 'active item' : 'item'}
          onTouchTap={this.handleClick.bind(this,'server')}>
            Server Log
        </a>
        <a className={this.state.currentTab == 'gateway' ? 'active item' : 'item'}
          onTouchTap={this.handleClick.bind(this,'gateway')}>
            Gateway Log
        </a>
      </div>
    );

    var log;
    var meta;

    if (this.state.currentTab == 'server') {
      log = Flux.stores.store.serverLog;
    } else if (this.state.currentTab == 'gateway') {
      log = Flux.stores.store.gatewayLog;
      meta = (
        <div className="ui labeled input" style={{width: '100%'}}>
          <div className="ui label">{inputLabel}</div>
          <input type="text"
            placeholder="e.g., info"
            value={this.state.cli}
            onKeyDown={this.handleKeyDown.bind(this)}
            onChange={this.handleChange.bind(this)}
            style={{width: '100%'}}
          />
        </div>
      )
    }

    return (
      <div className="ui segment control-panel" style={{margin: '0rem', borderRadius: '0rem'}}>
        <div className="header">
      <img className="logo" src="assets/silicon-labs-logo.png" />
      <h3 className="title">Diagnostics</h3>
      </div>
      <div className="ui divider"></div>

      <h3 className="title">Logs</h3>
      <div className="ui divider"></div>
        {tabmenu}
      <div id="scrollbox" className="ui secondary segment" style={{"height":500 , "overflow": "auto"}}>
        <pre className="logoutput">
          {log}
        </pre>
      </div>
      {meta}
      <br/>
      <br/>
      <div className="ui toggle checkbox"
        onChange={this.toggleStreaming.bind(this)}
      >
      <input id="streaming"
        checked={this.state.logStreaming}
        disabled={this.state.testing}
        onChange={this.handleEmpty.bind(this)}
        type="checkbox" name="public" />
      <label htmlFor="streaming">Console Log Streaming</label>
      </div>
      <br/>
      <br/>
      <div>Select a CLI-commands script:</div>
      <div>
        <input name="commandsFile"
               type="file"
               onChange={this.getCliCommandsFilePath.bind(this)}
               onClick={this.resetFilePathValue.bind(this)}/>
      </div>

      <div className="ui divider"></div>

      <div className="footer">
        <h5 className="ui right aligned header">ZigBee Gateway Version: {this.state.version}</h5>
      </div>
      </div>
    );
  }
}

module.exports = Testing;
