/**
 * @jsx React.DOM
 */

var Flux  = require('../Flux');
var React = require('react');
var Constants = require('../Constants');

class DeviceListControl extends React.Component {

  constructor(props) {
    super(props);
    
    this.state = {
      displayName: 'DeviceListControl',
    };
  }

  requestTemp(node) {
    Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'temperature');
  }

  requestOccupancy(node) {
    Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'occupancyReading');
  }

  render() {
    var items = _.map(this.props.items, (item) => {
      var deviceControls; 

      if (Flux.stores.store.isLight(item.data) && item.ready) {
        deviceControls = (
          <div className="ui button basic silabsiconbuttons"
            onTouchTap={this.props.onDeviceToggle.bind(this, item)}
          >
          Toggle Light
          </div>
        );

      } else if (Flux.stores.store.isContact(item.data)) {
        var color = item.data.tamperState === undefined ? '' : item.data.tamperState === 0 ? '' : 'negative';

        deviceControls = (
          <div>
            <div className='ui button basic silabsiconbuttons'>
              {item.data.contactState === undefined ? 'Loading..' :
              item.data.contactState === 0 ? 'Closed' : 'Open'}
            </div>
            <div className={'ui button basic silabsiconbuttons ' + color} >
              {item.data.tamperState === undefined ? 'Loading..' : 
              item.data.tamperState === 0 ? 'Alarm Enabled' : 'Alarm Triggered'}
            </div>
            <div className="ui button basic silabsiconbuttons"
              onTouchTap={this.props.bindTemp.bind(this, item)}
            >
            {(item.data.temperatureValue === undefined) ? 'Loading..' :
              item.data.temperatureValue + ' °F'}
            </div>
          </div>
        );
      } else if (Flux.stores.store.isSmartPlug(item.data)) {
        deviceControls = (
          <div>
            <div style={{display: item.ready ? 'inline' : 'none' }} className="ui button basic silabsiconbuttons"
              onTouchTap={this.props.onDeviceToggle.bind(this, item)}
            >
            Toggle Power
            </div>
            <div className="ui button basic silabsiconbuttons"
              onTouchTap={this.requestTemp.bind(this, item)}>
              {(item.data.temperatureValue === undefined) ? 'Loading..' :
                item.data.temperatureValue + ' °F'}
            </div>
          </div>
        );

      } else if (Flux.stores.store.isOccupancy(item.data)) {
        deviceControls = (
          <div>
            <div className="ui button basic silabsiconbuttons"
              onTouchTap={this.requestOccupancy.bind(this, item)}>
              {item.data.occupancyReading === undefined ? 'Loading..' : 
              item.data.occupancyReading === 1 ? 'Occupied' : 'Not Occupied'}
            </div>
            <div className="ui button basic silabsiconbuttons"
              onTouchTap={this.requestTemp.bind(this, item)}>
              {(item.data.temperatureValue === undefined) ? 'Loading..' :
                item.data.temperatureValue + ' °F'
              }
            </div>
          </div>
        );

      } else if (Flux.stores.store.isTemp(item.data)) {
        deviceControls = (
          <div className="ui button basic silabsiconbuttons"
            onTouchTap={this.props.bindTemp.bind(this, item)}
          >
          {(item.data.temperatureValue === undefined) ? 'Loading..' :
            item.data.temperatureValue + ' °F'}
          </div>
        );
      } else if (Flux.stores.store.isGroup(item.data)) {
        deviceControls = (
          <div className="ui button basic silabsiconbuttons"
            onTouchTap={this.props.onDeviceToggle.bind(this, item)}
          >
          Toggle All
          </div>
        );
      }

      return (
        <div className="item">
          <img className="ui tiny image" 
            style={{ width: '60px' }}
            src={item.image} />
          <div className="content" style={{ paddingRight: '2.5em' }}>
            <a className="header">{item.name}</a>
            <div className="description">
              {item.description ? item.description : ''}
            </div>
            {deviceControls}
            <a href="#" 
              onTouchTap={this.props.onRemove.bind(this, item)}
            >
            <i className="remove icon remove-item"></i>
            </a>
          </div>
        </div>
      );
    }); 

    return (
      <div className="ui segment">
        <div className="ui divided list device-list">
          {items}
        </div>
      </div>
    );
  }
}

DeviceListControl.propTypes = {
  items: React.PropTypes.array.isRequired,
  onRemove: React.PropTypes.func,
  onDeviceToggle: React.PropTypes.func,
  bindTemp: React.PropTypes.func
};

module.exports = DeviceListControl;
