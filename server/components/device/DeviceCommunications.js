
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
 * Patches NoGap's transport layer to support device client properly
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Base` is available on Host and Client.
     */
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) { 
    	return {
	    	__ctor: function() {
	    	},

	        /**
	         * 
	         */
	        initBase: function() {
				// patch the existing (browser-based) communication layer
				if (this.CommLayer) {
		            var impl = Shared.Libs.ComponentCommunications.getComponentTransportImpl();
		            for (var methodName in this.CommLayer) {
		            	var method = this.CommLayer[methodName];
		            	impl[methodName] = method.bind(impl);
		            }
		            this.CommLayer = null;
		        }
	        },

	        Private: {
	        	__ctor: function() {
	        		// patch instance communication layer, too
					if (this.CommLayer) {
			            var connection = this.Instance.Libs.ComponentCommunications.getDefaultConnection();
			            for (var methodName in this.CommLayer) {
			            	var method = this.CommLayer[methodName];
			            	connection[methodName] = method.bind(connection);
			            }
			            this.CommLayer = null;
			        }
	        	}
	        }
	    };
	}),

    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { 
    	return {
	    	CommLayer: {
	    		checkForceActivatePreviouslyBootstrappedInstance: function(connectionState, requestMetadata) {
	    			// if version is the same, just use the existing version, else reload (i.e. kill the process and restart)
	    			var version = Shared.AppConfig.getValue('currentAppVersion');

                	//console.error('############### versions: ' + [version, requestMetadata['x-nogap-currentappversion']]);
	    			return requestMetadata['x-nogap-currentappversion'] === version.toString();
	    		}
	    	},

	        /**
	         * 
	         */
	        initHost: function() {
	            
	        },

	        Private: {
	            onClientBootstrap: function() {
	            }
	        },

	        Public: {
	        	checkIn: function() {
	        		this.Instance.DeviceStatus.checkIn();
	        	}
	        }
	    };
	}),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;
        var process;
        var lastConnectionErrorMessage;

        return {
        	CommLayer: {
        		onBeforeSendRequestToHost: function(options) {
        			// add version to header
        			options.requestMetadata['x-nogap-currentappversion'] = Instance.AppConfig.getValue('currentAppVersion');
        		},

	            sendRequestToHostImpl: function(options) {
	                var clientRequestData = options.clientRequestData;
	                var path = options.path;
	                var dontSerialize = options.dontSerialize;
	                var headers = options.requestMetadata;

					return new Promise(function(resolve, reject) {
						var Context = this.Context;
			            var serializer = this.Serializer;
			            var completeUrl = DEVICE.Config.HostUrl;	// Context.remoteUrl + path,
			            if (!completeUrl.endsWith('/')) {
			            	completeUrl += '/';
			            }
			            if (path) {
			            	completeUrl += path;
			            }

			            if (!dontSerialize) {
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
					            if (error || !response) {
					                return reject(error || 'connection failed');
					            }

			                    // return host-sent data to caller (will usually be eval'ed by NoGap communication layer)
			                    resolve(body);
					        }
				        );
					}.bind(this))
					.then(function(result) {
						if (!GLOBAL.DEVICE.IsConnectionGood) {
							// we are good again
							lastConnectionErrorMessage = null;
	            			Instance.DeviceLog.logStatus('Re-established connection to server.', true);
						}

						GLOBAL.DEVICE.IsConnectionGood = true;		// we are "connected" (again)

						// notify everyone, then return result
						return ThisComponent.events.reconnect.fire()
						.catch(function(err) {
							// prevent infinite error loops (don't send to server)
							Instance.DeviceLog.logError('Reconnect event failed - ' + err.stack, true);
						})
						.return(result);
					})
					.catch(function(err) {
						// connection failed
						GLOBAL.DEVICE.IsConnectionGood = false;		// we are currently unable to reach the server

            			if (lastConnectionErrorMessage !== err.message) {
	            			lastConnectionErrorMessage = err.message;
	            			Instance.DeviceLog.logError('Lost connection to server - ' + (err.stack || err));
	            		}

						return Promise.reject(err);			// keep propagating error
					});
			    },

				refresh: function() {
					// Refresh was requested. Client is probably running an older version than server...
					Instance.DeviceLog.logError('Client is out of sync. Restarting...');
					process.exit(0);
				}
			},

            __ctor: function() {
                ThisComponent = this;
                process = require('process');

                this.events = {
                	reconnect: squishy.createEvent()
                };
            },

            initClient: function() {
            	// ping server regularly
            	var delay = Instance.AppConfig.getValue('deviceCheckInDelay') || 5 * 1000;

            	ThisComponent.pingTimer = setInterval(function() {
        			ThisComponent.host.checkIn()
            		.catch(function(err) {
            			// don't do anything
            			//Instance.DeviceLog.logError('Unable to `checkIn` with Host - ' + (err.message || err), true);
            		});
            	}, delay);
            }
        };
    })
});
