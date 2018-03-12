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

  getRuleHash(from, to) {
    return from.data.deviceEndpoint.eui64 + ':' + from.data.deviceEndpoint.endpoint.toString() +
           '-' + to.data.deviceEndpoint.eui64 + ':' + to.data.deviceEndpoint.endpoint.toString();
  }

  render() {
    var tempRulesList = [];
    var unfilteredRules = this.props.relayRules.concat(this.props.cloudRules);

    var rules = unfilteredRules.map(item => {
      var euiAndEndpointHashKey = this.getRuleHash(item.from,
                                                   item.to);
      var isDuplicationDetected = (tempRulesList.indexOf(euiAndEndpointHashKey) === -1) ? false : true;
      if (!isDuplicationDetected) {
        tempRulesList.push(euiAndEndpointHashKey);
        return item;
      }
    }).filter(item => {
      return item !== undefined;
    });

    var rulesList = _.map(rules, (item) => {
      if (item === undefined) {
        return;
      } else {
        var itemKey = item.from.simplename + ':' + item.to.simplename;
        return (
          <div className="item" key={itemKey}>
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
