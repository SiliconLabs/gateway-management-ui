var Config = require('../Config');
var Flux = require('../Flux');
var React = require('react');
var Constants = require('../Constants');
var Slider = require('./Slider.react');
var ColorPickerElement = require('./ColorPickerElement.react');

var nodestate = {}
nodestate[Constants.ND_JUST_JOINED] = 'Joining';
nodestate[Constants.ND_HAVE_ACTIVE] = 'Joining';
nodestate[Constants.ND_HAVE_EP_DESC] = 'Joining';
nodestate[Constants.ND_JOINED] = 'Joined';
nodestate[Constants.ND_UNRESPONSIVE] = 'Unresponsive';
nodestate[Constants.ND_LEAVE_SENT] = 'Leave Sent';
nodestate[Constants.ND_LEFT] = 'Left';
nodestate[Constants.ND_UNKNOWN] = 'Unkonwn';

class ExtendedInfo extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      displayName: "ExtendedInfo"
    };
  }
  
  render() {
    var item = this.props.item;

    return(
      <div className="ui list">
        <div className="item">
          <div className="content">
            <div className="header">
            Node EUI:
            </div>
            {item.data.deviceEndpoint.eui64}
          </div>
        </div>
        <div className="item">
          <div className="content">
            <div className="header">
            Endpoint:
            </div>
            {item.data.deviceEndpoint.endpoint != undefined ? item.data.deviceEndpoint.endpoint : "Fetching info.. (wake if sleepy device)"}
          </div>
        </div>
        <div className="item">
          <div className="content">
            <div className="header">
            Gateway EUI:
            </div>
            0x{item.data.gatewayEui}
          </div>
        </div>
        <div className="item">
          <div className="content">
            <div className="header">
            Node State:
            </div>
            {nodestate[item.data.deviceState]}
          </div>
        </div>
        <div className="item">
          <div className="content">
            <div className="header">
            Firmware Version:
            </div>
            {item.data.firmwareVersion != undefined ? item.data.firmwareVersion : "Fetching info.. (wake if sleepy device)"}
          </div>
        </div>
        <div className="item">
          <div className="content">
            <div className="header">
            Image Type:
            </div>
            {item.data.imageTypeId != undefined ? item.data.imageTypeId : "Fetching info.. (wake if sleepy device)"}
          </div>
        </div>
        <div className="item">
          <div className="content">
            <div className="header">
            Manufacturer ID:
            </div>
            {item.data.manufacturerId != undefined ? item.data.manufacturerId : "Fetching info.. (wake if sleepy device)"}
          </div>
        </div>
        <div className="item">
          <div className="content">
            <div className="header">
            Device Type:
            </div>
            {item.data.deviceType != undefined ? item.data.deviceType : "Fetching info.. (wake if sleepy device)"}
          </div>
        </div>
        <div className="item">
          <div className="content">
            <div className="header">
            OTA Bytes Sent:
            </div>
            {item.data.otaUpdating ? item.data.otaTotalBytesSent : "Not Updating"}
          </div>
        </div>
        <div className="item">
          <div className="content">
            <div className="header">
            Update In Progress:
            </div>
            {item.data.otaUpdating ? "Yes" : "No"}
          </div>
        </div>
      </div>
    );
  }
}

ExtendedInfo.propTypes = {
  item: React.PropTypes.object.isRequired,
};

module.exports = ExtendedInfo;
