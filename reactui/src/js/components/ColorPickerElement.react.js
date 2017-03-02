var Flux = require('../Flux');
var React = require('react');
var ColorPicker = require('react-color-picker');
var Color = require('color');

class ColorPickerElement extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      thisColor : "#ff0000",
      hue : 15, 
      sat : 15,
      delay: 80,
      displayName: 'ColorPickerElement',
    };

    this.tchangeColor = _.throttle(function(hue, sat) {
      this.changeColor(hue, sat);
    }, this.state.delay);
  }

  changeColor(hue, sat) {
    if (!isNaN(hue) && !isNaN(sat)) {
      this.props.setColor(hue, sat, this.props.item);
    }
  }

  onDrag(color) {
    if (Flux.stores.store.isGroup(this.props.item.data)) {
      var delayV = this.props.item.data.items * 80;
      this.setState({delay: delayV});
    }

    var convColor = Color(color);

    this.setState({ thisColor : color,
      hue : convColor.hue(),
      sat : convColor.saturation()
    });

    this.tchangeColor(convColor.hue(), convColor.saturation());
  }

  render() {
    return (
      <div className="center aligned column">
        <ColorPicker 
          value={this.state.thisColor} 
          saturationWidth={85} 
          saturationHeight={100} 
          hueWidth={30}
          onDrag={this.onDrag.bind(this)}
          onTouchMove={this.onDrag.bind(this)}/>
        <div className="innerdiv" 
          style={{background: this.state.thisColor, 
                  width: 150, 
                  height: 20, 
                  color: 'white'}}>
        Hue: {this.state.hue} Sat: {this.state.sat}
        </div>
      </div>
    );
  }
}

ColorPickerElement.propTypes = {
  item: React.PropTypes.object.isRequired,
  setColor: React.PropTypes.func
};

module.exports = ColorPickerElement;