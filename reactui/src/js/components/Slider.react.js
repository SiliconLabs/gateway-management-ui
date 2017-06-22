var Constants = require('../Constants');
var Config = require('../Config');
var Flux = require('../Flux');
var React = require('react');

class Slider extends React.Component {

    constructor(props) {
      super(props);

      this.state = {
        rawValue: 50,
        delay: 80,
        percentValue: 50,
        colorTemp: 3500,
        displayName: "Slider",
      };
      
      // Created a throttle limited position updater for slider
      this.tChangeLevel = _.throttle(function(level) {
        this.changeLevel(level);
      }, this.state.delay);
    }

    changeLevel(level) {
      if (this.props.sliderType === 'Brightness') {
        this.props.setLevel(level, this.props.item);
      } else {
        this.props.setTemp(level, this.props.item);
      }
    }

    handleChange(e) {
      if (Flux.stores.store.isGroup(this.props.item.data)) {
        var delayV = this.props.item.data.items * 80;
        this.setState({delay: delayV});
      }

      if (this.props.sliderType === 'Brightness') {
        this.setState({rawValue: e.target.value});
        this.setState({percentValue: (e.target.value * 100) / 254});
      } else {
        this.setState({rawValue: e.target.value});
        if (e.target.value != 0) {
          this.setState({colorTemp: Constants.MAX_COLOR_TEMP_KELVINS / e.target.value});
        } else {
          this.setState({colorTemp: e.target.value})
        }
      }
      this.tChangeLevel(e.target.value);
    }

    render() {
      var min;
      var max;
      if (this.props.sliderType === 'Brightness') {
        min = 0;
        max = 254;
      } else {
        max = 371; //2691K
        min = 198; //5040K
      }

      return (
        <span>
        <div>
            <input 
              type="range" 
              min={min} 
              max={max}
              onChange={this.handleChange.bind(this)} />
        </div>
          <div>
            {(this.props.sliderType === 'Brightness') ? 
            'Brightness: ' + Math.ceil(this.state.percentValue) + '%' 
            : 'Color Temperature: ' + Math.ceil(this.state.colorTemp) + 'K'}
          </div>
          <br></br>
        </span>
      );
    }
}

Slider.propTypes = {
  sliderType: React.PropTypes.string.isRequired,
  item: React.PropTypes.object.isRequired,
  setLevel: React.PropTypes.func,
  setTemp: React.PropTypes.func
};

module.exports = Slider;
