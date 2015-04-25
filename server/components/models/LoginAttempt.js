/**
 * The AppConfig wraps the `appConfig` values into a component.
 * TODO: Enable manipulation of `appConfig` values by storing it all in DB.
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            Private: {
                Caches: {
                    appConfig: {
                        idProperty: 'configId',

                        hasHostMemorySet: 1,

                        members: {
                            getObjectNow: function(queryInput, ignoreAccessCheck) {
                                if (isNaNOrNull(queryInput)) {
                                    return Promise.reject(makeError('error.invalid.request'));
                                }

                                return this.indices.byId[queryInput];
                            },

                            compileReadObjectsQuery: function(queryInput, ignoreAccessCheck) {
                                // all config options
                                if (!queryInput) return {};
                            }
                        }
                    }
                }
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var appRoot = '../../../';
        var libRoot = appRoot + 'lib/';
        var SequelizeUtil;

        return {
            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
            },

            initModel: function() {
                /**
                 * AppConfig model definition: Contains all run-time editable configuration options.
                 */
                return sequelize.define('LoginAttempt', {
                    id: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    user_id: {
                        type: Sequelize.INTEGER.UNSIGNED
                    },
                    result: Sequelize.BOOLEAN, // bit
                    ip: {type: Sequelize.STRING}
                },{
                    freezeTableName: true,
                    tableName: 'login_attempts',
                    classMethods: {
                        onBeforeSync: function(models) {
                            // add foreign keys:
                            models.LoginAttempt.belongsTo(models.User,{ 
                                foreignKey: 'user_id', as: 'user', 
                                foreignKeyConstraint: true, onDelete: 'cascade', onUpdate: 'cascade' });
                        },

                        onAfterSync: function(models) {
                            var tableName = models.User.getTableName();

                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['user_id']),
                            );
                        }
                    }
                });
            },

            initHost: function(app, cfg) {
            },


            // ################################################################################################################
            // Config instance

            Private: {
                __ctor: function () {
                },

                getClientCtorArguments: function() {
                },

                onNewClient: function() {
                },

                onClientBootstrap: function() {
                }
            }
        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {
            __ctor: function () {
            },

            initClient: function() {
            }
        };
    })
});