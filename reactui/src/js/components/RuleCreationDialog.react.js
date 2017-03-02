/**
 * @jsx React.DOM
 */

var Dropdown = require('./Dropdown.react');
var React = require('react');

class RuleCreationDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      canceled: false,
      displayName: "RuleCreationDialog",
    };
  }

  componentWillUnmount() {
    this.props.onUnmount();
  }

  _onSwitchSelect(switchId) {
    this.setState({switch: switchId});
  }

  _onLightSelect(lightId) {
    this.setState({light: lightId});
  }

  clickedCancel() {
    this.props.onCancel();
  }

  _onCreate() {
    if (this.state && !_.isUndefined(this.state.switch) && !_.isUndefined(this.state.light)) {
      if (this.props.onRuleCreate) {
        this.props.onRuleCreate({switch: this.state.switch, light: this.state.light});
      }
    }
  }

  render() {
    return (
      <div>
        <h5>Input Node</h5>
        <Dropdown onSelect={this._onSwitchSelect.bind(this)}
          options={this.props.switches} />
        <h5>Output Node</h5>
        <Dropdown onSelect={this._onLightSelect.bind(this)}
          options={this.props.lights} />
        <div className="ui divider"></div>
        <div className="ui button basic silabsglobal"
          onTouchTap={this._onCreate.bind(this)}>
          Bind
        </div>
        <div className="ui button basic silabsglobal"
          onTouchTap={this.props.onCancel}>
          Cancel
        </div>
      </div>
    );
  }
}

RuleCreationDialog.propTypes = {
  switches: React.PropTypes.array.isRequired,
  lights: React.PropTypes.array.isRequired,
  onRuleCreate: React.PropTypes.func,
  onCancel: React.PropTypes.func,
  onUnmount: React.PropTypes.func
};

module.exports = RuleCreationDialog;
