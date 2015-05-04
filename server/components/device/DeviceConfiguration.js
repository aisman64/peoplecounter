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
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { 
        var componentsRoot = '../';
        var libRoot = componentsRoot + '../lib/';
        var SequelizeUtil;
        var TokenStore;

        return {
            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
                TokenStore = require(libRoot + 'TokenStore');
            },

            /**
             * 
             */
            initHost: function() {
                
            },

            Private: {
                onClientBootstrap: function() {
                },

                generateDeviceConfig: function(device) {
                    var DefaultConfig = Shared.AppConfig.getValue('DeviceConfigDefaults');
                    console.assert(DefaultConfig, 'Could not get `DeviceConfigDefaults`. Make sure to define it in `appConfig[.user].js`, then restart the server!');

                    // generate and return config, derived from DefaultConfig
                    var cfg = _.clone(DefaultConfig);
                    cfg.deviceId = device.deviceId;
                    return cfg;
                },

                generateIdentityToken: function(device) {
                    return TokenStore.generateTokenString(256);
                },

                /**
                 * Starts resetting configuration of the given device on the current client.
                 * Will not complete since it requires client-side acks, which can (currently) only be sent
                 * after all promises have been fulfilled.
                 */
                startResetConfiguration: function(device) {
                    return Promise.resolve()
                    .bind(this)
                    .then(function() {
                        return this.generateDeviceConfig(device);
                    })
                    .then(function(cfg) {
                        // get a new identity token
                        return this.startRefreshingIdentityToken(device, cfg);
                    });
                },

                /**
                 * Send new identityToken to client.
                 * Returns a promise to be resolved when the client replies.
                 * NOTE: Will not block current Client request when using HTTP.
                 *
                 * @param cfg Optional: New configuration object.
                 */
                startRefreshingIdentityToken: function(device, cfg) {
                    if (this._deviceIdentityTokenRefresh) {
                        // already in progress
                        return Promise.reject(makeError('error.invalid.request', 'Device tried to `startRefreshingIdentityToken` while still refreshing'));
                    }

                    // re-generate identityToken
                    var oldIdentityToken = device.identityToken;
                    var newIdentityToken = this.generateIdentityToken(device);

                    // udpate client side of things
                    //      and wait for ACK
                    this._deviceIdentityTokenRefresh = {
                        device: device,
                        newIdentityToken: newIdentityToken,
                        result: null,
                        monitor: new SharedTools.Monitor(3000)
                    };

                    // we cannot generate a reliable promise chain here because we need all promises to be 
                    //      fulfilled before the client will actually call the next method.
                    this.Tools.log('Refreshing device identity for device `' + device.deviceName + '` (#' + device.deviceId + ')');
                    this.client.updateIdentityToken(newIdentityToken, oldIdentityToken, cfg);

                    return this._deviceIdentityTokenRefresh.monitor;
                },
            },
            
            /**
             * Host commands can be directly called by the client
             */
            Public: {
                generateDeviceConfigPublic: function(deviceId) {
                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }

                    return this.Instance.WifiSnifferDevice.wifiSnifferDevices.getObject(deviceId)
                    .bind(this)
                    .then(function(device) {
                        return {
                            cfg: this.generateDeviceConfig(device),
                            identityToken: device.identityToken
                        };
                    });
                },

                /**
                 * Client ACKnowledged identityToken update
                 */
                configRefreshAck: function(deviceId, oldIdentityToken) {
                    var refreshData = this._deviceIdentityTokenRefresh;
                    if (!refreshData) return Promise.reject(makeError('error.invalid.request'));

                    var device = refreshData.device;
                    console.assert(device);

                    // Notify on monitor!
                    var monitor = refreshData.monitor;

                    if (deviceId != device.deviceId) {
                        // invalid deviceId
                        return monitor.notifyReject(makeError('error.invalid.request', 'invalid `deviceId`'));
                    }

                    else if (oldIdentityToken !== device.identityToken) {
                        // invalid deviceId
                        return monitor.notifyReject(makeError('error.invalid.request', 'invalid `identityToken`'));
                    }

                    else {
                        // client-side update was a success!
                            
                        // save to DB
                        return this.Instance.WifiSnifferDevice.wifiSnifferDevices.updateObject({
                            deviceId: device.deviceId,
                            identityToken: refreshData.newIdentityToken,
                            resetTimeout: null
                        }, true)
                        .bind(this)
                        .then(function() {
                            return monitor.notifyResolve();
                        })
                        .catch(function(err) {
                            this.Tools.handleError(err, '`identityToken` refresh failed for device `' + device.deviceName + '` (#' + device.deviceId + ')');

                            return monitor.notifyReject(makeError('error.internal'));
                        })
                        .finally(function() {
                            // everything is over -> unset
                            this._deviceIdentityTokenRefresh = null;
                        }.bind(this));
                    }
                }
            },
        };
    }),
    
    
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
             * This function is here (and not in the DeviceClient starter script) because
             * it is not needed during start-up.
             */
            writeDeviceConfig: function(cfg) {
                var contentString = JSON.stringify(cfg, null, '\t');
                fs.writeFileSync(GLOBAL.DEVICE.ConfigFilePath, contentString);
            },

            readIdentityToken: function() {
                var fpath = GLOBAL.DEVICE.Config.IdentityTokenFile;
                if (!fpath) {
                    // need a reset
                    throw new Error('config corrupted: `IdentityTokenFile` missing');
                }
                return fs.readFileSync(fpath).toString();
            },

            writeIdentityToken: function(newIdentityToken) {
                var fpath = GLOBAL.DEVICE.Config.IdentityTokenFile;
                if (!fpath) {
                    // need a reset
                    throw new Error('config corrupted: `IdentityTokenFile` missing');
                }
                fs.writeFileSync(fpath, newIdentityToken);
            },

            /**
             * Client commands can be directly called by the host
             */
            Public: {
                updateIdentityToken: function(newIdentityToken, oldIdentityToken, newConfig) {
                    return Promise.resolve()
                    .bind(this)
                    .then(function() {
                        if (newConfig) {
                            // write new config to file, if it exists
                            this.writeDeviceConfig(newConfig);

                            // then, read config (to make sure it worked!)
                            GLOBAL.DEVICE.readDeviceConfig();
                        }
                    })
                    .then(function() {
                        // then update identityToken
                        return this.writeIdentityToken(newIdentityToken);
                    })
                    .then(function() {
                        // tell Host, we are done
                        return this.host.configRefreshAck(newConfig.deviceId, oldIdentityToken);
                    })
                    .then(function() {
                        if (newConfig) {
                            // try logging in again, after config reset!
                            return Instance.DeviceMain.tryLogin();
                        }
                    })
                    .catch(function(err) {
                        console.error(err.stack || err);

                        // re-try reset?
                        // return Promise.delay(3000)
                        // .bind(this)
                        // .then(function() {
                        //     var cfg = GLOBAL.DEVICE.Config;
                        //     return Instance.DeviceMain.requestReset(cfg && cfg.deviceId);
                        // });
                    });
                }
            }
        };
    })
});