/**
 * Each device is deployed in a physical location and captures WifiPackets in bundles of WifiDataSets.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
	    	Private: {
	    		Caches: {
	    			wifiSnifferDevices: {
	    				idProperty: 'deviceId',

                        hasHostMemorySet: 1,    // keep devices in Host memory (for now)

                        indices: [
                            {
                                unique: true,
                                key: ['uid']
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
                                device.identityToken = null;

                                if (!this.Instance.User.isStaff()) {
                                    device.resetTimeout = null;
                                }
                                return device;
                            },
                        },

                        compileReadObjectQuery: function(queryInput, ignoreAccessCheck) {
                            var queryData = { where: {} };
                            if (queryInput) {
                                if (queryInput.isIdAssigned) {
                                    queryData.where.isIdAssigned = queryData.where.isIdAssigned;
                                }
                            }
                            return queryData;
                        },

                        compileReadObjectsQuery: function(queryInput, ignoreAccessCheck) {
                            var queryData = { where: {} };
                            if (queryInput) {
                                if (queryInput.isIdAssigned) {
                                    queryData.where.isIdAssigned = queryData.where.isIdAssigned;
                                }
                            }
                            return queryData;
                        }
	    			}
	    		}
	    	}
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

                    host: Sequelize.STRING(256),    // do we need this?

                    // randomly generated token
                    // this refreshes upon every login to avoid replay-attack logins
                    identityToken: Sequelize.STRING(256),

                    // randomly generated password
                    rootPassword: Sequelize.STRING(256),

                    // boolean: Whether this device is currently deployed physically.
                    //          If not, then a new physical device can be assigned to it.
                    isIdAssigned: Sequelize.INTEGER.UNSIGNED,

                    // whether (and until when) to automatically re-configure the device upon next login
                    resetTimeout: Sequelize.DATE,
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
                                SequelizeUtil.createIndexIfNotExists(tableName, ['uid'])
                            );
                        }
                    }
                });
            },

            Private: {
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
                        return this.wifiSnifferDevices.createObject({
                            uid: newUser.uid,
                            identityToken: this.Instance.DeviceConfiguration.generateIdentityToken(),
                            rootPassword: this.Instance.DeviceConfiguration.generateRootPassword()
                        });
                    });
                },

                resetDevice: function(deviceId) {
                    // must have staff privileges
                    if (!this.Instance.User.isStaff()) return Promise.reject('error.invalid.permissions');

                    return this.wifiSnifferDevices.getObject(deviceId)
                    .bind(this)
                    .then(function(device) {
                        var timeoutDelay = Shared.AppConfig.getValue('deviceDefaultResetTimeout') || (60 * 1000);

                        // reset identityToken and allow device to get the new one without logging in
                        device.identityToken = this.Instance.DeviceConfiguration.generateIdentityToken();

                        // let any device looking for a new id come in and grab it!
                        device.isIdAssigned = 0;
                        device.resetTimeout = new Date(new Date().getTime() + timeoutDelay);

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