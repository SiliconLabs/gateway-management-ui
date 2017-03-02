/**
 * @jsx React.DOM
 */

var React = require('react');
var Flux = require('../Flux');
var GroupDeviceList = require('./GroupDeviceList.react');


class AddGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      canceled: false,
      selectedArray: {},
      displayName: 'AddGroupDialog',
    };
  }

  componentWillUnmount() {
    this.props.onUnmount();
  }

  clickedCancel() {
    this.props.onCancel();
  }

  changeSelection(item) {
    this.setState({selectedArray : item});
    this.forceUpdate();
  }

  createGroup() {
    this.props.onCreateGroup(this.state.selectedArray);
  }

  render() {
    return (
      <div>
        <h5>Create Light Group</h5>
        <GroupDeviceList items={Flux.stores.store.getHumanReadableLights()}
            onChangeSelection={this.changeSelection.bind(this)} 
        />
        <div className="ui button basic silabsglobal"
          onTouchTap={this.createGroup.bind(this)}
        >
        Create Group
        </div>
        <div className="ui button basic silabsglobal"
          onTouchTap={this.props.onCancel}
        >
        Cancel
        </div>
      </div>
    );
  }
}

AddGroupDialog.propTypes = {
  devices: React.PropTypes.array.isRequired,
  onCreateGroup: React.PropTypes.func,
  onCancel: React.PropTypes.func,
  onUnmount: React.PropTypes.func
};

module.exports = AddGroupDialog;
