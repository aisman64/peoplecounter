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
                'ActivitySniffer': 2,

                /**
                 * Similar to `ActivitySniffer`, but is administered differently and dedicated to
                 * real-time GUI interaction and "device selection".
                 */
                'ProximityScanner': 3
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
                         * On Host, need to reach in context (since this is a globally shared object).
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
                                SequelizeUtil.createIndexIfNotExists(tableName, ['uid']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['isAssigned']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['resetTimeout'])
                            );
                        }
                    }
                });
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