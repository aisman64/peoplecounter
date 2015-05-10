/**
 * Patches NoGap's transport layer to support device client properly
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Base` is available on Host and Client.
     */
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) { return {
        /**
         * 
         */
        initBase: function() {
            
        },
    };}),

    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { return {
        /**
         * 
         */
        initHost: function() {
            
        },

        Private: {
            onClientBootstrap: function() {
            }
        },
    }}),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
        	CommLayer: {
				 sendRequestToHost: function(clientRequestData, path, dontSerialize, headers) {
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
					// refresh was requested. Probably need to restart client app...
					console.error('Refresh requested. Client is probably out of sync and needs to re-connect.');
				}
			},

            __ctor: function() {
                ThisComponent = this;

				// patch the existing (browser-based) communication layer
	            var connection = Instance.Libs.ComponentCommunications.getDefaultConnection();
	            for (var methodName in this.CommLayer) {
	            	var method = this.CommLayer[methodName];
	            	connection[methodName] = method.bind(connection);
	            }
            },
        };
    })
});