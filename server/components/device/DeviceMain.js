/**
 * Kicks off device code!
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Includes: [
        // add all device-only components here
        'DeviceConfiguration',
        'DeviceCommunications',
        'DeviceCapture'
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
            },
        },
        
        /**
         * Host commands can be directly called by the client
         */
        Public: {
            tryLogin: function(authData) {
                if (!authData) return Promise.reject('error.invalid.request');

                var DeviceStatusId = Shared.DeviceStatus.DeviceStatusId;
                var deviceCache = this.Instance.WifiSnifferDevice.wifiSnifferDevices;

                var deviceId = authData.deviceId;
                var ipOrUserName = this.Instance.Libs.ComponentCommunications.getUserIdentifier();
                var loginAttempt = {
                    deviceId: deviceId,
                    deviceStatus: 0,
                    loginIp: ipOrUserName
                };

                var resetAttempt = false;

                return deviceCache.getObject(deviceId, true, false, true)
                .bind(this)
                .then(function(device) {
                    if (!device) {
                        // TODO: Use a device flag to get device ready for grabs!
                        return Promise.reject('error.device.invalidDevice');
                    }

                    if (device.resetTimeout) {
                        var resetTimeout = new Date(device.resetTimeout);
                        var now = new Date();
                        if (resetTimeout.getTime() < now.getTime()) {
                            // fail: reset time is already up!
                            loginAttempt.deviceStatus = DeviceStatusId.LoginResetFailed;
                            return Promise.reject('device reset expired');
                        }

                        // device is scheduled for a reset! Initialize reset procedure.
                        loginAttempt.deviceStatus = DeviceStatusId.LoginReset;
                        resetAttempt = true;

                        // NOTE: We cannot "return" the following promise, since that would block itself!
                        this.Instance.DeviceConfiguration.startResetConfiguration(device)
                        .bind(this)
                        .then(function() {
                            // update reset status in DB
                            device.resetTimeout = null;
                            return deviceCache.updateObject(device, true);
                        })
                        .catch(function(err) {
                            // fail: Could not reset
                            loginAttempt.deviceStatus = DeviceStatusId.LoginResetFailed;
                            return Promise.reject(err);
                        });
                    }
                    else {
                        if (device.identityToken !== authData.identityToken) {
                            // fail: invalid identity token
                            loginAttempt.deviceStatus = DeviceStatusId.LoginFailedIdentityToken;
                            return Promise.reject('invalid identity token');
                        }

                        // all good! Now, try to login using the device's user account (so it fits in with our permission system)
                        var userAuthData = {
                            uid: device.uid,
                            sharedSecret: authData.sharedSecret      // TODO!
                        };
                        return this.Instance.User.tryLogin(userAuthData);
                    }
                })
                .then(function() {
                    loginAttempt.deviceStatus = loginAttempt.deviceStatus || DeviceStatusId.LoginOk;
                    return null;
                })
                .catch(function(err) {
                    // always delay bad login requests
                    this.Tools.handleError(err, 'Device failed to login (deviceId = ' + deviceId + ')');
                    loginAttempt.deviceStatus = DeviceStatusId.LoginFailed;

                    return Promise.delay(500)
                    .then(function() {
                        return Promise.reject('error.login.auth');
                    });
                })
                .finally(function() {
                    // try storing login attempt
                    return this.Instance.DeviceStatus.deviceStatuses.createObject(loginAttempt, true, true)
                    .bind(this)
                    .catch(function(err) {
                        this.Tools.handleError(err, 'Could not store DeviceStatus');
                    });
                })
                .then(function(res) {
                });
                // .then(function() {
                //     if (resetAttempt) return;

                //     // finally, reset identityToken to avoid replay attacks (if it has not already been reset)
                //     return this.Instance.DeviceConfiguration.startRefreshingIdentityToken(device);
                // });
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

            tryLogin: function() {
                // TODO: Private/Public key authentication

                // no previous session -> try logging in!
                var identityToken;
                try {
                    identityToken = Instance.DeviceConfiguration.readIdentityToken();
                }
                catch (err) {
                    // that's ok...
                    console.error('Could not read identityToken from file');
                }

                var authData = {
                    deviceId: DEVICE.Config.deviceId,
                    sharedSecret: DEVICE.Config.sharedSecret,
                    identityToken: identityToken
                };
                return ThisComponent.host.tryLogin(authData)
                .then(function() {
                    // IMPORTANT: We might not be logged in yet, due to a pending reset!
                    //   Instead, add "post-login logic" to `onLogin`.
                })
                .catch(function(err) {
                    console.error('Could not login: ' + (err.message || err));
                });
            },

            onLogin: function() {
                // let's get to it!
                Instance.DeviceCapture.startCapturing();
            },

            onCurrentUserChanged: function(privsChanged) {
                var user = Instance.User.currentUser;
                console.log('I am: ' + (user && user.userName || '<UNKNOWN>'));

                if (user && privsChanged) {
                    this.onLogin();
                }
                else {
                    this.tryLogin();
                }
            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
            }
        };
    })
});