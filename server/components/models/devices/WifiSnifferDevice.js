
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
 * Each device is deployed in a physical location and captures WifiSSIDPackets in bundles of WifiDataSets.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            DeviceJobType: squishy.makeEnum({
                /**
                 * Only look for and store IEEE 802.11 probe requests (which potentially contain previous SSIDs)
                 */
                'SSIDSniffer': 1,

                /**
                 * Look for and store all unencrypted IEEE 802.11 packets in order to determine
                 * what surrounding devices are up to and what their relative signal strength is.
                 */
                'ActivitySniffer': 2
            }),

            Caches: {
                wifiSnifferDevices: {
                    idProperty: 'deviceId',

                    hasHostMemorySet: 1,    // keep devices in Host memory (for now)

                    indices: [
                        {
                            unique: true,
                            key: ['uid']
                        },
                        {
                            key: ['isAssigned']
                        },
                    ],

                    InstanceProto: {
                        /**
                         * Get user from cache (or null, if not cached).
                         * On Host, need to hand in context as argument
                         *     (since the cached object is a globally shared object which cannot hold on to instance data).
                         */
                        getUserNow: function(Instance) {
                            return (Instance || Shared).User.users.getObjectNowById(this.uid);
                        }
                    },

                    members: {
                        filterClientObject: function(device) {
                            // remove sensitive information before sending to client
                            delete device.identityToken;

                            if (!this.Instance.User.isStaff()) {
                                delete device.resetTimeout;
                            }
                            return device;
                        },

                        getObjectNow: function(queryInput, ignoreAccessCheck) {
                            if (!queryInput) return null;
                            if (!queryInput.isAssigned && !queryInput.deviceId) return null;

                            if (queryInput.deviceId) {
                                // get object by deviceId
                                var obj = this.byId[queryInput.deviceId];
                                if (obj && queryInput.isAssigned !== undefined) {
                                    if (obj.isAssigned !== queryInput.isAssigned) {
                                        // device object does not match "isAssigned condition"
                                        return null;
                                    }
                                }
                                return obj;
                            }
                            else if (queryInput.uid) {
                                return this.indices.uid.get(queryInput.uid);
                            }
                            else if (queryInput.isAssigned !== undefined) {
                                // get first unassigned device
                                var devices = this.indices.isAssigned.get(queryInput.isAssigned);
                                if (!devices || !devices.length) return null;
                                return _.max(devices, 'resetTimeout');
                            }
                        },

                        getObjectsNow: function(queryInput, ignoreAccessCheck) {
                            if (queryInput) {
                                if (queryInput.isAssigned !== undefined) {
                                    return this.indices.isAssigned.get(queryInput.isAssigned);
                                }
                            }
                            return this.list;
                        },

                        compileReadObjectQuery: function(queryInput, ignoreAccessCheck) {
                            var hasDeviceId,
                                hasUid;

                            if (!queryInput || 
                                (queryInput.isAssigned === undefined && 
                                    !(hasDeviceId = queryInput.hasOwnProperty('deviceId')) &&
                                    !(hasUid = queryInput.hasOwnProperty('uid')))) {
                                return Promise.reject(makeError('error.invalid.request', queryInput));
                            }

                            var queryData = { where: {} };
                            if (queryInput.isAssigned !== undefined) {
                                queryData.where.isAssigned = queryInput.isAssigned;
                                queryData.order = 'resetTimeout DESC';
                            }
                            
                            if (hasDeviceId) {
                                queryData.where.deviceId = queryInput.deviceId;
                            }
                            else if (hasUid) {
                                queryData.where.uid = queryInput.uid;
                            }
                            return queryData;
                        },

                        compileReadObjectsQuery: function(queryInput, ignoreAccessCheck) {
                            var queryData = { where: {} };
                            if (queryInput) {
                                if (queryInput.isAssigned !== undefined) {
                                    queryData.where.isAssigned = queryInput.isAssigned;
                                    queryData.order = 'resetTimeout DESC';
                                }
                            }
                            return queryData;
                        },

                        compileUpdateObject: function(queryInput, ignoreAccessCheck) {
                            if (!this.Instance.User.isStaff() && !ignoreAccessCheck) {
                                return Promise.reject(makeError('error.invalid.permissions'));
                            }
                            if (!queryInput || isNaNOrNull(queryInput.deviceId)) {
                                // invalid parameters
                                return Promise.reject(makeError('error.invalid.request'));
                            }

                            var values;
                            var selector;
                            if (_.isObject(queryInput.values)) {
                                // allow specifying the exact `where`-abouts
                                values = queryInput.values;
                                selector = { where: queryInput.where || {} };
                            }
                            else {
                                // default handling
                                values = queryInput;
                                selector = { where: {} };
                            }

                            // ALWAYS make sure, the `deviceId` is set!
                            selector.where.deviceId = queryInput.deviceId;

                            return {
                                values: values,
                                selector: selector
                            };
                        }
                    }
                }
            },    // Caches:
            
	    	Private: {
	    	} // Private:
	    };
	}),


    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var componentsRoot = '../../';
        var libRoot = componentsRoot + '../lib/';
        var SequelizeUtil;
        var TokenStore;

        return {
            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
                TokenStore = require(libRoot + 'TokenStore');
            },

            initModel: function() {
                var This = this;

                /**
                 * 
                 */
                return sequelize.define('WifiSnifferDevice', {
                    deviceId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

                    uid: Sequelize.INTEGER.UNSIGNED,

                    // randomly generated token
                    // this refreshes upon every login to avoid replay-attack logins
                    identityToken: Sequelize.STRING(256),

                    // randomly generated password
                    rootPassword: Sequelize.STRING(256),

                    // boolean: Whether this device is currently deployed physically.
                    //          If not, then a new physical device can be assigned to it.
                    isAssigned: Sequelize.INTEGER.UNSIGNED,

                    // whether (and until when) to automatically re-configure the device upon next login
                    resetTimeout: Sequelize.DATE,

                    // The host name of the device should be unique so that when two devices are in the same network,
                    //      there won't be any name collision.
                    hostName: Sequelize.STRING(255),
                    

                    // the job this device is currently working on, according to the `DeviceJob` enum
                    currentJobType: Sequelize.INTEGER.UNSIGNED,

                    // the dataset this device is currently participating in (if any)
                    currentDatasetId: Sequelize.INTEGER.UNSIGNED,
                },{

                    freezeTableName: true,
                    tableName: 'WifiSnifferDevice',
                    classMethods: {
                        onBeforeSync: function(models) {
                            // setup foreign key Association between user and device (one-to-one relationship)
                            this.belongsTo(models.User,
                                { foreignKey: 'uid', as: 'user', foreignKeyConstraint: true,
                                onDelete: 'cascade', onUpdate: 'cascade' });
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['uid'], { indexOptions: 'UNIQUE'}),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['isAssigned']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['resetTimeout'])
                            );
                        }
                    }
                });
            },

            getHostName: function(device) {
                if (device.hostName) return device.hostName;

                // generate hostName
                var hostNamePrefix = Shared.AppConfig.getValue('deviceHostNamePrefix');
                console.assert(hostNamePrefix, 'Missing configuration option (in appConfig.js): `deviceHostNamePrefix`');
                return hostNamePrefix + device.uid;
            },

            Private: {
                _resetDevice: function(device) {
                    var timeoutDelay = Shared.AppConfig.getValue('deviceDefaultResetTimeout') || (60 * 1000);
                    device.isAssigned = 0;
                    device.resetTimeout = new Date(new Date().getTime() + timeoutDelay);
                }
            },

            Public: {
                registerDevice: function(name) {
                    // must have staff privileges
                    if (!this.Instance.User.isStaff()) return Promise.reject('error.invalid.permissions');

                    // first, make sure, the name does not exist yet
                    return this.Instance.User.users.getObject({userName: name}, true, false, true)
                    .bind(this)
                    .then(function(user) {
                        if (user) {
                            return Promise.reject('error.user.exists');
                        }

                        // then, create a new user
                        // TODO: User authentication (publicKey + privateKey)
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
                        var timeoutDelay = Shared.AppConfig.getValue('deviceDefaultResetTimeout') || (60 * 1000);

                        var newDevice = {
                            uid: newUser.uid,
                            identityToken: this.Instance.DeviceConfiguration.generateIdentityToken(),
                            rootPassword: this.Instance.DeviceConfiguration.generateRootPassword()
                        };
                        newDevice.hostName = this.Shared.getHostName(newDevice);
                        
                        this._resetDevice(newDevice);
                        return this.wifiSnifferDevices.createObject(newDevice);
                    });
                },

                resetDevice: function(deviceId) {
                    // must have staff privileges
                    if (!this.Instance.User.isStaff()) return Promise.reject('error.invalid.permissions');

                    return this.wifiSnifferDevices.getObject({
                        deviceId: deviceId
                    })
                    .bind(this)
                    .then(function(device) {

                        // reset identityToken and allow device to get the new one without logging in
                        device.identityToken = this.Instance.DeviceConfiguration.generateIdentityToken();

                        // let any device looking for a new id come in and grab it!
                        this._resetDevice(device);

                        return this.wifiSnifferDevices.updateObject(device);
                    });
                }
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});
