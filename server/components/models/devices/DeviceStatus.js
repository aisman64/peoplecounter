
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
 * We need to viciously track device login attempts, so as to easily identify and fix broken devices.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            DeviceStatusId: squishy.makeEnum({
                LoginOk: 1,
                LoginFailed: 2,
                LoginFailedIdentityToken: 3,

                LoginReset: 11,
                LoginResetFailed: 12,
            }),
            
            Caches: {
                deviceStatuses: {
                    idProperty: 'deviceStatusId',
                    members: {

                    }
                }
            },

	    	Private: {
	    	}
	    };
	}),


    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var componentsRoot = '../../';
        var libRoot = componentsRoot + '../lib/';
        var SequelizeUtil;

        return {
            DeviceLastActiveTimes: {},
            DeviceLastInstances: {},

            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
            },

            initModel: function() {
                var This = this;

                /**
                 * 
                 */
                return sequelize.define('DeviceStatus', {
                    deviceStatusId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

                    // deviceId sent
                    deviceId: Sequelize.INTEGER.UNSIGNED,

                    // whether login was ok
                    deviceStatus: { type: Sequelize.INTEGER.UNSIGNED },

                    // IP used
                    loginIp: { type: Sequelize.STRING(63) },
                },{
                    freezeTableName: true,
                    tableName: 'DeviceStatus',
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['deviceId'])
                            );
                        }
                    }
                });
            },

            runForeachDevice: function(fn) {
                return Promise.map(Object.values(this.DeviceLastInstances), fn);
            },

            runForDevice: function(deviceId, fn) {
                var Instance = this.DeviceLastInstances[deviceId];
                if (Instance) {
                    return fn(Instance);
                }
                return Promise.reject(makeError('device not available'));
            },

            Private: {
            	logStatus: function(newDeviceStatus) {
                    return this.deviceStatuses.createObject(newDeviceStatus, true, true)
                    .bind(this)
                    .catch(function(err) {
                        this.Tools.handleError(err, 'Could not store DeviceStatus');
                    });
            	},

                /**
                 * Called regularly by each running device
                 */
                checkIn: function() {
                    var currentDevice = this.Instance.DeviceMain.getCurrentDevice();
                    if (!currentDevice) return;

                    var deviceId = currentDevice.deviceId;
                    this.Shared.DeviceLastActiveTimes[deviceId] = new Date();
                    this.Shared.DeviceLastInstances[deviceId] = this.Instance;
                }
            },
            
            /**
             * Host commands can be directly called by the client
             */
            Public: {
                getDeviceLastActiveTimes: function() {
                    // must be logged in
                    if (!this.Instance.User.isStandardUser()) return Promise.reject('error.invalid.permissions');

                    return this.Shared.DeviceLastActiveTimes;
                },

                registerDevice: function(name) {
                    // must have staff privileges
                    if (!this.Instance.User.isStaff()) return Promise.reject('error.invalid.permissions');

                    // TODO: Generate authentication credentials

                    // first, make sure, the name does not exist yet
                    return this.Instance.User.users.getObject({userName: name}, true, false, true)
                    .bind(this)
                    .then(function(user) {
                        if (user) {
                            return Promise.reject('error.user.exists');
                        }

                        // then, create a new user
                        var role = Shared.User.UserRole.Device;
                        var userData = {
                            userName: name, 
                            role: role,
                            displayRole: role,
                        };

                        return this.Instance.User.users.createObject(userData)
                    })
                    .then(function(newUser) {
                        // then create the device
                        return this.wifiSnifferDevices.createObject({
                            uid: newUser.uid,
                            lastSeen: Date.now(),
                        });
                    });

                },

                downloadImageFileForDevice: function(deviceId) {
                    // TODO!
                }
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});
