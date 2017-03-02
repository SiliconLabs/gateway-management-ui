var Config = require('../Config');
var Flux = require('../Flux');
var React = require('react');
var Constants = require('../Constants');
var Slider = require('./Slider.react');
var ColorPickerElement = require('./ColorPickerElement.react');

class ExtendedInfoGroup extends React.Component {
  
  constructor(props) {
      super(props);

      this.state = {
        displayName: "ExtendedInfoGroup"
      }
  }
  
  render() {
    var item = this.props.item;

    var items = Object.keys(item.data.itemList).map(function(groupitem) {
      if (Flux.stores.store.getDeviceFromIndex(groupitem) !== null) {
        var newItem = Flux.stores.store.getDeviceFromIndex(groupitem);
        return (
          <div className="item">
            <div className="content">
                 Device Name: {Flux.stores.store.getHumanReadableDevice(newItem).name}
                 Device Type: {obj.deviceType}
            </div>
          </div>
        );
      } else {
        return(
          <div className="item">
            <div className="content">
              Device: {groupitem} left the network
            </div>
          </div>
        ); 
      }
    });

    return(
        <div className="ui list">
          <h4>
          {items.length} Devices:
          </h4>
          {items}
        </div>
    );
  }
}

ExtendedInfoGroup.propTypes = {
  item: React.PropTypes.object.isRequired,
};

module.exports = ExtendedInfoGroup;
