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
            storePacket: function(packet) {
                // TODO: Require authentication
                //if (!this.isAuthenticated) return Promise.reject('error.invalid.permissions');

                this.Instance.WifiPacket.storePacket(packet);
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
             * Device has initialized
             */
            initClient: function() {
                // TODO: Start capturing packets

                // this.host.test()
                // .then(function(result) {
                //     console.log('Host said: ' + result);
                // });

            	console.log('Let\'s capture something!');
            },

            /**
             * This method is called by DeviceMain, once we are logged into the server!
             */
            startCapturing: function() {
                
            },

            storePacket: function(packet) {
                return this.host.storePacket(packet);
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