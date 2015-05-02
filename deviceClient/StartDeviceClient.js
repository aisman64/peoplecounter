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
// Config

var Config = {
	CookiesFile: 'data/cookies.json',
	HostUrl: 'http://localhost:9123',
	ReconnectDelay: 1 * 1000			// 60 seconds
};

var Running = true;


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
// Connect to server and get started

// create cookies file if it does not exist, and wait for request to finish
fs.mkdirSync(path.dirname(Config.CookiesFile));
touch.sync(Config.CookiesFile);

// create and set file-backed cookie jar
var jar = request.jar(new FileCookieStore(Config.CookiesFile));
request = request.defaults({ jar : jar })

// start!
connectToServerNow();

// keep Node open
(function wait () {
   if (Running) setTimeout(wait, 1000);
})();

// #############################################################################
// Communication layer

var CommLayer = {
	 sendCustomClientRequestToHost: function(path, clientRequestData, serialize, headers) {
        var ComponentCommunications = this.Instance.Libs.ComponentCommunications;
        if (ComponentCommunications.hasRefreshBeenRequested()) {
            // already out of sync with server
            return Promise.reject('Tried to send request to server, but already out of sync');
        }

        // add security and other metadata, required by NoGap
        headers = headers || {};
        ComponentCommunications.prepareRequestMetadata(headers);

		return new Promise(function(resolve, reject) {
			var Context = this.Context;
            var serializer = this.Serializer;
            var completeUrl = Config.HostUrl + path;	// Context.remoteUrl + path,

            if (serialize) {
                headers['Content-type'] = 'application/json; charset=' + (Context.charset || 'utf-8') + ';';
                clientRequestData = serializer.serialize(clientRequestData);
            }

            // console.log(jar.getCookieString(completeUrl));

			request({
					method: 'POST',
					url: completeUrl,
					jar: jar,
					headers: headers,
					body: clientRequestData
				},
				function (error, response, body) {
		            if (error) {
		                // TODO: Better error handling
		                reject(error);
		                return;
		            }

                    var hostReply;
                    try {
                        // Deserialize reply
                        hostReply = serializer.deserialize(body || '', true) || {};
                    }
                    catch (err) {
                        console.error(err.stack);
                        // TODO: Better error handling
                        err = 'Unable to parse reply sent by host. '
                            + 'Check out http://jsonlint.com/ to check the formatting. - \n'
                            + body.substring(0, 1000) + '...';
                        reject(err);
                        return;
                    }

                    // return host-sent data to caller (will usually be eval'ed by NoGap comm layer)
                    resolve(hostReply);
		        }
	        );
		}.bind(this));
    },
	refresh: function() {
		console.log('Refresh requested...');
		// call resolve() to stop this thing
		//resolve();
	}
};

function connectToServerLater() {
	if (!Running) return;

	return Promise
	.resolve('Reconnecting in ' + (Config.ReconnectDelay/1000).toFixed(1) + ' seconds...')
	.then(console.log.bind(console))
	.delay(Config.ReconnectDelay)
	.then(connectToServerNow);
}

function connectToServerNow() {
	if (!Running) return;

	console.log('Connecting to `' + Config.HostUrl + '`...')
	return new Promise(function(resolve, reject) {
		request({
				url: Config.HostUrl,
				jar: jar,
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

				// patch the existing (browser-based) communication layer
	            var connection = Instance.Libs.ComponentCommunications.getDefaultConnection();
	            for (var methodName in CommLayer) {
	            	var method = CommLayer[methodName];
	            	connection[methodName] = method.bind(connection);
	            }
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