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
        'DeviceImage',
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

        Private: {
        	getCurrentDevice: function(user) {
        		user = user || this.Instance.User.currentUser;
        		var devices = this.Instance.WifiSnifferDevice.wifiSnifferDevices;
        		if (user) {
        			return devices.indices.uid.get(user.uid);
        		}
        		else {
        			return null;
        		}
        	}
        }
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
        	onBeforeLogin: function(user) {
        		// check if device's user account is attached to an actual device entry
        		//		and if so, send that device entry to the client.
        		var devices = this.Instance.WifiSnifferDevice.wifiSnifferDevices;
        		return devices.getObject({uid: user.uid}, true, false, true)
        		.bind(this)
        		.then(function(device) {
        			if (!device) {
                   		this.Tools.handleError('uid sent by device did not match any device configuration: ' + user.userName);
        				return Promise.reject('error.login.auth');
        			}
        			else if (!device.isAssigned) {
                        // TODO: Reset automatically?
                        //      Several issues: Can happen during resumeSession and (less so) tryLogin...
                        //          Failed session resuming will cause client to send tryLogin before it knows its resetting.

		                // var ipOrUserName = this.Instance.Libs.ComponentCommunications.getUserIdentifier();
		                // var newDeviceStatus = {
		                //     deviceId: device.deviceId,
		                //     loginIp: ipOrUserName
		                // };
		                // this.Instance.DeviceConfiguration.tryResetDevice(device, newDeviceStatus);

                   		this.Tools.handleError('uid used by device matched a device that has been reset: ' + user.userName);
        				return Promise.reject('error.login.auth');
        			}
        			return user;
        		});
        	},

            onAfterLogin: function(user) {
                // send current device data to client
                var device = this.getCurrentDevice();
                if (!device) {
                    this.Tools.handleError('Device not associated after device login...');
                }

                this.Tools.log('Sending device data to client...');

                var devices = this.Instance.WifiSnifferDevice.wifiSnifferDevices;
                devices.sendChangeToClient(device);
            },

           	onClientBootstrap: function() {
                // resume user session
                return this.Instance.User.resumeSession({
                    preLogin: this.onBeforeLogin.bind(this),
                    postLogin: this.onAfterLogin.bind(this),
                });
            }
        },
        
        /**
         * Host commands can be directly called by the client
         */
        Public: {
            tryLogin: function(authData) {
                if (!authData) return Promise.reject(makeError('error.invalid.request'));

                var DeviceStatusId = Shared.DeviceStatus.DeviceStatusId;
                var deviceCache = this.Instance.WifiSnifferDevice.wifiSnifferDevices;

                var deviceId = authData.deviceId;
                var ipOrUserName = this.Instance.Libs.ComponentCommunications.getUserIdentifier();
                var newDeviceStatus = {
                    deviceId: deviceId,
                    deviceStatus: 0,
                    loginIp: ipOrUserName
                };

                var resetAttempt = false;

                // get device
                return deviceCache.getObject({
                    deviceId: deviceId,
                    isAssigned: 1
                }, true, false, true)
                .bind(this)
                .then(function(device) {
                    var promise;
                    if (!device) {
                        this.Tools.logWarn('Unidentified device connected. Looking for unassigned device configuration...');

                        // get a device that does not have an assigned device id
                        promise = deviceCache.getObject({
                            isAssigned: 0
                        }, true, false, true);
                    }
                    else {
                        promise = Promise.resolve(device);
                    }

                    return promise
                    .bind(this)
                    .then(function(device) {
                        if (!device) {
                            // there is really no device!
                            return Promise.reject('error.device.invalidDevice');
                        }
                        newDeviceStatus.deviceId = device.deviceId;

                        if (!device.isAssigned) {
                    		resetAttempt = true;
                            
                            return this.Instance.DeviceConfiguration.tryResetDevice(device, newDeviceStatus);
                        }
                        else {
                            if (device.identityToken !== authData.identityToken) {
                                // fail: invalid identity token
                                newDeviceStatus.deviceStatus = DeviceStatusId.LoginFailedIdentityToken;
                                return Promise.reject('invalid identity token');
                            }

                            // all good! Now, try to login, using the device's user account
                            //		(so it fits in with our permission system)

                            var userAuthData = {
                                uid: device.uid,
                                sharedSecretV1: authData.sharedSecretV1
                            };
                            return this.Instance.User.tryLogin(userAuthData);
                        }
                    });
                })
                .then(function() {
                    if (this.getCurrentDevice()) {
                        // login succeeded and device data is ready -> Update client!
                        this.onAfterLogin();
                    }
                    newDeviceStatus.deviceStatus = newDeviceStatus.deviceStatus || DeviceStatusId.LoginOk;
                    return null;
                })
                .catch(function(err) {
                    // always delay bad login requests
                    this.Tools.handleError(err, 'Device failed to login (deviceId = ' + deviceId + ')');
                    newDeviceStatus.deviceStatus = DeviceStatusId.LoginFailed;

                    return Promise.delay(500)
                    .then(function() {
                        return Promise.reject('error.login.auth');
                    });
                })
                .finally(function() {
                    // try storing login attempt
                    return this.Instance.DeviceStatus.logStatus(newDeviceStatus);
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
            	// start capturing right away
                GLOBAL.DEVICE.DeviceClientInitialized = true;

                console.log('[STATUS] Device client initialized.');
            	Instance.DeviceCapture.startCapturing();
            },

            tryLogin: function(iAttempt) {
            	iAttempt = iAttempt || 1;
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

                var tryResetting = iAttempt > 1;

                var authData = tryResetting && {} || {
                    deviceId: DEVICE.Config.deviceId,
                    sharedSecretV1: DEVICE.Config.sharedSecret,
                    identityToken: identityToken
                };

                return ThisComponent.host.tryLogin(authData)
                .then(function() {
                    // IMPORTANT: We might not be logged in yet, due to a pending reset!
                    //   Instead, add "post-login logic" to `onLogin`.
                })
                .catch(function(err) {
	            	if (iAttempt > 1) {
	                    console.error('[FATAL ERROR] Failed to login more than once. Giving up! - ' + (err.message || err));
	            	}
	            	else {
                    	console.error('Failed to login - Retrying... (' + (err.stack || err) + ')');
                    	Promise.delay(300)
                    	.then(function() {
                    		// retry!
                    		ThisComponent.tryLogin(++iAttempt);
                    	});
	            	}
                });
            },

            onLogin: function() {
            	// we have logged in successfully, and now have Device privilege level
                Instance.DeviceCapture.flushQueue();
            },

            /**
             * Every device has a user account.
             * When that user changes (and initially), this function is called.
             */
            onCurrentUserChanged: function(privsChanged) {
                var user = Instance.User.currentUser;
                console.log('I am: ' + (user && user.userName || '<UNKNOWN>'));

                if (user && privsChanged) {
                    // logged in successfully
                    this.onLogin();
                }
                else {
                    // not logged in yet
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
