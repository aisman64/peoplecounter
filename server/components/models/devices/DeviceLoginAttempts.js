/**
 * We need to viciously track device login attempts, so as to easily identify and fix broken devices.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            LoginAttemptStatus: squishy.makeEnum({
                LoginOk: 1,
                LoginFailed: 2,
                LoginFailedIdentityToken: 3,

                LoginReset: 11,
                LoginResetFailed: 12,
            }),

	    	Private: {
	    		Caches: {
	    			deviceLoginAttempts: {
	    				idProperty: 'deviceLoginAttemptId',

                        InstanceProto: {
                        },

                        members: {

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
                return sequelize.define('DeviceLoginAttempt', {
                    deviceLoginAttemptId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

                    // deviceId sent
                    deviceId: Sequelize.INTEGER.UNSIGNED,

                    // whether login was ok
                    loginStatus: { type: Sequelize.INTEGER.UNSIGNED },

                    // IP used
                    loginIp: { type: Sequelize.STRING(63) },
                },{
                    classMethods: {
                        onBeforeSync: function(models) {
                            // setup foreign key Association between device and login attempts
                            this.belongsTo(models.WifiSnifferDevice,
                                { foreignKey: 'deviceId', as: 'device', foreignKeyConstraint: true,
                                onDelete: 'cascade', onUpdate: 'cascade' });
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

            Public: {
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