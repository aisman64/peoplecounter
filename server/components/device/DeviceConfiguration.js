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

        var externalUrl;

        return {
            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
                TokenStore = require(libRoot + 'TokenStore');
            },

            /**
             * 
             */
            initHost: function(app, cfg) {
                externalUrl = app.externalUrl;
            },

            Private: {
                onClientBootstrap: function() {
                },

                getDeviceConfig: function(device) {
                    var DefaultConfig = Shared.AppConfig.getValue('deviceConfigDefaults');
                    console.assert(DefaultConfig, 'Could not get `deviceConfigDefaults`. Make sure to define it in `appConfig[.user].js`, then restart the server!');

                    // generate and return config, derived from DefaultConfig
                    var cfg = _.clone(DefaultConfig);

                    cfg.HostUrl = externalUrl;

                    var promise;
                    if (device) {
                        promise = this.Instance.User.users.getObject({uid: device.uid})
                        .bind(this)
                        .then(function(user) {
                            cfg.deviceId = device.deviceId;
                            cfg.sharedSecret = user.sharedSecret;
                        });
                    }
                    else {
                        promise = Promise.resolve();
                    }

                    return promise.return(cfg);
                },

                generateIdentityToken: function(device) {
                    return TokenStore.generateTokenString(256);
                },

                generateDevicePassphrase: function(device) {
                    return TokenStore.generateTokenString(256);
                },

                generateRootPassword: function(device) {
                    return TokenStore.generateTokenString(32);
                },

                /**
                 * Starts resetting configuration of the given device on the current client.
                 * Will not complete since it requires client-side acks, which can (currently) only be sent
                 * after all promises have been fulfilled.
                 */
                tryResetDevice: function(device, newDeviceStatus) {
                    var DeviceStatusId = Shared.DeviceStatus.DeviceStatusId;

                    // this can fail in more than once place
                    var failed = false;
                    var onFail = function(err) {
                        if (failed) return;
                        failed = true;

                        // fail: Could not reset
                        newDeviceStatus.deviceStatus = DeviceStatusId.LoginResetFailed;

                        // store device status a second time
                        this.Instance.DeviceStatus.logStatus(newDeviceStatus);

                        // don't propagate this error! (For now)
                        // return Promise.reject(err);
                    }.bind(this);
                    

                    return Promise.resolve()
                    .bind(this)
                    .then(function() {
                    	var resetTimeout = new Date(device.resetTimeout);
                        var now = new Date();

                        if (resetTimeout.getTime() < now.getTime()) {
                            // fail: reset time is already up!
                            newDeviceStatus.deviceStatus = DeviceStatusId.LoginResetFailed;
                            return Promise.reject('device reset expired');
                        }

                        // device is scheduled for reset
                        newDeviceStatus.deviceStatus = DeviceStatusId.LoginReset;

                        this.Tools.logWarn('Resetting device #' + device.deviceId + '`...');

                        return this.getDeviceConfig(device);
                    })
                    .then(function(cfg) {
                        // get a new identity token
                        return this.startResetConfiguration(device, cfg);
                    })

                    // there are two "threads of execution", and either (or maybe even both) can fail!
                    .then(function(monitor) {
                        monitor.wait.catch(onFail);
                    })
                    .catch(onFail);
                },

                /**
                 * Send new identityToken to client.
                 * Returns a promise to be resolved when the client replies.
                 * NOTE: Will not block current Client request when using HTTP.
                 * 
                 * Returns a monitor object that holds a promise chain to be executed when the client replied with an ack.
                 *
                 * @param cfg Optional: New configuration object.
                 */
                startResetConfiguration: function(device, cfg) {
                    if (this._configRefreshData) {
                        // already in progress
                        return Promise.reject(makeError('error.invalid.request', 'Device tried to `startResetConfiguration` while still refreshing'));
                    }

                    // re-generate client secret
                    return Shared.User.hashPassphrase(device.deviceId, this.generateDevicePassphrase())
                    .bind(this)
                    .then(function(sharedSecretV1) {
                        cfg.sharedSecret = sharedSecretV1;

                        // re-generate identityToken
                        var oldIdentityToken = device.identityToken;
                        var newIdentityToken = this.generateIdentityToken(device);
                        var newRootPassword;
                        if (!device.rootPassword) {
                            newRootPassword = this.generateRootPassword(device);
                        }

                        // udpate client side of things
                        //      and wait for ACK
                        var timeout = 10 * 1000;    // wait for an ack for 10 seconds
                        this._configRefreshData = {
                            device: device,
                            newIdentityToken: newIdentityToken,
                            newSharedSecret: sharedSecretV1,
                            newRootPassword: newRootPassword,
                            result: null,
                            monitor: new SharedTools.Monitor(timeout)
                        };

                        // we cannot generate a reliable promise chain here because we need all promises to be 
                        //      fulfilled before the client will actually call the next method.
                        this.Tools.log('Refreshing device identity for device #' + device.deviceId + '...');
                        this.client.updateConfig(newIdentityToken, oldIdentityToken, cfg);

                        return this._configRefreshData.monitor;
                    });
                },
            },
            
            /**
             * Host commands can be directly called by the client
             */
            Public: {
                getDeviceConfigPublic: function(deviceId) {
                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }

                    return this.Instance.WifiSnifferDevice.wifiSnifferDevices.getObject({
                        deviceId: deviceId
                    })
                    .bind(this)
                    .then(function(device) {
                        return this.getDeviceConfig(device)
                        .bind(this)
                        .then(function(cfg) {
                            var settings = {
                                cfg: cfg,
                                identityToken: device.identityToken,
                                rootPassword: device.rootPassword
                            };

                            // TODO: User authentication (publicKey + privateKey)

                            return settings;
                        });
                    });
                },

                /**
                 * Client ACKnowledged identityToken update
                 */
                deviceResetConfigurationAck: function(deviceId, oldIdentityToken) {
                    var refreshData = this._configRefreshData;
                    if (!refreshData) return Promise.reject(makeError('error.invalid.request'));

                    var device = refreshData.device;
                    console.assert(device);

                    // get monitor
                    var monitor = refreshData.monitor;

                    var promise;
                    if (deviceId != device.deviceId) {
                        // invalid deviceId (need to notify on both "threads of execution")
                        promise = Promise.join(
                            monitor.notifyReject(),
                            Promise.reject(makeError('error.invalid.request', 'invalid `deviceId` during reset'))
                        );
                    }

                    else if (oldIdentityToken !== device.identityToken) {
                        // invalid identityToken (need to notify on both "threads of execution")
                        promise = Promise.join(
                            monitor.notifyReject(),
                            Promise.reject(makeError('error.invalid.request', 'invalid `identityToken` during reset'))
                        );
                    }

                    else {
                        // client-side update was a success!
                            
                        // save to device and user tables
                        var deviceUpdate = {
                            deviceId: device.deviceId,
                            identityToken: refreshData.newIdentityToken,
                            isAssigned: 1,
                            resetTimeout: null
                        };

                        if (refreshData.newRootPassword) {
                            // also update root password
                            deviceUpdate.rootPassword = refreshData.newRootPassword;
                        }

                        // update device and user entry in DB
                        promise = Promise.join(
                            this.Instance.WifiSnifferDevice.wifiSnifferDevices.updateObject(deviceUpdate, true),

                            this.Instance.User.updateUserCredentials(device.uid, refreshData.newSharedSecret)
                        )
                        .bind(this)
                        .then(function() {
                            return monitor.notifyResolve();
                        })
                        .catch(function(err) {
                            this.Tools.handleError(err,
                            	'Failed to reset configuration for device #' + device.deviceId + '');

                            return Promise.join(
                                monitor.notifyReject(),
                                Promise.reject('error.internal')
                            );
                        });
                    }

                    return promise
                    .finally(function() {
                        // always unset refresh status!
                        this._configRefreshData = null;
                    }.bind(this));
                }
            },
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;
        var request;

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
                var fpath = GLOBAL.DEVICE.Config.HostIdentityTokenFile;
                if (!fpath) {
                    // need a reset
                    throw new Error('config corrupted: `HostIdentityTokenFile` missing');
                }
                return fs.readFileSync(fpath).toString();
            },

            writeIdentityToken: function(newIdentityToken) {
                var fpath = GLOBAL.DEVICE.Config.HostIdentityTokenFile;
                if (!fpath) {
                    // need a reset
                    throw new Error('config corrupted: `HostIdentityTokenFile` missing');
                }
                fs.writeFileSync(fpath, newIdentityToken);
            },

            /**
             * Client commands can be directly called by the host
             */
            Public: {
                /**
                 * Called by server to reset identityToken and (optionally) configuration.
                 * This is also called when a new device connects to the server for the first time, and is assigned a new configuration.
                 */
                updateConfig: function(newIdentityToken, oldIdentityToken, newConfig) {
                    // TODO: Update root password
                    console.warn('Resetting device configuration...');

                    request = require('request');   // HTTP client module

                    return Promise.resolve()
                    .bind(this)
                    .then(function() {
                        if (newConfig) {
                            // write new config to file, if it exists
                            this.writeDeviceConfig(newConfig);

                            // then, read config (to make sure it worked!)
                            GLOBAL.DEVICE.reinitializeConfigFromFile();
                        }
                    })
                    .then(function() {
                        // then delete cookies on file and in memory

                        // empty cookies file
                        fs.writeFileSync(DEVICE.Config.CookiesFile, '');

                        // reset cookies jar
                        var jar = request.jar(new FileCookieStore(DEVICE.Config.CookiesFile));
                        request = request.defaults({ jar : jar })
                    })
                    .then(function() {
                        // then update identityToken
                        return this.writeIdentityToken(newIdentityToken);
                    })
                    .then(function() {
                        // tell Host, we are done
                        return this.host.deviceResetConfigurationAck(newConfig.deviceId, oldIdentityToken);
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