/**
 * @jsx React.DOM
 */

var Config = require('../Config');
var Flux = require('../Flux');
var React = require('react');
var ActivityItem = require('./ActivityItem.react');

class Home extends React.Component {

	constructor(props) {
		super(props);
    this.state = {
      displayName: "Home",
    }
	}

  componentDidMount() {
    Flux.stores.store.getBuildInfo(function(info) {
      this.setState({
        version: info.version
      });
      this.forceUpdate();
    }.bind(this));

    Flux.stores.store.on('change', function() {
      this.forceUpdate();
    }.bind(this));
  }

  componentWillUnmount() {
    Flux.stores.store.removeListener('change')
  }

	render() {
    var itemlist = Flux.stores.store.getHumanReadableDevices();
    var items = _.map(itemlist, function(item) {
      return (
         <ActivityItem item={item} key={item.name}/>
      );
    }, this);

    var meta;
    if(items.length == 0){
      meta = (
        <h4>There are no connected devices.</h4>
      )
    } else {
      meta = (
        <div className="ui stackable three column grid">
          {items}
        </div>
      )
    }

		return (
      <div className="ui segment control-panel" style={{margin: '0rem', borderRadius: '0rem'}}>
        {meta}
        <div className="ui divider"></div>

        <div className="footer">
          <h5 className="ui right aligned header">ZigBee Gateway Version: {this.state.version}</h5>
        </div>
      </div>
		);
	}
}

module.exports = Home;
