
/* Copyright (c) 2015-2016, <Christopher Chin>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */
/**
 * Kicks off device code!
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Includes: [
        // add all device-only components here
        'DeviceLog',
        'DeviceConfiguration',
        'DeviceCommunications',
        'DeviceImage',
        'DeviceCapture',
        'DevicePatcher'
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

        execAsync: function(cmd) {
            return new Promise(function(resolve, reject) {
                var exec = require('child_process').exec;
                exec(cmd, function(err, stdout, stderr) {
                    if (err) {
                        console.log(stdout);
                        console.error(stderr);
                        reject(err);
                        //resolve();
                    }
                    else {
                        console.log(stdout);
                        console.error(stderr);
                        resolve();
                    }
                });
            });       
        },

        /**
         * Run reboot system command
         */
        reboot: function() {
            return Instance.DeviceMain.execAsync("reboot");
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
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { 
        return {
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

                    this.client.onCurrentDeviceChanged();
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
                        deviceId: deviceId
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
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;
        var process;

        return {
            __ctor: function() {
                ThisComponent = this;
                try {
                    process = require('process');
                }
                catch (err) {
                }
            },

            /**
             * Device has initialized
             */
            initClient: function() {
            	// start capturing right away
                this.DeviceClientInitialized = true;

                this._readCurrentDeviceEntryFromCache();

                if (this.getCurrentDevice()) {
                    // we are ready!
                    this.onDeviceReady();
                }
            },

            /**
             * Read current device information from file
             */
            _readCurrentDeviceEntryFromCache: function() {
                var devices = this.Instance.WifiSnifferDevice.wifiSnifferDevices;
                var fpath = __dirname + '/' + GLOBAL.DEVICE.Config.DeviceEntryCacheFile;

                try {
                    if (!GLOBAL.DEVICE.Config.DeviceEntryCacheFile) {
                        throw new Error('Invalid filename: ' + GLOBAL.DEVICE.Config.DeviceEntryCacheFile);
                    }

                    var entryStr =  fs.readFileSync(fpath);
                    var currentDevice = JSON.parse(entryStr);

                    // add current device entry to cache
                    devices.applyChange(currentDevice);
                }
                catch (err) {
                    Instance.DeviceLog.logError('Could not read current device entry - ' + err.message);
                }
            },

            /**
             * Write current device information to file
             */
            _cacheCurrentDeviceEntry: function() {
                var currentDevice = ThisComponent.getCurrentDevice();
                var fpath = __dirname + '/' + GLOBAL.DEVICE.Config.DeviceEntryCacheFile;

                try {
                    console.assert(currentDevice, 'Device entry not set');

                    if (!GLOBAL.DEVICE.Config.DeviceEntryCacheFile) {
                        throw new Error('Invalid filename: ' + GLOBAL.DEVICE.Config.DeviceEntryCacheFile);
                    }

                    var entryStr = JSON.stringify(currentDevice, null, '\t');
                    fs.writeFileSync(fpath, entryStr);
                }
                catch (err) {
                    Instance.DeviceLog.logError('Could not cache current device entry - ' + err.message);
                }
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

                // reset if the config is not up to date, or we failed previously
                // TODO: Do not reset shit, unless the server tells us to!
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

            /**
             * Every device has a user account.
             * When that user changes (and initially), this function is called.
             */
            onCurrentUserChanged: function(privsChanged) {
                var user = Instance.User.currentUser;
                if (user && privsChanged) {
                    // logged in successfully (but we wait for the `onCurrentDeviceChanged` before doing the next thing)
                }
                else {
                    // not logged in yet
                    ThisComponent.tryLogin();
                }
            },

            onDeviceReady: function() {
                // we have logged in successfully, we have Device privilege level, and we are ready to go!
                var currentDevice = ThisComponent.getCurrentDevice();
                console.assert(currentDevice, 'Device entry not present in `onDeviceReady`');

                var user = Instance.User.currentUser;
                Instance.DeviceLog.logStatus('Device ready: ' + (user && user.userName || '<UNKNOWN>'), true);

                // write current device information to file
                this._cacheCurrentDeviceEntry();

                // send pending queue of captured packets to host
                //Instance.DeviceCapture.flushQueue();

                // start capturing (if we have not started earlier)
                Instance.DeviceCapture.startCapturing(this.getCurrentDevice());
            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                onCurrentDeviceChanged: function() {
                    if (this._initializedDevice) return;
                    this._initializedDevice = 1;

                    this.onDeviceReady();
                },

                restart: function() {
                    process.exit(0);
                }
            }
        };
    })
});
