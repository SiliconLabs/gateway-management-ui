/**
 * @jsx React.DOM
 */

var React = require('react');
var ReactDOM = require('react-dom');
var Application = require('./components/Application.react');
var injectTapEventPlugin = require('react-tap-event-plugin');
injectTapEventPlugin();

ReactDOM.render(
  <Application />,
  document.getElementById('app')
);
