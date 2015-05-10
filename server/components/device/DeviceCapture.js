/**
 * Kicks off device code!
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
        
        /**
         * Host commands can be directly called by the client
         */
        Public: {
            storePackets: function(packets) {
            	var user = this.Instance.User.currentUser;
                if (!this.Instance.User.isDevice()) return Promise.reject('error.invalid.permissions');

                var device = this.Instance.DeviceMain.getCurrentDevice();
                if (!device) {
                	// internal error: something went wrong in our authentication process
                	throw new Error('Device was logged in with its user account, but device entry was not ready: ' +
                		user.userName);
                }

                // TODO: Dataset management (must be controlled in front-end)
                // Shared.WifiDataSet...
                // this.Instance.WifiDataSet...
                
                // insert everything, and wait for it all to finish
                return Promise.map(packets, function(packet) {
	                // add deviceId to packet
	                packet.deviceId = device.deviceId;

	                // TODO: run findOrCreate on SSID and MACAddress, and only store their ids in WifiPacket table

                    // insert packet into DB
                    // make sure, the fields of `packet` match the table definition in WifiPacket (sequelize.define)
                    // see: http://sequelize.readthedocs.org/en/latest/api/model/index.html#createvalues-options-promiseinstance
                    return Shared.WifiPacket.Model.create(packet);
                });
            }
        },
    }}),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
            __ctor: function() {
                ThisComponent = this;
            },

            /**
             * This method is called by DeviceMain, once we are logged into the server!
             */
            startCapturing: function() {
                // TODO: Start capturing packets

                console.log("Let's capture something!");

                // this.storePackets(packets);
            },

            storePackets: function(packets) {
            	// send packet to server
                return this.host.storePackets(packets)
                .then(function() {
                	// DB successfully stored packet
                })
                .catch(function(err) {
                	// something went wrong... anything at all. We want to re-send the packets...
                	// e.g. connection error, exception thrown, DB problems
                });
            },

            onCurrentUserChanged: function(privsChanged) {

            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});