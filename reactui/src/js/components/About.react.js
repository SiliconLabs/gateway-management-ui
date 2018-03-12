/**
 * @jsx React.DOM
 */

var Flux = require('../Flux');
var React = require('react');
var Version = require('../Version');

class About extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ip: Flux.stores.store.ip,
      displayName: 'About',
    };
  }

  componentDidMount() {
    Flux.stores.store.getBuildInfo(function(info) {
      this.setState({
        time: info.time,
        version: info.version
      });
      this.forceUpdate();
    }.bind(this));

    Flux.stores.store.on('change', function() {
        this.setState({
          ip: Flux.stores.store.ip,
          gatewaysettings: Flux.stores.store.gatewaysettings
        });
        this.forceUpdate();
    }.bind(this));
  }

  componentWillUnmount() {
    Flux.stores.store.removeListener('change')
  }

  render() {
    return (
      <div className="ui segment control-panel" style={{margin: '0rem', borderRadius: '0rem'}}>
        <div className="header">
            <img className="logo"
              src="/assets/silicon-labs-logo.png" />
            <h3 className="title">About, Version, Contact Information</h3>
        </div>

        <div className="ui divider"></div>

        <h4><u>About</u></h4>

        <p>
          ZigBee Gateway Version: {this.state.version} {this.state.time}<br/>
          ZigBee Gateway IP: {this.state.ip} <br/>
          {this.state.gatewaysettings ? 'NCP Stack Version: ' + this.state.gatewaysettings.ncpStackVersion : ''}
        </p>

        <h4><u>Support</u></h4>
        <p>
          Visit <a href="http://www.silabs.com">Silicon Labs</a><br />
          Visit <a href="http://community.silabs.com/">Silicon Labs Community</a><br />
          Contact <a href="http://www.silabs.com/support/Pages/default.aspx">Support</a><br/>
        </p>

        <p>
          <i>Copyright &copy; 2018 Silicon Laboratories, Inc. All rights reserved.</i>
        </p>

        <div className="ui divider"></div>

        <div className="footer">
          <h5 className="ui right aligned header">ZigBee Gateway Version: {this.state.version}</h5>
        </div>
      </div>
    );
  }
}

module.exports = About;
