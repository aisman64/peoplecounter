/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Includes: [
        // add all device-only components here
    ],

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
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { 
        return {
            __ctor: function() {
                this.deviceErrors = {};
            },

            initHost: function() {
            },

            Private: {
                onClientBootstrap: function() {
                }
            },
            
            /**
             * Host commands can be directly called by the client
             */
            Public: {
                logDeviceStatus: function(entries) {
                    var user = this.Instance.User.currentUser;
                    if (!this.Instance.User.isDevice()) return Promise.reject('error.invalid.permissions');

                    var device = this.Instance.DeviceMain.getCurrentDevice();
                    if (!device) {
                        // internal error: something went wrong in our authentication process
                        throw new Error('Device was logged in with its user account, but device entry was not ready: ' +
                            user.userName);
                    }

                    //var allErrors = this.deviceErrors[device.deviceId] = this.deviceErrors[device.deviceId] || [];
                    for (var i = 0; i < entries.length; i++) {
                        var entry = entries[i];
                        var msg = entry.message;
                        this.Tools.log('[CLIENT] ' + msg);
                    };
                },

                logDeviceErrors: function(errors) {
                	var user = this.Instance.User.currentUser;
                    if (!this.Instance.User.isDevice()) return Promise.reject('error.invalid.permissions');

                    var device = this.Instance.DeviceMain.getCurrentDevice();
                    if (!device) {
                    	// internal error: something went wrong in our authentication process
                    	throw new Error('Device was logged in with its user account, but device entry was not ready: ' +
                    		user.userName);
                    }

                    //var allErrors = this.deviceErrors[device.deviceId] = this.deviceErrors[device.deviceId] || [];
                    for (var i = 0; i < errors.length; i++) {
                        var err = errors[i];
                        var msg = err.message;
                        this.Tools.handleError('[CLIENT] ' + msg);
                    };
                },
            },
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;
        var LogQueue;

        var errorQueue,
            statusQueue;

        return {
            MaxQueueLength: 10,

            LogQueue: squishy.createClass(function(name, sendEntriesToHost) {
                // members
                this._sendEntriesToHost = sendEntriesToHost;
                this._name = name;
                this._queue = null;
            }, {
                // methods
                _sendQueue: function() {
                    return this._sendEntriesToHost(this._queue)
                    .bind(this)
                    .then(function() {
                        // done!
                        this._queue = null;
                    });
                },

                _makeMessage: function(message) {
                    return {
                        createdAt: new Date(),
                        message: message
                    };
                },

                isHostReady: function() {
                    return !!Instance.DeviceMain.getCurrentDevice();
                },

                logMessage: function(message, sendToHost) {
                    var timeStr = moment().format('YYYY-MMMM-D hh:mm:ss');
                    var prefix = '[' + this._name + ' - ' + timeStr + '] ';
                    console.log(prefix + message);

                    if (!sendToHost) return;

                    var promise;
                    var messageEntry = this._makeMessage(message);
                    if (this._queue || !this.isHostReady()) {
                        // try to send queue
                        this._queue.push(messageEntry);

                        // keep error queue small
                        while (this._queue.length > ThisComponent.MaxQueueLength) {
                            this._queue.shift();
                        }

                        if (this.isHostReady()) {
                            promise = this._sendQueue();
                        }
                    }
                    else {
                        promise = this._sendEntriesToHost([messageEntry]);
                    }

                    return promise
                    .bind(this)
                    .catch(function(err) {
                        // failed to send error to Host
                        console.error(prefix + 'could not send error(s) to host - ' + (err.message || err));
                    });
                }
            }),

            __ctor: function() {
                ThisComponent = this;
            },

            initClient: function() {
                errorQueue = new this.LogQueue('ERROR', this.host.logDeviceErrors.bind(this.host));
                statusQueue = new this.LogQueue('STATUS', this.host.logDeviceStatus.bind(this.host));
            },

            logStatus: function(message, sendToHost) {
                return statusQueue.logMessage(message, sendToHost);
            },

            logError: function(message, sendToHost) {
                return errorQueue.logMessage(message, sendToHost);
            },

            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});
