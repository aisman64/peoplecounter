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
            logDeviceErrors: function(errors) {
            	var user = this.Instance.User.currentUser;
                if (!this.Instance.User.isDevice()) return Promise.reject('error.invalid.permissions');

                var device = this.Instance.DeviceMain.getCurrentDevice();
                if (!device) {
                	// internal error: something went wrong in our authentication process
                	throw new Error('Device was logged in with its user account, but device entry was not ready: ' +
                		user.userName);
                }
                packet.deviceId = device.deviceId;
                // call stored procedure to take care of packet insertion
                return sequelize.query('CALL storePacket(?, ?, ?, ?, ?, ?);', { 
                    replacements: [
                        packet.mac,
                        packet.signalStrength,
                        packet.time,
                        packet.seqnum,
                        packet.ssid,
                        packet.deviceId
                    ],
                    type: sequelize.QueryTypes.RAW
                });
                // .spread(function() {

                // });
            },
        },
    }}),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;
        var queuedErrors;

        return {
            MaxErrorQueueLength: 10,

            __ctor: function() {
                ThisComponent = this;
            },

            _makeError: function(message) {
                // return {
                //     createdAt: new Date(),
                //     message: message
                // };
                return message;
            },

            _sendQueue: function() {
                return this.host.logDeviceErrors(queuedErrors)
                .then(function() {
                    // done!
                    queuedErrors = null;
                });
            },

            logStatus: function(message) {
                var timeStr = moment().format('YYYY-MMMM-D hh:mm:ss');
                var prefix = '[STATUS - ' + timeStr + '] ';
                message = prefix + message;
                console.log(message);
            },

            logError: function(message, dontSendToServer) {
                var timeStr = moment().format('YYYY-MMMM-D hh:mm:ss');
                var prefix = '[ERROR - ' + timeStr + '] ';
                message = prefix + message;
                console.error(message);

                if (dontSendToServer) return;

                var promise;
                var errorEntry = ThisComponent._makeError(message);
                if (queuedErrors) {
                    // try to send queue
                    queuedErrors.push(errorEntry);
                    promise = ThisComponent._sendQueue();
                }
                else {
                    promise = this.host.logDeviceErrors([errorEntry]);
                }

                return promise
                .catch(function(err) {
                    // failed to send error to Host
                    console.error(prefix + 'could not send error(s) to host - ' + (err.stack || err));

                    // trim error queue
                    while (queuedErrors.length > ThisComponent.MaxErrorQueueLength) {
                        queuedErrors.shift();
                    }
                });
            },

            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});
