var Flux = require('../Flux');
var Constants = require('../Constants');
var React = require('react');
var Slider = require('./Slider.react');
var ExtendedInfo = require('./ExtendedInfo.react');
var ExtendedInfoGroup = require('./ExtendedInfoGroup.react');
var ColorPickerElement = require('./ColorPickerElement.react');


class ActivityItem extends React.Component {

    constructor(props) {
      super(props);
      this.state = {
        showExtendedInfo: false,
        waiting: false,
        displayName: 'ActivityItem',
      };
    }

    showExtended(node) {
      this.setState({ showExtendedInfo: true });
      if (!(node.data.deviceType === 'group')) {
        if (!node.data.hasOwnProperty('imageTypeId')) {
          Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'imageTypeId');
        }
        if (!node.data.hasOwnProperty('firmwareVersion')) {
          Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'firmwareVersion');
        }
        if (!node.data.hasOwnProperty('manufacturerId')) {
          Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'manufacturerId');
        }
      }
    }

    hideExtended() {
      this.setState({ showExtendedInfo: false });
    }

    onLightOn(node) {
      Flux.actions.setLightOn(node);
    }

    onLightOff(node) {
      Flux.actions.setLightOff(node);
    }

    cancelUpdate() {
      Flux.actions.otaClearDirectory();
      this.setState({ waiting: false });
    }

    copyImage(otaitem, item) {
      Flux.actions.setWebserverAttribute('logStreaming', false);
      Flux.actions.otaCopyFile(otaitem);

      if (parseInt(otaitem.firmwareVersion, 16) > parseInt(item.data.firmwareVersion, 16)) {
        Flux.actions.gatewayUpgradePolicy(true);
      } else if (parseInt(otaitem.firmwareVersion, 16) < parseInt(item.data.firmwareVersion, 16)) {
        Flux.actions.gatewayUpgradePolicy(false);
      }

      Flux.actions.gatewayNotify(otaitem, item);

      this.setState({ waiting: true });
      window.setTimeout(function() {
        this.setState({ waiting: false });
      }.bind(this), Constants.OTA_WAITING_TIMEOUT);
    }

    requestTemp(node) {
      Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'temperature');
    }

    requestOccupancy(node) {
      Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'occupancyReading');
    }

    render() {
      var item = this.props.item;

      var extendedLightPanel;
      var basicPanel;
      var sensorInfo;
      var extendedInfo;
      var otaupdatemeta;

      if (item.data.otaUpdating) {
        otaupdatemeta = (
          <div className="ui segment control-panel">
          <h4> Uploading Firmware Version: 0x{item.data.otaTargetFirmwareVersion} </h4>
            <div className="ui basic demo progress active" data-percent="100">
              <div className="bar" style={{WebkitTransitionDuration: '300ms', transitionDuration: '300ms', width: item.data.otaUpdatePercent.toFixed(0)+'%'}}>
                <div className="progress" />
              </div>
              <div className="label">{item.data.otaUpdatePercent.toFixed(0)}% Complete</div>
            </div>
            <div className="ui button basic silabsglobal"
              onTouchTap={this.cancelUpdate.bind(this)}>
              Cancel Upload
            </div>
          </div>
        );
      } else if (this.state.waiting) {
        otaupdatemeta = (
          <div className="ui segment control-panel">
            <h4> Please wait.. starting upload or 
            another upload is in progress </h4>
            <div className="ui button basic silabsglobal"
              onTouchTap={this.cancelUpdate.bind(this)}>
              Cancel Upload
            </div>
          </div>
        );
      } else {
        otaupdatemeta = '';
      }

      if (Flux.stores.store.isLight(item.data)) {
        basicPanel = (
          <div>
            <Slider sliderType="Brightness" item={item}
              setTemp = {Flux.actions.setLightTemp}
              setLevel = {Flux.actions.setLightLevel}
            />
            <div className="ui button basic silabsglobal"
              onTouchTap={this.onLightOn.bind(this, item)}>
              On
            </div>
            <div className="ui button basic silabsglobal"
              onTouchTap={this.onLightOff.bind(this, item)}>
              Off
            </div>
          </div>
        );
      } else if (Flux.stores.store.isContact(item.data)) {
        var color = item.data.tamperState === undefined ? '' : item.data.tamperState === 0 ? '' : 'negative';

        basicPanel = (
          <div>
            <div className='ui button basic silabsiconbuttons '>
              {item.data.contactState === undefined ? 'Loading..' :
              item.data.contactState === 0 ? 'Closed' : 'Open'}
            </div>
            <div className={'ui button basic silabsiconbuttons ' + color} >
              {item.data.tamperState === undefined ? 'Loading..' : 
              item.data.tamperState === 0 ? 'Alarm Enabled' : 'Alarm Triggered'}
            </div>
            <div className="ui button basic silabsiconbuttons">
              {(item.data.temperatureValue === undefined) ? 'Loading..' :
                item.data.temperatureValue + ' °F'}
            </div>
          </div>
        );

      } else if (Flux.stores.store.isOccupancy(item.data)) {
        basicPanel = (
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

        sensorInfo = (
          <div className="ui segment control-panel">
            <h4>Occupancy Sensor Information</h4>
            <div className="ui celled list">
              <div className="item">
                  <h5 className="ui left floated header">
                  Occupancy:
                  </h5>
                  <div className="ui right floated">
                  {item.data.occupancyReading === undefined ? 'Loading..' : 
                  item.data.occupancyReading === 1 ? 'Occupied' : 'Not Occupied'}
                  </div>
              </div>
              <div className="item">
                  <h5 className="ui left floated header">
                  Lux:
                  </h5>
                  <div className="ui right floated">
                  {(item.data.luxReading === undefined) ? 'Loading..' :
                  item.data.luxReading + ' Lux'}
                  </div>
              </div>
              <div className="item">
                  <h5 className="ui left floated header">
                  Relative Humidity: 
                  </h5>
                  <div className="ui right floated">
                  {(item.data.humidityReading === undefined) ? 'Loading..' :
                  item.data.humidityReading + ' %'}
                  </div>
              </div>
              <div className="item">
                  <h5 className="ui left floated header">
                  Temperature:
                  </h5>
                  <div className="ui right floated">
                  {(item.data.temperatureValue === undefined) ? 'Loading..' :
                  item.data.temperatureValue + ' °F'}
                  </div>
              </div>
            </div>
          </div>
        );

      } else if (Flux.stores.store.isTemp(item.data)) {
        basicPanel = (
          <div className="ui button basic silabsiconbuttons">
            {(item.data.temperatureValue === undefined) ? 'Waiting..' :
              item.data.temperatureValue + ' °F'}
          </div>
        );

      } else if (Flux.stores.store.isSmartPlug(item.data)) {
        sensorInfo = (
          <div className="ui segment control-panel">
            <h4>Device Sensor Data</h4>
            <div className="ui celled list">
              <div className="item">
                  <h5 className="ui left floated header">
                  Power Used: 
                  </h5>
                  <div className="ui right floated">
                  {(item.data.powersumValue === undefined) ? 'Loading..' :
                  item.data.powersumValue + ' kWh'}
                  </div>
              </div>
              <div className="item">
                  <h5 className="ui left floated header">
                  Lux:
                  </h5>
                  <div className="ui right floated">
                  {(item.data.luxReading === undefined) ? 'Loading..' :
                  item.data.luxReading + ' Lux'}
                  </div>
              </div>
              <div className="item">
                  <h5 className="ui left floated header">
                  Relative Humidity: 
                  </h5>
                  <div className="ui right floated">
                  {(item.data.humidityReading === undefined) ? 'Loading..' :
                  item.data.humidityReading + ' %'}
                  </div>
              </div>
              <div className="item">
                  <h5 className="ui left floated header">
                  Temperature:
                  </h5>
                  <div className="ui right floated">
                  {(item.data.temperatureValue === undefined) ? 'Loading..' :
                  item.data.temperatureValue + ' °F'}
                  </div>
              </div>
              <div className="item">
                  <h5 className="ui left floated header">
                  RMS Voltage:
                  </h5>
                  <div className="ui right floated">
                  {(item.data.temperatureValue === undefined) ? 'Loading..' :
                  item.data.rmsVoltage + ' V'}
                  </div>
              </div>
              <div className="item">
                  <h5 className="ui left floated header">
                  RMS Current:
                  </h5>
                  <div className="ui right floated">
                  {(item.data.temperatureValue === undefined) ? 'Loading..' :
                  item.data.rmsCurrent + ' mA'}
                  </div>
              </div>
              <div className="item">
                  <h5 className="ui left floated header">
                  Active Power:
                  </h5>
                  <div className="ui right floated">
                  {(item.data.temperatureValue === undefined) ? 'Loading..' :
                  item.data.activePower + ' W'}
                  </div>
              </div>
            </div>
          </div>
        );

        basicPanel = (
          <div>
            <div className="ui button basic silabsglobal"
              onTouchTap={this.onLightOn.bind(this, item)}>
              On
            </div>
            <div className="ui button basic silabsglobal"
              onTouchTap={this.onLightOff.bind(this, item)}>
              Off
            </div>
          </div>
        );

      } else if (Flux.stores.store.isGroup(item.data)) {
        basicPanel = (
          <div>
            <Slider sliderType="Brightness" item={item}
              setTemp = {Flux.actions.setLightTemp}
              setLevel = {Flux.actions.setLightLevel}
            />
            <div className="ui button basic silabsglobal"
              onTouchTap={Flux.actions.setLightOn.bind(this, item)}>
              On
            </div>
            <div className="ui button basic silabsglobal"
              onTouchTap={Flux.actions.setLightOff.bind(this, item)}>
              Off
            </div>
          </div>
        );
      }

      if (parseInt(item.data.deviceType) === Constants.DEVICE_ID_COLOR_TEMPERATURE_LIGHT) {
        extendedLightPanel = (
              <div className="center aligned column">
              <div className="center aligned ui divider"></div>
              <div className="ui form segment">
                <Slider sliderType="Warmth" item={item}
                  setTemp = {Flux.actions.setLightTemp}
                  setLevel = {Flux.actions.setLightLevel}
                />
              </div>
            </div>
        );
      } else if (parseInt(item.data.deviceType) === Constants.DEVICE_ID_EXTENDED_COLOR_LIGHT 
      || parseInt(item.data.deviceType) === Constants.DEVICE_ID_COLOR_DIMMABLE_LIGHT) {
        extendedLightPanel = (
              <div className="center aligned column">
              <div className="center aligned ui divider"></div>
              <div className="ui form segment">
                <Slider sliderType="Warmth" item={item}
                  setTemp = {Flux.actions.setLightTemp}
                  setLevel = {Flux.actions.setLightLevel}
                />
                <div className="center aligned ui divider"></div>
                <ColorPickerElement item={item}
                  setColor = {Flux.actions.setLightColor}
                />
              </div>
            </div>
        );
      } else if (Flux.stores.store.isGroup(item.data)) {
        extendedLightPanel = (
              <div className="center aligned column">
              <div className="center aligned ui divider"></div>
              <div className="ui form segment">
                <Slider sliderType="Warmth" item={item}
                  setTemp = {Flux.actions.setLightTemp}
                  setLevel = {Flux.actions.setLightLevel}
                />
              <div className="center aligned ui divider"></div>
                <ColorPickerElement item={item}
                  setColor = {Flux.actions.setLightColor}
                />
              </div>
            </div>
        );
      }

      var matches = 0;
      var otaList = _.map(Flux.stores.store.getOTAList(), function(otaitem) {
        // Check if item fields are defined
        if (item.data.imageTypeId !== undefined && item.data.firmwareVersion !== undefined && 
          item.data.imageTypeId !== null && item.data.firmwareVersion !== null) {
          if (parseInt(otaitem.imageTypeId, 16) === parseInt(item.data.imageTypeId, 16) 
            && parseInt(otaitem.firmwareVersion, 16) !== parseInt(item.data.firmwareVersion, 16)) {
            matches++;
            return (
              <div className="ui segment control-panel">
                <div className="list">
                  <div className="item"><h4>{otaitem.filename}</h4></div>
                  <div className="item">Manf. ID: {otaitem.manufacturerId}</div>
                  <div className="item">Image Type: {otaitem.imageTypeId}</div>
                  <div className="item">Firmware Version: {otaitem.firmwareVersion}</div>
                  <div className="item">Size: {otaitem.imageSizeKB}KB</div>
                </div>
                <div className="ui button basic silabsglobal"
                  onTouchTap={this.copyImage.bind(this, otaitem, item)}>
                  Load Item {parseInt(otaitem.firmwareVersion, 16) > parseInt(item.data.firmwareVersion, 16) ? "(Upgrade)" : "(Downgrade)"}
                </div>
              </div>
            );
          }
        }
      }.bind(this));

      if (matches === 0) {
        otaList = (
          <div className="ui segment control-panel">
            <div className="list">
              <h4>No Images Found. Please place compatible OTA images in ota_staging directory. </h4>
            </div>
          </div>
        );
      }

      if (item.data.deviceType === "group") {
        otaList = '';
      }

      if (this.state.showExtendedInfo) {
        extendedInfo = (
          <div className="center aligned column">
          <div className="center aligned ui divider"></div>
          <div className="ui button basic silabsglobal" onTouchTap={this.hideExtended.bind(this, item)}>Hide Extended Info</div>

            {item.data.deviceType === "group" ? <ExtendedInfoGroup item={item}/> : <ExtendedInfo item={item}/>}

            {!(item.data.deviceType === "group") ? <h4>Available OTA Images</h4> : "" }
            <div className="center aligned ui divider"></div>

            {item.data.otaUpdating || this.state.waiting && !(item.data.deviceType === "group") ? otaupdatemeta : otaList}
          </div>
        );
      } else {
        extendedInfo = (
          <div>
            <div className="center aligned ui divider"></div>
            <div className="ui button basic silabsglobal" onTouchTap={this.showExtended.bind(this, item)}>Show Extended Info</div>
          </div>
        );
      }

      return (
        <div className="column">
            <div className="center aligned column">
              <div className="ui form segment">
                  <img className="ui centered tiny image" 
                    src={item.image} />
                  <div className="content">
                    <h4>{item.name}</h4>
                    <div className="description">
                      {item.description ? item.description + ' Control Panel' : ''}
                    </div>
                  </div>
                  <div style={{display: item.ready ? 'block' : 'none' }}>
                    <div className="center aligned ui divider"/>
                      {basicPanel}
                      {extendedLightPanel}
                      {sensorInfo}
                      {extendedInfo}
                    </div>
                  </div>
            </div>
          </div>
        );
    }
}

ActivityItem.propTypes = {
  item: React.PropTypes.object.isRequired,
};

module.exports = ActivityItem;
