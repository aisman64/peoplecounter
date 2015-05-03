/**
 * This component is responsible for configuring, resetting and maintaining device status
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
            },

            /**
             * Starts resetting configuration of the given device on the current client.
             * Will not complete since it requires client-side acks, which can (currently) only be sent
             * after all promises have been fulfilled.
             */
            startResetConfiguration: function(device) {
                return this.generateDeviceConfig(device)
                .bind(this)
                .then(function(cfg) {
                    // get a new identity token
                    return this.startRefreshingIdentityToken(device);
                });
            },

            generateDeviceConfig: function(device) {
                var DefaultConfig = Shared.AppConfig.getValue('DeviceConfigDefaults');
                console.assert(DefaultConfig, 'Could not get `DeviceConfigDefaults`. Make sure to define it in `appConfig[.user].js`, then restart the server!');

                // generate and return config, derived from DefaultConfig
                var cfg = _.clone(DefaultConfig);
                cfg.deviceId = device.deviceId;
                return cfg;
            },

            startRefreshingIdentityToken: function(device) {
                if (this._deviceIdentityTokenRefresh) {
                    // already in progress
                    return Promise.reject(makeError('error.invalid.request', 'Device tried to `startRefreshingIdentityToken` while still refreshing'));
                }

                // re-generate identityToken
                var oldIdentityToken = device.identityToken;
                var newIdentityToken = TokenStore.generateTokenString(256);

                // udpate client side of things
                //      and wait for ACK
                this._deviceIdentityTokenRefresh = {
                    deviceId: device.deviceId,
                    newIdentityToken: newIdentityToken,
                    result: null,
                    monitor: new SharedTools.Monitor(3000)
                };

                // we cannot generate a reliable promise chain here because we need all promises to be 
                //      fulfilled before the client will actually call the next method.
                this.Tools.log('Refreshing device identity for device `' + device.deviceName + '` (#' + device.deviceId + ')');
                this.client.updateIdentityToken(oldIdentityToken, newIdentityToken);

                return this._deviceIdentityTokenRefresh.monitor;
            },
        },
        
        /**
         * Host commands can be directly called by the client
         */
        Public: {
            /**
             * Client ACKnowledged identityToken update
             */
            refreshIdentityTokenAck: function(deviceId, oldIdentityToken, newIdentityToken) {
                var refreshData = this._deviceIdentityTokenRefresh;
                if (!refreshData) return Promise.reject(makeError('error.invalid.request'));

                var promise;


                // TODO: Notify on monitor!
                var monitor = this._deviceIdentityTokenRefresh.monitor;

                if (deviceId != refreshData.device.deviceId) {
                    // invalid deviceId
                    promise = Promise.reject(makeError('error.invalid.request', 'invalid `deviceId`'));
                }

                else if (oldIdentityToken !== refreshData.device.identityToken ||
                    newIdentityToken != refreshData.newIdentityToken) {
                    // invalid deviceId
                    promise = Promise.reject(makeError('error.invalid.request', 'invalid `identityToken`'));
                }

                else {
                    // save to DB
                    promise = this.Instance.WifiSnifferDevice.wifiSnifferDevices.updateObject({
                        deviceId: device.deviceId,
                        identityToken: refreshData.newIdentityToken
                    })
                    .bind(this)
                    .then(function() {
                    })
                    .catch(function(err) {
                        this.Tools.handleError(err, '`identityToken` refresh failed for device `' + device.deviceName + '` (#' + device.deviceId + ')');

                        // we will probably now have to manually reset the device
                    });
                }

                return promise.finally(function() {
                    // everything is over -> unset
                    this._deviceIdentityTokenRefresh = null;
                }.bind(this))
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
            },

            /**
             * Client commands can be directly called by the host
             */
            Public: {
                updateIdentityToken: function(newIdentityToken) {

                }
            }
        };
    })
});