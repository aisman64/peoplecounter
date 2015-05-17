/**
 * Allows toying with the device's deployed code base and packages that are not part of NoGap.
 *
 * TODO: Pause the entire device code, before patching anything, then re-start after patching.
 * TODO: Re-write anything in the `deviceClient` (specifically `package.json` and `StartDeviceClient.js`)
 * TODO: Run `npm` commands to make sure, the `StartDeviceClient`'s dependencies are all up-to-date
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the server.
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { 
        return {
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
            },
        };
    }),
    
    
    /**
     * Everything defined in this `Client` lives only in the device client.
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
            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
            }
        };
    })
});
