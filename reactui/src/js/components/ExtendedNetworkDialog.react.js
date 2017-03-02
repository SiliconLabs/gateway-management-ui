/**
 * @jsx React.DOM
 */

var React = require('react');
var Random = require("random-js");
var engine = Random.engines.mt19937().autoSeed();

class ExtendedNetworkDialog extends React.Component {

  constructor(props) {
    super(props);

    var channelV = this.props.validateChannel(this.props.channel.toString()); 
    var panV = this.props.validatePAN(this.props.pan.toString());
    var powerV = this.props.validatePower(this.props.power.toString());

    this.state = {
      channel: this.props.channel.toString(),
      pan: this.props.pan.toString(),
      power: this.props.power.toString(),
      channelV: channelV,
      panV: panV,
      powerV: powerV,
      valid: this.validateAll(this.props.channel.toString(),this.props.pan.toString(),this.props.power.toString()),
      displayName: "ExtendedNetworkDialog",
    };
  }

  componentWillUnmount() {
    this.props.onUnmount();
  }

  clickedCancel() {
    this.props.onCancel();
  }

  validateAll(channel, pan, power) {
    return this.props.validatePower(power) && this.props.validatePAN(pan) && this.props.validateChannel(channel)
  }

  setChannel(e) {
    var str = e.target.value.trim();

    if (this.props.validateChannel(str)) {
      this.setState({channelV: true});
    } else {
      this.setState({channelV: false});
    }

    this.setState({channel: str});

    if (this.validateAll(str, this.state.pan.toString(), this.state.power.toString())) {
      this.setState({valid: true});
    } else {
      this.setState({valid: false});
    }
  }

  setPAN(e) {
    var str = e.target.value.trim();

    if (this.props.validatePAN(str)) {
      this.setState({panV: true});
    } else {
      this.setState({panV: false});
    }

    this.setState({pan: str});


    if (this.validateAll(this.state.channel.toString(), str, this.state.power.toString())) {
      this.setState({valid: true});
    } else {
      this.setState({valid: false});
    }
  }

  setPower(e) {
    var str = e.target.value.trim();

    if(parseInt(str, 10) == 0 && this.props.validatePower(str)){
      str = "0";
    }

    if(this.props.validatePower(str)){
      this.setState({powerV: true});
    } else {
      this.setState({powerV: false});
    }

    this.setState({power: str});

    if(this.validateAll(this.state.channel.toString(),this.state.pan.toString(),str)){
      this.setState({valid: true});
    } else {
      this.setState({valid: false});
    }
  }

  clickedForm(){
    var valid = this.validateAll(this.state.channel.toString(),this.state.pan.toString(),this.state.power.toString());
    if( valid ){
      this.props.onReform(this.state.channel,this.state.pan,this.state.power);
      this.setState({valid: true});
    } else {
      this.setState({valid: false});
    }
  }

  randomPan(){
    var randomPanValue = Random.integer(1, 65535)(engine);
    this.setState({
      panV: true,
      pan: String('0000'+randomPanValue.toString(16)).slice(-4).toString().toUpperCase()
    });
  }

  render() {
    return (
      <div>
        <h4>Extended Network Form Settings</h4>
        <div className="form input">
          <div>
            Channel:
            <div className="ui input" style={{"width":150, 'paddingLeft':'0.5em', 'paddingRight': '0.5em'}}>
              <input 
                type="text"
                  value={this.state.channel}
                  onChange={this.setChannel.bind(this)}
              />
            </div>
            <i className={this.state.channelV ? "green checkmark icon" : "red remove icon"}></i>
          </div>
          <br/>
          <div>
            Pan ID:
            <div className="ui input" style={{"width":150, 'paddingLeft':'0.5em'}}>
              <input 
                type="text"
                  value={this.state.pan}
                  onChange={this.setPAN.bind(this)}
              />
            </div>
            <div className='ui button basic silabsglobal'
              onTouchTap={this.randomPan.bind(this)} style={{'paddingRight': '0.5em'}}>
              <i className="random icon"></i>
              Random
            </div>
            <i className={this.state.panV ? "green checkmark icon" : "red remove icon"}></i>
          </div>
          <br/>
          <div>
            Power(dBm):
            <div className="ui input" style={{"width":150, 'paddingLeft':'0.5em', 'paddingRight': '0.5em'}}>
              <input 
                type="text"
                value={this.state.power}
                onChange={this.setPower.bind(this)}
              />
            </div>
            <i className={this.state.powerV ? "green checkmark icon" : "red remove icon"}></i>
          </div>
          <br/>
          <div>
            <div className={'ui button basic silabsglobal'}
              onTouchTap={this.clickedForm.bind(this)}>
              Accept
            </div>
            <div className='ui button basic silabsglobal'
              onTouchTap={this.clickedCancel.bind(this)}>
              Cancel
            </div>
            {!this.state.valid ?
            <div className="ui icon error message">
              <i className="small attention circle icon"></i>
              <div className="content">
                <div className="header">{this.state.status}</div>
                <p>Invalid network information. 
                (Channel 11-26, PAN Format Example: AAAA, Power: -20 to 20 dBm)</p>
              </div>
            </div> : ""
            }
          </div>
        </div>
      </div>
    )
  }
}

ExtendedNetworkDialog.propTypes = {
  channel: React.PropTypes.string.isRequired,
  pan: React.PropTypes.string.isRequired,
  power: React.PropTypes.string.isRequired,
  onReform: React.PropTypes.func,
  onCancel: React.PropTypes.func,
  onUnmount: React.PropTypes.func,
  validatePAN: React.PropTypes.func,
  validatePower: React.PropTypes.func,
  validateChannel: React.PropTypes.func,
};

module.exports = ExtendedNetworkDialog;
