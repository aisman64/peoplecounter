/**
 * Device client runs on "sniffer devices" to collect data from surrounding wi-fi networks 
 * and sends it to the server for analysis.
 *
 * TODO: Error handling (connection error etc...)
 * TODO: Dynamic dependencies (come with established Client connection)
 * TODO: Restart this script upon "refresh"?
 */
"use strict";

// #############################################################################
// Includes

// invaluable general-purpose utilities
GLOBAL.Promise = require('bluebird');
GLOBAL._ = require('lodash');
require('squishy');

// OS modules
var path = require('path');
var fs = require('fs');
var touch = require('touch');

// HTTP + networking modules
var request = require('request');	// HTTP client module
var FileCookieStore = require('tough-cookie-filestore');


// #############################################################################
// Config handling

GLOBAL.DEVICE = {};
GLOBAL.DEVICE.ConfigFilePath = './data/DeviceConfig.json';

GLOBAL.DEVICE.readDeviceConfig = function readDeviceConfig() {
	var contentString = fs.readFileSync(GLOBAL.DEVICE.ConfigFilePath).toString();
	this.Config = JSON.parse(contentString);
};


// initialize
DEVICE.readDeviceConfig();

var Running = true;



// #############################################################################
// Connect to server and get started

// create cookies file if it does not exist, and wait for request to finish
var CookiesFolder = path.dirname(DEVICE.Config.CookiesFile);
if (!fs.existsSync(CookiesFolder)) {
	fs.mkdirSync(CookiesFolder);
}
touch.sync(DEVICE.Config.CookiesFile);

// create and set file-backed cookie jar
var jar = request.jar(new FileCookieStore(DEVICE.Config.CookiesFile));
request = request.defaults({ jar : jar })

// start!
connectToServerNow();

// keep Node open
(function wait () {
   if (Running) setTimeout(wait, 1000);
})();


// #############################################################################
// Basic device connection state initialization

function connectToServerLater() {
	if (!Running) return;

	return Promise
	.resolve('Reconnecting in ' + (DEVICE.Config.ReconnectDelay/1000).toFixed(1) + ' seconds...')
	.then(console.log.bind(console))
	.delay(DEVICE.Config.ReconnectDelay)
	.then(connectToServerNow);
}

function connectToServerNow() {
	if (!Running) return;

	console.log('Connecting to `' + DEVICE.Config.HostUrl + '`...')
	return new Promise(function(resolve, reject) {
		request({
				url: DEVICE.Config.HostUrl,
				headers: {
					// don't get HTML, only the pure JS client
					'X-NoGap-NoHTML': '1'
				},
			},
			function (error, response, body) {
				if (error) {
					reject(error);
					return;
				}

				console.log('Connected to server. Received client script (' + body.length + ' bytes). Compiling...');

				// start running client sent through NoGap
				//console.log(body);
				var jsonString = eval(body);
				var Instance = eval(jsonString);
			}
		);
	})
	.then(function() {
		// keep re-connecting!
		connectToServerLater();
	})
	.catch(function(err) {
		console.error('Connection error: ' + err && (err.stack || err.message) || err);
		connectToServerLater();
	});
};