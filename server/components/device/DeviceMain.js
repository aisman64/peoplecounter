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
                if (!this.Context.IsDevice) return;

                this.Tools.log('Device connected!!');

                return 'Host says hi!';
            },
        },
        
        /**
         * Host commands can be directly called by the client
         */
        Public: {
            tryLogin: function(authData) {
                var deviceId = authData && authData.deviceId;
                if (!deviceId) return Promise.reject('error.login.auth');

                var LoginStatus = this.Instance.DeviceLoginAttempt.LoginAttemptStatus;

                var ipOrUserName = this.Instance.Libs.ComponentCommunications.getUserIdentifier();
                var loginAttempt = {
                    deviceId: deviceId,
                    loginStatus: 0,
                    loginIp: ipOrUserName,
                    identityTokenMatch: -1
                };

                return this.Instance.WifiSnifferDevice.wifiSnifferDevices.getObject(deviceId, true, false, true)
                .bind(this)
                .then(function(device) {
                    if (!device) {
                        // invalid deviceId
                        return Promise.reject();
                    }

                    if (device.resetTimeout) {
                        var resetTimeout = new Date(device.resetTimeout);
                        var now = Date.now();
                        if (resetTimeout.getTime() < now.getTime()) {
                            // fail: reset time is already up!
                            loginAttempt.loginStatus = LoginStatus.LoginResetFailed;
                            return Promise.reject();
                        }

                        // device is scheduled for a reset! Initialize reset procedure.
                        loginAttempt.loginStatus = LoginStatus.LoginReset;
                        return this.Instance.DeviceConfiguration.resetConfiguration(device)
                        .catch(function(err) {
                            // fail: Could not reset
                            loginAttempt.loginStatus = LoginStatus.LoginResetFailed;
                            return Promise.reject(err);
                        });
                    }
                    else {
                        loginAttempt.identityTokenMatch = (device.identityToken !== authData.identityToken);
                        if (!loginAttempt.identityTokenMatch) {
                            // fail: invalid identity token
                            loginAttempt.loginStatus = LoginStatus.LoginFailedIdentityToken;
                            return Promise.reject();
                        }

                        // all good! Now, try to login using the device's user account (so it fits in with our permission system)
                        var userAuthData = {
                            uid: device.uid,
                            sharedSecret: authData.sharedSecret      // TODO!
                        };
                        return this.Instance.User.tryLogin(userAuthData);
                    }
                })
                .catch(function(err) {
                    // TODO: Allow admin to re-configure gone-bad devices easily...

                    // always delay bad login requests
                    this.Tools.handleError(err, 'Device failed to login. - ' + authData);

                    return Promise.delay(500)
                    .reject('error.login.auth');
                })
                .then(function() {
                    // try storing login attempt
                    return this.Instance.DeviceLoginAttempt.Model.create(loginAttempt)
                    .catch(function(err) {
                        this.Tools.handleError(err, 'Could not store DeviceLoginAttempt');
                    });
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
             * Device has initialized
             */
            initClient: function() {
            },

            onCurrentUserChanged: function(privsChanged) {
                var user = Instance.User.currentUser;
                console.log('I am: ' + (user && user.userName || '<UNKNOWN>'));

                if (user) {
                    Instance.DeviceCapture.startCapturing();
                }
                else {
                    // try logging in!
                    var authData = {

                    };
                    Instance.User.host.tryLogin(authData);
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