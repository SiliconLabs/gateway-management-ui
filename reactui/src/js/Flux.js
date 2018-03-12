var Fluxxor = require('fluxxor');
var ServerActions = require('./actions/ServerActions');
var Store = require('./stores/Store');
var Constants = require('./Constants');

var stores = {
	store: new Store()
};

var Flux = new Fluxxor.Flux(stores, ServerActions);

if(Constants.CONSOLE_LOG_ENABLED) {
	Flux.on("dispatch", function(type, payload) {
		if (console && console.log) {
			console.log("[Dispatch]", type, payload);
		}
	});
}

module.exports = Flux;
