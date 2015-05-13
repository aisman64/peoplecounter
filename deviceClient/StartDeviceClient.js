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
try {
	DEVICE.readDeviceConfig();
}
catch (err) {
	console.error('[ERROR] Could not load config - ' + err.message);
	return -1;
}

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


// #############################################################################
// Device client code execution and caching

function runCode(jsCode, isFromCache) {
	// compile and execute server-sent code
	var Instance = eval(jsCode);

	// compilation worked!
	if (!isFromCache) {
		// write to cache
		try {
			var cacheFileName = DEVICE.Config.DeviceClientCacheFile;
			fs.writeFileSync(cacheFileName, jsCode);	
		}
		catch (err) {
			console.error('[ERROR] Could not write device client code to cache - ' + (err.stack || err));
		}
	}
}

/**
 * Try loading and running previously cached code
 */
function tryRunCodeFromCache() {
	var cacheFileName = DEVICE.Config.DeviceClientCacheFile;
	console.log('[STATUS] Running device client code from cache...');
	try {
		var code = fs.readFileSync(cacheFileName).toString('utf8');
		debugger;
		runCode(code, true);
	}
	catch (err) {
		console.error('[ERROR] Could not run device client code from cache - ' + (err.stack || err));
	}
}



// #############################################################################
// Basic device connection state initialization

function connectToServerLater() {
	if (!Running) return;

	return Promise
	.resolve('[STATUS] Reconnecting in ' + (DEVICE.Config.ReconnectDelay/1000).toFixed(1) + ' seconds...')
	.then(console.log.bind(console))
	.delay(DEVICE.Config.ReconnectDelay)
	.then(connectToServerNow);
}

function connectToServerNow() {
	if (!Running) return;

	console.log('[STATUS] Connecting to `' + DEVICE.Config.HostUrl + '`...')
	return new Promise(function(resolve, reject) {
		request({
				url: DEVICE.Config.HostUrl,
				headers: {
					// don't get HTML, only the pure JS client
					'X-NoGap-NoHTML': '1'
				},
			},
			function (error, response, jsonEncodedJsCode) {
				if (error) {
					reject(error);
					return;
				}

				console.log('[STATUS] Connected to server. Received client code (' + jsonEncodedJsCode.length + ' bytes). Compiling...');

				// start running client sent through NoGap
				//console.log(body);
				var jsCode = eval(jsonEncodedJsCode);
				
				runCode(jsCode, false);
			}
		);
	})
	.then(function() {
		// this will never be called!
	})
	.catch(function(err) {
		console.error('Connection error: ' + err && (err.stack || err.message) || err);

		// try running code from cache
		if (!GLOBAL.DEVICE.DeviceClientInitialized) {
			tryRunCodeFromCache();
		}

		// keep trying to re-connect!
		connectToServerLater();
	});
};



// keep Node open
(function _keepNodeOpen() {
   if (Running) setTimeout(_keepNodeOpen, 1000);
})();
