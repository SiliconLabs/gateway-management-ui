var Fluxxor = require('fluxxor');
var ServerActions = require('./actions/ServerActions');
var Store = require('./stores/Store');

var stores = {
	store: new Store()
};

var Flux = new Fluxxor.Flux(stores, ServerActions);

Flux.on("dispatch", function(type, payload) {
	if (console && console.log) {
		console.log("[Dispatch]", type, payload);
	}
});

module.exports = Flux;
