/**
 * @jsx React.DOM
 */

var Flux = require('../Flux');
var React = require('react');

class RulesListControl extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      displayName: "RulesListControl"
    };
  }

  render() {
    var rules = this.props.relayRules.concat(this.props.cloudRules)

    var rulesList = _.map(rules, (item) => {
      if (item === undefined) {
        return;
      } else {
        return (
          <div className="item">
            <div className="content" style={{ paddingRight: '2.5em' }}>
              <a className="header">
                {item.from.simplename} : {item.to.simplename}
                <i className="remove icon remove-item" 
                  onTouchTap={this.props.onRemove.bind(this, item)}/>
              </a>
            </div>
          </div>
        );
      }
    });

    return (
      <div className="ui segment">
        <div className="ui divided list rules-list">
          {rulesList}
        </div>
      </div>
    );
  }
}

RulesListControl.propTypes = {
  relayRules: React.PropTypes.array.isRequired,
  cloudRules: React.PropTypes.array.isRequired,
  onRemove: React.PropTypes.func.isRequired,
};

module.exports = RulesListControl;
