var vows = require('vows');
var assert = require('assert');
var crypto = require('crypto');
var Https = require('https');
var fs = require('fs');
var WebSocket_lib = require('websocket').server;

var key_file = fs.readFileSync(__dirname + '/cert/digbil-dscs.key');
var cert_file = fs.readFileSync(__dirname + '/cert/digbil-dscs.cert');

var server_options = {
	key : key_file.toString("utf-8"),
	cert : cert_file.toString("utf-8"),
	passphrase : "digbil",
	port : 9090
};

function newHMAC(challenge, key) {
	var hmac = crypto.createHmac((LOCALS && LOCALS.config && LOCALS.player && LOCALS.config.player.key && LOCALS.config.player.key.algo) || 'SHA256', key);
	hmac.update(challenge);
	var sig = hmac.digest("base64");
	// console.log("=---Encryption---=");
	// console.log("-data = " + challenge);
	// console.log("-key = " + key);
	// console.log("-Hmac = " + sig);
	return sig;
}
var server = Https.createServer(server_options);
/* create ws */
var websocket = new WebSocket_lib({
	'httpServer' : server,
	'autoAcceptConnections' : false
});
server.listen(server_options.port);
console.log("Server opened on port " + server_options.port);

module.exports = function(_tests) {
	/* Build tests */
	var tests = [ {
		"Init_server" : {
			"topic" : function() {
				return websocket;
			},
			"tests" : _tests
		}
	} ];

	return function(options, callback) {
		/* Fillup tests suite */
		var batch = vows.describe("websocket");
		for ( var t = 0; t < tests.length; t++)
			batch = batch.addBatch(tests[t]);
		/* run tests */
		batch.run(options.vows_opt, function(result) {
			callback(null, result);
		});
	};
};
