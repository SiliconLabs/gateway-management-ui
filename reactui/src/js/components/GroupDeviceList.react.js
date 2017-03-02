/**
 * @jsx React.DOM
 */

var Flux = require('../Flux');
var React = require('react');

class GroupDeviceList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedArray: {},
      allItems: false,
      displayName: "GroupDeviceList",
    };

    for (var i = 0; i < this.props.items.length; i++) {
        this.state.selectedArray[this.props.items[i].data.deviceTableIndex] = false;
    }
  }

  checkItem(item){
    var newObj = {};

    Object.keys(this.state.selectedArray).forEach(function(key) {
         newObj[ key ] = this.state.selectedArray[ key ];
    }.bind(this)); 

    newObj[item.data.deviceTableIndex] = !newObj[item.data.deviceTableIndex];

    this.setState({ selectedArray : newObj }, function() {
      this.props.onChangeSelection(this.state.selectedArray);
    });

    this.forceUpdate();
  }

  checkAllItems(){
    var newObj = {};

    Object.keys(this.state.selectedArray).forEach(function(key) {
         newObj[ key ] = !this.state.allItems;
    }.bind(this)); 

    this.setState({ selectedArray : newObj,
        allItems : !this.state.allItems
    }, function() {
      this.props.onChangeSelection(this.state.selectedArray);
    });

    this.forceUpdate();
  }

  render() {
    var items = _.map(this.props.items, function(item) {
      if(item.data.deviceType != "group"){
        return (
          <div className="item">
            <img className="ui avatar image" src={item.image} />
            <div className="content">
              <a className="header">{item.name}</a>
              <div className="description">
                { item.description ? item.description : '' }
              </div>
              <div>
                <div className="toggle-checkbox">
                  <div className="ui checked checkbox"
                    onChange={this.checkItem.bind(this,item)} 
                    >
                    <input id={"toggle" + item.data.deviceTableIndex}
                    checked={this.state.selectedArray[item.data.deviceTableIndex]}
                    type="checkbox" name="public" />
                    <label htmlFor={"toggle" + item.data.deviceTableIndex}></label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }, this);

    return (
      <div>
        <div className="toggle-all-checkbox">
          <div className="ui checked checkbox"
            onChange={this.checkAllItems.bind(this)}>
            <input id="toggleall"
              checked={this.state.allItems}
              type="checkbox" name="public" />
            <label htmlFor="toggleall"> Toggle All </label>
          </div>
        </div>
        <div className="ui divider"></div>
        <div className="ui list device-list">
          {items}
        </div>
        <br/>
      </div>
    );
  }
}

GroupDeviceList.propTypes = {
  items: React.PropTypes.array.isRequired,
  onChangeSelection: React.PropTypes.func,
};

module.exports = GroupDeviceList;
