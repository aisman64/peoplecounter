
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
