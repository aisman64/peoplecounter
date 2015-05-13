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
	    	PingDelay: 1 * 1000,		// every few seconds

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
	    			// if version is the same, just keep going anyway
	    			// TODO: Fix this!
	    			var version = Shared.AppConfig.getValue('currentAppVersion');

                console.error('############### versions: ' + [version, requestMetadata['x-nogap-currentappversion']]);
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
					            if (error) {
					                // TODO: Better error handling
					                return reject(error);
					            }

			                    // return host-sent data to caller (will usually be eval'ed by NoGap communication layer)
			                    resolve(body);
					        }
				        );
					}.bind(this))
					.then(function(result) {
						GLOBAL.DEVICE.LastConnectionAttemptSuccessful = true;		// 
						return result;
					})
					.catch(function(err) {
						GLOBAL.DEVICE.LastConnectionAttemptSuccessful = false;		// 
						return Promise.reject(err);			// keep propagating
					});
			    },

				refresh: function() {
					// Refresh was requested. Client is probably running an older version than server...
					console.error('Client is out of sync. Restarting...');
					process.exit(0);
				}
			},

            __ctor: function() {
                ThisComponent = this;
                process = require('process');
            },

            initClient: function() {
            	// ping server regularly
            	var lastMessage;
            	ThisComponent.pingTimer = setInterval(function() {
        			ThisComponent.host.checkIn()
            		.catch(function(err) {
            			if (err && lastMessage === err.message) return;
            			lastMessage = err.message;
            			console.error('[ERROR] Could not reach server: ' + (err.stack || err));
            		});
            	}, ThisComponent.PingDelay);
            }
        };
    })
});