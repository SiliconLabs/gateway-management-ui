/**
 * @jsx React.DOM
 */

var ControlPanel = require('./ControlPanel.react');
var Config = require('../Config');
var Home = require('./Home.react');
var Diagnostics = require('./Diagnostics.react');
var About = require('./About.react');
var Flux = require('../Flux');
var React = require('react');
var cookie = require('react-cookie');

class Application extends React.Component {
  constructor(props) {
    super(props);

    var tab;
    try {
      tab = cookie.load('selectedMenu');
    } catch (e) {
    }

    if (tab === undefined) {
      tab = 'setup';
    }

    this.state = {
      selectedMenu: tab,
      displayName: 'Application',
    };
  }

  componentDidMount() {
    Flux.actions.connect(Config.gatewayAddress, function(){
      console.log('Connected to SocketIO');
      Flux.actions.getGatewayState();
      Flux.actions.getWebserverState();
      Flux.actions.getOtaFiles();
    });
  }

  selectTab(tab) {
    Flux.actions.getGatewayState();
    Flux.actions.getWebserverState();
    if (Flux.stores.store.closeAddingDeviceIfExpired()) {
      Flux.actions.gatewayPermitJoiningOffZB3();
    }
    cookie.save('selectedMenu', tab);
    this.setState({
      selectedMenu: tab
    });
  }

  handleClick(tab) {
    this.selectTab(tab);
  }

  _generateLightsList() {
    return _.chain(Flux.stores.store.getLights()).map(function(device) {
      var name = Flux.stores.store.getHumanReadableDevice(device);
      return {value: device, name: name.name};
    }).value();
  }

  render() {
    var menu = (
      <div className="ui menu" style={{margin: '0rem', borderRadius: '0rem'}}>
        <a className={this.state.selectedMenu === 'home' ? 'active item' : 'item'}
          onTouchTap={this.handleClick.bind(this, 'home')}>
          <i className="home icon"></i> Home
        </a>
        <a className={this.state.selectedMenu === 'setup' ? 'active item' : 'item'}
          onTouchTap={this.handleClick.bind(this, 'setup')}>
          <i className="setting icon"></i> Setup
        </a>
        <a className={this.state.selectedMenu === 'diagnostics' ? 'active item' : 'item'}
          onTouchTap={this.handleClick.bind(this, 'diagnostics')}>
          <i className="search text icon"></i> Diagnostics
        </a>
        <a className={this.state.selectedMenu === 'about' ? 'active item' : 'item'}
          onTouchTap={this.handleClick.bind(this, 'about')}>
          <i className="info circle icon"></i> About
        </a>
      </div>
    );

    var content;

    if (this.state.selectedMenu === 'setup') {
      content = <ControlPanel />;
    } else if (this.state.selectedMenu === 'home') {
      content = <Home />;
    } else if (this.state.selectedMenu === 'about') {
      content = <About />;
    } else if (this.state.selectedMenu === 'diagnostics') {
      content = <Diagnostics lights={this._generateLightsList()}/>;
    }

    return (
      <div className="application">
        {menu}
        <div className="sixteen wide column">
          {content}
        </div>
      </div>
    );
  }
}

module.exports = Application;
