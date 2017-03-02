var finalhandler = require('finalhandler')
  , ip           = require('ip')
  , path         = require('path')
  , http 	     = require('http')
  , serveStatic  = require('serve-static')
  , Logger       = require('../Logger.js')
  , Constants    = require('../Constants.js');

var staticAssetPath = path.join(__dirname, Constants.staticPath);

var serve = serveStatic(staticAssetPath);
var servePort = process.env.PORT || 80;

var server = http.createServer(function(req, res) {
  var done = finalhandler(req, res, {onerror: logerror});
  serve(req, res, done);
});

function logerror(err){
	Logger.server.log('info', 'Static Server Error: ' + err.stack || err.toString());
}

Logger.server.log('info', 'Serving Files on: ' + ip.address() + ':' + servePort);
server.listen(servePort);
