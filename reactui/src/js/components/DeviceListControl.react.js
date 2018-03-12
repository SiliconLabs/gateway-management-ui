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
    Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'temperatureValue');
  }

  requestHumidity(node) {
    Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'humidityReading');
  }

  requestOccupancy(node) {
    Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'occupancyReading');
  }

  render() {
    var item = this.props.item;
    var deviceControls;

    if (Flux.stores.store.isLight(item.data) && item.ready) {
      deviceControls = (
        <div>
          <div className="ui button basic silabsiconbuttons"
            onTouchTap={this.props.onDeviceToggle.bind(this, item)}
          >
          Toggle Light
          </div>
          <div className="ui button basic silabsiconbuttons"
            onTouchTap={this.props.onDeviceOn.bind(this, item)}
          >
          Turn On
          </div>
          <div className="ui button basic silabsiconbuttons"
            onTouchTap={this.props.onDeviceOff.bind(this, item)}
          >
          Turn Off
          </div>
          {item.data.rssiValue !== undefined &&
            <div className="ui button basic silabsiconbuttons">
              {'RSSI: ' + item.data.rssiValue + ' dbm'}
            </div>
          }
          {item.data.lqiValue !== undefined &&
            <div className="ui button basic silabsiconbuttons">
              {'LQI: ' + item.data.lqiValue}
            </div>
          }
        </div>
      );

    } else if (Flux.stores.store.isContact(item.data)) {
      var color = item.data.tamperState === undefined ? '' :
                  item.data.tamperState === 0 ? 'positive' : 'negative';

      deviceControls = (
        <div>
          <div className='ui button basic silabsiconbuttons'>
            {item.data.contactState === undefined ? 'Loading..' :
            item.data.contactState === 0 ? 'Closed' : 'Open'}
          </div>
          {item.data.tamperState !== undefined &&
            <div className={'ui button basic silabsiconbuttons ' + color} >
              {item.data.tamperState === 0 ? 'Alarm Enabled' : 'Alarm Triggered'}
            </div>
          }
          {item.data.temperatureValue !== undefined &&
            <div className="ui button basic silabsiconbuttons"
              onTouchTap={this.requestTemp.bind(this, item)}>
              {item.data.temperatureValue + ' °F'}
            </div>
          }
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
            onTouchTap={this.props.onDeviceOn.bind(this, item)}
          >
          Turn On
          </div>
          <div className="ui button basic silabsiconbuttons"
            onTouchTap={this.props.onDeviceOff.bind(this, item)}
          >
          Turn Off
          </div>
          {item.data.temperatureValue !== undefined &&
            <div className="ui button basic silabsiconbuttons"
              onTouchTap={this.requestTemp.bind(this, item)}>
              {item.data.temperatureValue + ' °F'}
            </div>
          }
          {item.data.humidityReading !== undefined &&
            <div className="ui button basic silabsiconbuttons"
              onTouchTap={this.requestHumidity.bind(this, item)}>
              {item.data.humidityReading + ' %'}
            </div>
          }
          {item.data.rssiValue !== undefined &&
            <div className="ui button basic silabsiconbuttons">
              {'RSSI: ' + item.data.rssiValue + ' dbm'}
            </div>
          }
          {item.data.lqiValue !== undefined &&
            <div className="ui button basic silabsiconbuttons">
              {'LQI: ' + item.data.lqiValue}
            </div>
          }
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
          {item.data.temperatureValue !== undefined &&
            <div className="ui button basic silabsiconbuttons"
              onTouchTap={this.requestTemp.bind(this, item)}>
              {item.data.temperatureValue + ' °F'}
            </div>
          }
          {item.data.humidityReading !== undefined &&
            <div className="ui button basic silabsiconbuttons"
              onTouchTap={this.requestHumidity.bind(this, item)}>
              {item.data.humidityReading + ' %'}
            </div>
          }
        </div>
      );

    } else if (Flux.stores.store.isMultiSensor(item.data)) {
      deviceControls = (
        <div>
          {item.data.temperatureValue !== undefined &&
            <div className="ui button basic silabsiconbuttons"
              onTouchTap={this.requestTemp.bind(this, item)}>
              {item.data.temperatureValue + ' °F'}
            </div>
          }
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
  }
}

DeviceListControl.propTypes = {
  item: React.PropTypes.object.isRequired,
  onRemove: React.PropTypes.func,
  onDeviceToggle: React.PropTypes.func,
  onDeviceOn: React.PropTypes.func,
  onDeviceOff: React.PropTypes.func,
  bindTemp: React.PropTypes.func
};

module.exports = DeviceListControl;
