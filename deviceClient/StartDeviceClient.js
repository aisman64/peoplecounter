/* Copyright (c) 2015-2016, <Christopher Chin>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

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
// Device client config, code execution and caching

function reinitializeConfigFromFile() {
	var contentString = fs.readFileSync(ConfigFilePath).toString();
	Config = JSON.parse(contentString);
	if (GLOBAL.DEVICE) {
		GLOBAL.DEVICE.Config = Config;
	}
}


function runCode(jsCode, isFromCache) {
	// compile and execute server-sent code
	try {
		Instance = eval(jsCode);
	}
	catch (err) {
		throw new Error('[ERROR] Could not run device client - ' + (err.stack || err));
	}

	// compilation worked!
	if (!isFromCache) {
		// write to cache
		try {
			var cacheFileName = Config.DeviceClientCacheFile;
			fs.writeFileSync(cacheFileName, jsCode);	
		}
		catch (err) {
			throw new Error('[ERROR] Could not write device client code to cache - ' + (err.stack || err));
		}
	}
}


/**
 * Try loading and running previously cached code
 */
function tryRunCodeFromCache() {
	var cacheFileName = Config.DeviceClientCacheFile;
	console.log('[STATUS] Running device client code from cache...');
	try {
		var code = fs.readFileSync(cacheFileName).toString('utf8');
		runCode(code, true);
	}
	catch (err) {
		console.error('[ERROR] Could not run device client code from cache - ' + (err.stack || err));
	}
}



// #############################################################################
// Connect to server

function reconnect(delay) {
	if (!Running) return;

	var delay = delay !== undefined && delay || Config.ReconnectDelay;

	console.log('[STATUS] Reconnecting in ' + (delay/1000).toFixed(1) + ' seconds...');
	setTimeout(connectToServerNow, delay);
};


function connectToServerNow() {
	if (!Running) return;

	console.log('[STATUS] Connecting to `' + Config.HostUrl + '`...')
	return new Promise(function(resolve, reject) {
		request({
				url: Config.HostUrl,
				headers: {
					// don't get HTML, only the pure JS client
					'X-NoGap-NoHTML': '1'
				},
			},
			function (error, response, jsonEncodedJsCode) {
				if (error) {
					return reject(error);
				}

				resolve(jsonEncodedJsCode);
			}
		);
	})
	.then(function(jsonEncodedJsCode) {
		GLOBAL.DEVICE.IsConnectionGood = true;		// we are "connected"

		// get to it!
		console.log('[STATUS] Connected to server. Received client code (' + jsonEncodedJsCode.length + ' bytes). Compiling...');

		// start running NoGap client
		var jsCode = eval(jsonEncodedJsCode);
		
		runCode(jsCode, false);
	})
	.catch(function(err) {
		console.error('Connection error: ' + err && (err.stack || err.message) || err);

		// try running code from cache
		if (!Instance || !Instance.DeviceMain) {		// DeviceMain component not available -> initialization most certainly did not succeed
			tryRunCodeFromCache();
		}

		// keep trying to re-connect!
		reconnect();
	});
};



// #############################################################################
// Initialize client configuration

var ConfigFilePath = './data/DeviceConfig.json';
var Config;

var Running = true;
var Instance; 	// current Instance object


// initialize config
try {
	reinitializeConfigFromFile();
}
catch (err) {
	console.error('[ERROR] Could not load config - ' + err.message);
	return -1;
}

// setup global DEVICE state object, for communicating between this script and the server-sent client
GLOBAL.DEVICE = {
	Config: Config,
	
	ConfigFilePath: ConfigFilePath,

	reinitializeConfigFromFile: reinitializeConfigFromFile,

	reconnect: reconnect
};



// #############################################################################
// Connect to server and get started

// create cookies file if it does not exist
var CookiesFolder = path.dirname(Config.CookiesFile);
if (!fs.existsSync(CookiesFolder)) {
	fs.mkdirSync(CookiesFolder);
}
touch.sync(Config.CookiesFile);


// create and set file-backed cookie jar
var jar = request.jar(new FileCookieStore(Config.CookiesFile));
request = request.defaults({ jar : jar })


// start!
connectToServerNow();



// keep Node open (without this code, Node would close right away)
(function _keepNodeOpen() {
   if (Running) setTimeout(_keepNodeOpen, 1000);
})();
