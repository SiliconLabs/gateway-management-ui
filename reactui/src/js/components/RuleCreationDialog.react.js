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

  _onInputNodeSelect(inputNodeId) {
    this.setState({inputNode: inputNodeId});
  }

  _onOutputNodeSelect(outputNodeId) {
    this.setState({outputNode: outputNodeId});
  }

  clickedCancel() {
    this.props.onCancel();
  }

  _onCreate() {
    if (this.state && !_.isUndefined(this.state.inputNode) && !_.isUndefined(this.state.outputNode)) {
      if (this.props.onRuleCreate) {
        this.props.onRuleCreate({inputNode: this.state.inputNode, outputNode: this.state.outputNode});
      }
    }
  }

  render() {
    return (
      <div>
        <h5>Input Node</h5>
        <Dropdown onSelect={this._onInputNodeSelect.bind(this)}
          options={this.props.inputNodesList} />
        <h5>Output Node</h5>
        <Dropdown onSelect={this._onOutputNodeSelect.bind(this)}
          options={this.props.outputNodesList} />
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
  inputNodesList: React.PropTypes.array.isRequired,
  outputNodesList: React.PropTypes.array.isRequired,
  onRuleCreate: React.PropTypes.func,
  onCancel: React.PropTypes.func,
  onUnmount: React.PropTypes.func
};

module.exports = RuleCreationDialog;
