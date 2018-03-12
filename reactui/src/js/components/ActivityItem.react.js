var Flux = require('../Flux');
var Constants = require('../Constants');
var React = require('react');
var Slider = require('./Slider.react');
var ExtendedInfo = require('./ExtendedInfo.react');
var ExtendedInfoGroup = require('./ExtendedInfoGroup.react');
var ColorPickerElement = require('./ColorPickerElement.react');
var DeviceTuple = require('../stores/DeviceConstants').deviceTuple;


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

    onEnterIdentify(node) {
      Flux.actions.enterIdentify(node);
      Flux.stores.store.setIdentifyModeStatus(true, node);
      Flux.stores.store.triggerDelayedRender(0);
    }

    onExitIdentify(node) {
      Flux.actions.exitIdentify(node);
      Flux.stores.store.setIdentifyModeStatus(false, node);
      Flux.stores.store.triggerDelayedRender(0);
    }

    onDeviceOn(node) {
      Flux.actions.setDeviceOn(node);
    }

    onDeviceOff(node) {
      Flux.actions.setDeviceOff(node);
    }

    onCancelOta() {
      Flux.actions.otaClearDirectory();
      Flux.stores.store.resetOtaProgress();
      Flux.stores.store.stopOtaWaitingCountdown();
      Flux.stores.store.triggerDelayedRender(0);
    }

    onTriggerOta(otaitem, item) {
      var recvOtaProgress = Flux.stores.store.getOtaProgress();
      if (recvOtaProgress && recvOtaProgress.status) return;

      Flux.actions.otaCopyFile(otaitem);
      if (parseInt(otaitem.firmwareVersion, 16) > parseInt(item.data.firmwareVersion, 16)) {
        Flux.actions.gatewayUpgradePolicy(true);
        Flux.stores.store.setOtaProgress(true, 'Upgrading', item);
      } else if (parseInt(otaitem.firmwareVersion, 16) < parseInt(item.data.firmwareVersion, 16)) {
        Flux.actions.gatewayUpgradePolicy(false);
        Flux.stores.store.setOtaProgress(true, 'Downgrading', item);
      }
      Flux.actions.gatewayNotify(otaitem, item);
      Flux.stores.store.startOtaWaitingCountdown();
      Flux.stores.store.triggerDelayedRender(0);
    }

    requestTemp(node) {
      Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'temperature');
    }

    requestOccupancy(node) {
      Flux.actions.requestNodeAttribute(node.data.deviceEndpoint, 'occupancyReading');
    }

    getHumanReadableSensorType(deviceType) {
      var searchResult = '';
      DeviceTuple.forEach((deviceId) => {
        if (deviceId[parseInt(deviceType)] !== undefined) {
          searchResult = deviceId[parseInt(deviceType)];
        }
      });
      if (!searchResult) {
        searchResult = 'Unknown Type Device';
      }
      return searchResult;
    }

    isClusterSupported(supportedClusterList, clusterId) {
      var supportedValue = false;
      supportedClusterList.forEach((cluster) => {
        if (parseInt(cluster.clusterId) === clusterId &&
            cluster.clusterType === 'In') {
          supportedValue = true;
        }
      });
      return supportedValue;
    }

    checkOtaProgressItemMatch(otaProgress, item) {
      if (!otaProgress.status) return false;
      var otaProgressItem = otaProgress.item;
      if (item.data.deviceEndpoint.eui64 === otaProgressItem.data.deviceEndpoint.eui64) {
        return true;
      } else {
        return false;
      }
    }

    isDeviceItemMatchOtaFileInfo(otaitem, item) {
      if (item.data.imageTypeId !== undefined && item.data.firmwareVersion !== undefined &&
          item.data.manufacturerId !== undefined &&
          item.data.imageTypeId !== null && item.data.firmwareVersion !== null &&
          item.data.manufacturerId !== null ) {
        if (parseInt(otaitem.imageTypeId, 16) === parseInt(item.data.imageTypeId, 16) &&
            parseInt(otaitem.firmwareVersion, 16) !== parseInt(item.data.firmwareVersion, 16) &&
            parseInt(otaitem.manufacturerId, 16) === parseInt(item.data.manufacturerId, 16)) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }

    isDeviceItemMatchOtaFilesList(otaFilesList, item) {
      return _.find(otaFilesList, function(otaitem) {
        if (this.isDeviceItemMatchOtaFileInfo(otaitem, item)) {
          return item;
        }
      }, this);
    }

    render() {
      var item = this.props.item;
      var supportedCluster = item.data.supportedCluster;
      var humanReadableDeviceType = this.getHumanReadableSensorType(item.data.deviceType);
      var extendedLightPanel;
      var basicPanel;
      var sensorInfo;
      var extendedInfo;
      var identifyModeToggle;

      if (Flux.stores.store.isLight(item.data)) {
        basicPanel = (
          <div>
            <Slider sliderType="Brightness" item={item}
              setTemp = {Flux.actions.setLightTemp}
              setLevel = {Flux.actions.setLightLevel}
            />
            <div className="ui button basic silabsglobal"
              onTouchTap={this.onDeviceOn.bind(this, item)}>
              On
            </div>
            <div className="ui button basic silabsglobal"
              onTouchTap={this.onDeviceOff.bind(this, item)}>
              Off
            </div>
          </div>
        );
      } else if (Flux.stores.store.isContact(item.data)) {
        var color = item.data.tamperState === undefined ?
                    '' : item.data.tamperState === 0 ? '' : 'negative';

        basicPanel = (
          <div>
            <div className='ui button basic silabsiconbuttons '>
              {item.data.contactState === undefined ? 'Loading..' :
              item.data.contactState === 0 ? 'Closed' : 'Open'}
            </div>
            <div className={'ui button basic silabsiconbuttons ' + color} >
              {item.data.tamperState === undefined ? '' :
              item.data.tamperState === 0 ? 'Alarm Enabled' : 'Alarm Triggered'}
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
          </div>
        );
      } else if (Flux.stores.store.isMultiSensor(item.data)) {
        basicPanel = (
          <div>
          </div>
        );

      } else if (Flux.stores.store.isSmartPlug(item.data)) {
        basicPanel = (
          <div>
            <div className="ui button basic silabsglobal"
              onTouchTap={this.onDeviceOn.bind(this, item)}>
              On
            </div>
            <div className="ui button basic silabsglobal"
              onTouchTap={this.onDeviceOff.bind(this, item)}>
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
              onTouchTap={Flux.actions.setDeviceOn.bind(this, item)}>
              On
            </div>
            <div className="ui button basic silabsglobal"
              onTouchTap={Flux.actions.setDeviceOff.bind(this, item)}>
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

      sensorInfo = (
          <div className="ui segment control-panel">
            <h4>{humanReadableDeviceType} Information</h4>
            {supportedCluster.length > 0 &&
              <div className="ui celled list">
                {this.isClusterSupported(supportedCluster, Constants.OCCUPANCY_CLUSTER) &&
                  <div className="item">
                      <h5 className="ui left floated header">
                      Occupancy:
                      </h5>
                      <div className="ui right floated">
                      {item.data.occupancyReading === undefined ? 'Loading..' :
                      item.data.occupancyReading === 1 ? 'Occupied' : 'Not Occupied'}
                      </div>
                  </div>
                }
                {this.isClusterSupported(supportedCluster, Constants.ILLUMINANCE_CLUSTER) &&
                  <div className="item">
                      <h5 className="ui left floated header">
                      Lux:
                      </h5>
                      <div className="ui right floated">
                      {(item.data.luxReading === undefined) ? 'Loading..' :
                      item.data.luxReading + ' Lux'}
                      </div>
                  </div>
                }
                {this.isClusterSupported(supportedCluster, Constants.HUMIDITY_CLUSTER) &&
                  <div className="item">
                      <h5 className="ui left floated header">
                      Relative Humidity:
                      </h5>
                      <div className="ui right floated">
                      {(item.data.humidityReading === undefined) ? 'Loading..' :
                      item.data.humidityReading + ' %'}
                      </div>
                  </div>
                }
                {this.isClusterSupported(supportedCluster, Constants.TEMPERATURE_CLUSTER) &&
                  <div className="item">
                      <h5 className="ui left floated header">
                      Temperature:
                      </h5>
                      <div className="ui right floated">
                      {(item.data.temperatureValue === undefined) ? 'Loading..' :
                      item.data.temperatureValue + ' °F'}
                      </div>
                  </div>
                }
                {this.isClusterSupported(supportedCluster, Constants.SIMPLE_METERING_CLUSTER) &&
                  <div className="item">
                      <h5 className="ui left floated header">
                      Power Used:
                      </h5>
                      <div className="ui right floated">
                      {(item.data.powersumValue === undefined) ? 'Loading..' :
                      item.data.powersumValue + ' kWh'}
                      </div>
                  </div>
                }
                {this.isClusterSupported(supportedCluster, Constants.ELECTRICAL_CLUSTER) &&
                  <div className="item">
                      <h5 className="ui left floated header">
                      RMS Voltage:
                      </h5>
                      <div className="ui right floated">
                      {(item.data.rmsVoltage === undefined) ? 'Loading..' :
                      item.data.rmsVoltage + ' V'}
                      </div>
                  </div>
                }
                {this.isClusterSupported(supportedCluster, Constants.ELECTRICAL_CLUSTER) &&
                  <div className="item">
                      <h5 className="ui left floated header">
                      RMS Current:
                      </h5>
                      <div className="ui right floated">
                      {(item.data.rmsCurrent === undefined) ? 'Loading..' :
                      item.data.rmsCurrent + ' mA'}
                      </div>
                  </div>
                }
                {this.isClusterSupported(supportedCluster, Constants.ELECTRICAL_CLUSTER) &&
                  <div className="item">
                      <h5 className="ui left floated header">
                      Active Power:
                      </h5>
                      <div className="ui right floated">
                      {(item.data.activePower === undefined) ? 'Loading..' :
                      item.data.activePower + ' W'}
                      </div>
                  </div>
                }
              </div>
            }
          </div>
      );

      var otaUpdateMeta;
      var recvOtaProgress = Flux.stores.store.getOtaProgress();
      var otaFileList = Flux.stores.store.getOTAList();
      var listMatch = this.isDeviceItemMatchOtaFilesList(otaFileList, item);
      var isItemInOtaProgress = this.checkOtaProgressItemMatch(recvOtaProgress, item);

      if (recvOtaProgress.status && isItemInOtaProgress && item.data.otaUpdating) {
        otaUpdateMeta = (
          <div className="ui segment control-panel">
          <h4> Uploading Firmware Version: {item.data.otaTargetFirmwareVersion} </h4>
            <div className="ui basic demo progress active" data-percent="100">
              <div className="bar" style={{WebkitTransitionDuration: '300ms',
                                           transitionDuration: '300ms',
                                           width: item.data.otaUpdatePercent.toFixed(0)+'%'}}>
                <div className="progress" />
              </div>
              <div className="label">{item.data.otaUpdatePercent.toFixed(0)}% Complete</div>
            </div>
            <button className="ui red button"
              onTouchTap={this.onCancelOta.bind(this)}>
              Cancel
            </button>
          </div>
        );
      } else if (recvOtaProgress.status && isItemInOtaProgress && !item.data.otaUpdating) {
        otaUpdateMeta = (
          <div className="ui segment control-panel">
            <div className="list">
              <h5>{recvOtaProgress.policy + " File Name: " + listMatch.filename}</h5>
            </div>
            <div>{"Start " + recvOtaProgress.policy + ". Waiting End Node Response. It May Be At Sleep."}</div>
            <br/>
            <button className="ui red button"
              onTouchTap={this.onCancelOta.bind(this)}>
              Cancel
            </button>
          </div>
        );
      } else if (recvOtaProgress.status && !isItemInOtaProgress) {
        otaUpdateMeta = (
          <div className="ui segment control-panel">
            <h5>Waiting for the termination of an existing OTA progress</h5>
          </div>
        );
      } else {
        otaUpdateMeta = '';
      }

      var otaList;
      (item.data.deviceType === "group" || listMatch === undefined) ? otaList = [] :
      otaList = _.map(otaFileList, function(otaitem) {
        var individualMatch = this.isDeviceItemMatchOtaFileInfo(otaitem, item);
        if (individualMatch) {
          return (
            <div className="ui segment control-panel" key={otaitem.filename}>
              <div className="list">
                <div><h5>{"File Name: " + otaitem.filename}</h5></div>
                {"Manf. ID: " + otaitem.manufacturerId +
                 "; Image Type: " + otaitem.imageTypeId +
                 "; OTA File Ver.: " + otaitem.firmwareVersion +
                 "; Size: " + otaitem.imageSizeKB + ' Bytes'}
              </div>
              <br/>
              <button className="ui primary button"
               onTouchTap={this.onTriggerOta.bind(this, otaitem, item)}>
                {parseInt(otaitem.firmwareVersion, 16) > parseInt(item.data.firmwareVersion, 16) ? "Upgrade" : "Downgrade"}
              </button>
            </div>
          );
        }
      }.bind(this));

      var otaListMeta;
      if (otaList.length !== 0) {
        otaListMeta = (
          <div>
            <h5>Available OTA Files:</h5>
            {recvOtaProgress.status ? otaUpdateMeta : otaList}
          </div>
        );
      } else {
        otaListMeta = (
          <div className="ui segment control-panel">
            <div className="list">
              <h4>No Images Found. Please place compatible OTA images in ota_staging directory. </h4>
            </div>
          </div>
        );
      }

      if (item.data.isIdentifyServerClusterDetected &&
          Flux.stores.store.getIdentifyModeStatus(item) === true) {
        identifyModeToggle = (
          <div className="ui button basic silabsglobal" style={{'paddingLeft':'1.8em', 'paddingRight': '1.8em'}}
            onTouchTap={this.onExitIdentify.bind(this, item)}
          >
            Exit Identify Mode
          </div>
        );
      } else if (item.data.isIdentifyServerClusterDetected &&
                 Flux.stores.store.getIdentifyModeStatus(item) === false) {
        identifyModeToggle = (
          <div className="ui button basic silabsglobal" style={{'paddingLeft':'1.6em', 'paddingRight': '1.6em'}}
            onTouchTap={this.onEnterIdentify.bind(this, item)}
          >
            Enter Identify Mode
          </div>
        );
      } else {
        identifyModeToggle = (
          <div></div>
        );
      }

      if (this.state.showExtendedInfo) {
        extendedInfo = (
          <div className="center aligned column">
          <div className="center aligned ui divider"></div>
          <div className="ui button basic silabsglobal" style={{'paddingLeft':'1.6em', 'paddingRight': '1.6em'}}
            onTouchTap={this.hideExtended.bind(this, item)}
          >
            Hide Extended Info
          </div>
            {item.data.deviceType === "group" ? <ExtendedInfoGroup item={item}/> : <ExtendedInfo item={item}/>}
            <div className="center aligned ui divider"></div>
            {otaListMeta}
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
                      {identifyModeToggle}
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
