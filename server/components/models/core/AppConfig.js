/**
 * The AppConfig wraps the `appConfig` values into a component.
 * TODO: Enable manipulation of `appConfig` values by storing it all in DB.
 */
"use strict";

var NoGapDef = require('nogap').Def;

var appRoot = '../../../';
var libRoot = appRoot + 'lib/';
var SequelizeUtil = require(libRoot + 'SequelizeUtil');

module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            getValue: function(key) {
                return this.defaultConfig[key];
            },

            getAll: function() {
                return this.defaultConfig;
            },

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
    	var ConfigModel;
        var UserRole;


        return {
            __ctor: function () {
                this.defaultConfig = require(appRoot + 'appConfig');
            },

            initModel: function() {
                /**
                 * AppConfig model definition: Contains all run-time editable configuration options.
                 */
                return sequelize.define('AppConfig', {
                    configId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},

                    name: Sequelize.STRING(100),

                },{
                    freezeTableName: true,
                    tableName: 'AppConfig',
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            // var tableName = models.User.getTableName();
                            // return Promise.join(
                            //     // create indices
                            // );
                        }
                    }
                });
            },

            initHost: function(app, cfg) {
                UserRole = Shared.User.UserRole;

                /**
                 * Min privilege level required to use the system.
                 */
                this.defaultConfig.minAccessRoleId = Shared.User.UserRole[this.defaultConfig.minAccessRole] || Shared.User.UserRole.StandardUser;

                // update tracing settings
                Shared.Libs.ComponentTools.TraceCfg.enabled = this.getValue('traceHost');
            },

            // updateValue: function(key, value) {
            //     if (!runtimeEditableConfig[key]) {
            //         console.error('tried to update invalid config key: ' + key);
            //         return Promise.reject('error.invalid.key');
            //     }

            //     // update in-memory cache
            //     runtimeEditableConfig[key] = value;

            //     // update DB
            //     var values = {};
            //     values[key] = value;

            //     var selector = {
            //         where: {configId: runtimeEditableConfig.configId}
            //     };
            //     return this.Model.update(values, selector);
            // },

            // initModel: function() {
            //     var AppConfig;
            
            //     /**
            //      * Activity model definition.
            //      */
            //     return AppConfig = sequelize.define('AppConfig', {
            //      configId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
            //         name: Sequelize.STRING(100),
            //         settings: Sequelize.TEXT
            //     },{
            //         freezeTableName: true,
            //         tableName: 'bjt_config',
            //         classMethods: {
            //             onBeforeSync: function(models) {
            //             },

            //             onAfterSync: function(models) {
            //                 return Promise.join(
            //                     // create indices
            //                     SequelizeUtil.createIndexIfNotExists('bjt_config', ['configId'])
            //                 );
            //             }
            //         }
            //     });
            // },

            // ################################################################################################################
            // Config instance

            Private: {
                __ctor: function () {
                },

                getClientCtorArguments: function() {
                    return [this.Shared.defaultConfig]
                },

                onNewClient: function() {
                },

                onClientBootstrap: function() {
                    // if (!runtimeEditableConfig) {
                    //     // get or create runtimeEditableConfig
                    //     return this.findAll({
                    //         limit: 1
                    //     })
                    //     .then(function(configs) {
                    //         if (!configs || !configs.length) {
                    //             // no config in DB:
                    //             // insert default config into DB
                    //             return this.create(runtimeEditableDefaultConfig);
                    //         }
                    //         else {
                    //             return configs[0];
                    //         }
                    //     })
                    //     .then(function(_runtimeEditableConfig) {
                    //         // got the config
                    //         runtimeEditableConfig = _runtimeEditableConfig;
                    //     });
                    // }
                }
            },

            Public: {
                updateConfigValue: function(key, value) {
                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }

                    return this.Shared.updateValue(key, value);
                }
            },
        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {
            __ctor: function (defaultConfig) {
                this.defaultConfig = defaultConfig;

                Instance.Libs.ComponentTools.TraceCfg.enabled = defaultConfig.traceClient;
            },

            initClient: function() {
            }

        	// setValue: function(name, value) {
        	// 	this.cfg[name] = value;
        	// 	// TODO: Store value in DB
        	// 	//this.host.setValue(name, value);
        	// },
        };
    })
});