/**
 * The AppConfig wraps the `appConfig` values into a component.
 * TODO: Enable manipulation of `appConfig` values by storing it all in DB.
 */
"use strict";

var NoGapDef = require('nogap').Def;

var appRoot = __dirname + '/../../../';
var libRoot = appRoot + 'lib/';

module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            OverridableConfigKeys: [
                'userPasswordFirstSalt',
                'deviceWifiConnectionFile'
            ],

            __ctor: function() {
                this.OverridableConfigKeysMap = {};
                for (var i = 0; i < this.OverridableConfigKeys.length; ++i) {
                    this.OverridableConfigKeysMap[this.OverridableConfigKeys[i]] = 1;
                };
            },

            getValue: function(key) {
                return this.config[key];
            },

            getAll: function() {
                return this.config;
            },

            updateTraceSettings: function(traceConfigName) {
                var traceCfg = this.getValue(traceConfigName);
                if (_.isObject(traceCfg)) {
                    Shared.Libs.ComponentTools.TraceCfg = squishy.mergeWithoutOverride(traceCfg, Shared.Libs.ComponentTools.TraceCfg);
                }
                else {
                    Shared.Libs.ComponentTools.TraceCfg.enabled = !!traceCfg;
                }
            },

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
            },

            Private: {
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
    	var ConfigModel;
        var UserRole;

        var SequelizeUtil,
            TokenStore,
            bcrypt,
            fs;


        return {
            // TODO: Change to whitelist!
            ConfigClientBlacklist: [
                'db',
                'session',
                'hosts',
                'httpd',
                'smtp',
                'logging',
                'nogap',
                'console',
                'facebookAppSecret',

                'deviceConfigDefaults',
                'deviceWifiConnectionFile'

                //'userPasswordFirstSalt'
            ],

            /**
             * Set of protected config values that may be explicitly requested
             * by privileged users.
             */
            ConfigClientPrivilegedRequestableList: [
                'deviceWifiConnectionFile'
            ],

            __ctor: function () {
                this.defaultConfig = require(appRoot + 'appConfig');
                this.config = _.clone(this.defaultConfig);

                this.ConfigClientBlacklistMap = {}
                for (var i = 0; i < this.ConfigClientBlacklist.length; ++i) {
                    this.ConfigClientBlacklistMap[this.ConfigClientBlacklist[i]] = 1;
                };

                this.ConfigClientPrivilegedRequestableMap = {}
                for (var i = 0; i < this.ConfigClientPrivilegedRequestableList.length; ++i) {
                    this.ConfigClientPrivilegedRequestableMap[this.ConfigClientPrivilegedRequestableList[i]] = 1;
                };

                SequelizeUtil = require(libRoot + 'SequelizeUtil');
                TokenStore = require(libRoot + 'TokenStore');
                bcrypt = require(libRoot + 'bcrypt');
                fs = require('fs');
            },

            serializeConfig: function(cfg) {
                return JSON.stringify(cfg, null, '\t');
            },

            deserializeConfig: function(cfgString) {
                try {
                    return JSON.parse(cfgString);
                }
                catch (err) {
                    throw new Error('Could not parse config: ' + cfgString);
                }
            },

            initModel: function() {
                var ThisComponent = this;

                /**
                 * AppConfig model definition: Contains all run-time editable configuration options.
                 */
                return sequelize.define('AppConfig', {
                    configId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},

                    /**
                     * Other config overrides
                     */
                    configOverrides: Sequelize.TEXT,
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

                            var configDefaults = {
                            };

                            // query config overrides from DB, or create new, if it does not exist yet
                            return this.findOrCreate({
                                where: { },       // get any config (for now, we only want one)
                                defaults: {
                                    configOverrides: ThisComponent.serializeConfig(configDefaults),
                                }
                            })
                            .spread(function(runtimeConfig, created) {
                                // get POD (plain-old data)
                                runtimeConfig = runtimeConfig.get();

                                // merge overrides into config
                                ThisComponent.runtimeConfig = runtimeConfig;
                                ThisComponent.runtimeConfigOverrides = ThisComponent.deserializeConfig(runtimeConfig.configOverrides);

                                return Promise.resolve()
                                .then(function() {
                                    // make sure, `userPasswordFirstSalt` is set
                                    if (!ThisComponent.runtimeConfigOverrides.userPasswordFirstSalt) {
                                        var saltGenerator = bcrypt.genSaltSync.bind(bcrypt, 10);
                                        var salt = TokenStore.getToken('userPasswordFirstSalt', saltGenerator);
                                        ThisComponent.updateValue('userPasswordFirstSalt', salt);
                                    }
                                })
                                .then(function() {
                                    // merge things and finish it up
                                    _.merge(ThisComponent.config, ThisComponent.runtimeConfigOverrides);
                                });
                            });
                        }
                    }
                });
            },

            initHost: function(app, cfg) {
                UserRole = Shared.User.UserRole;

                // update trace settings
                this.updateTraceSettings('traceHost');

                /**
                 * Min privilege level required to use the system.
                 */
                this.config.minAccessRoleId = Shared.User.UserRole[this.config.minAccessRole] || Shared.User.UserRole.StandardUser;

                // some default config entries
                this.config.externalUrl = app.externalUrl;

                // handle version
                var versionFilePath = appRoot + 'data/currentAppVersion';
                var lastVersion;
                var version;
                try {
                    if (!fs.existsSync(versionFilePath)) {
                        lastVersion = 0;
                    }
                    else {
                        var versionString = fs.readFileSync(versionFilePath).toString();
                        lastVersion = parseInt(versionString);
                        if (isNaNOrNull(lastVersion)) {
                            throw new Error('Could not read version from file: ' + versionString);
                        }
                    }

                    // new version
                    version = lastVersion+1;

                    // write new version back to file
                    fs.writeFileSync(versionFilePath, version);
                }
                catch (err) {
                    throw new Error('Could not initialize app version: ' + (err.stack || err));
                }

                // remember config
                console.log('Current version: ' + version);
                this.config.currentAppVersion = version;
            },

            updateValue: function(key, value) {
                if (!this.OverridableConfigKeysMap[key]) {
                    return Promise.reject(makeError('error.config.invalidKey', 'Config key cannot be overridden: ' + key));
                }

                // `this.runtimeConfig` is assigned right after DB initialization. Have to wait for it!
                console.assert(!!this.runtimeConfig, 'Tried to run `AppConfig.updateValue` before server initialization finished');

                // update in-memory cache
                this.config[key] = value;
                this.runtimeConfigOverrides[key] = value;
                this.runtimeConfig.configOverrides = this.serializeConfig(this.runtimeConfigOverrides);

                // update in DB
                var selector = {
                    where: {configId: this.runtimeConfig.configId}
                };
                return this.Model.update(this.runtimeConfig, selector);
            },

            // ################################################################################################################
            // Config instance

            Private: {
                __ctor: function () {
                },

                _filterConfigForClient: function(cfg) {
                    var clientCfg = {};
                    for (var propName in cfg) {
                        if (this.Shared.ConfigClientBlacklistMap[propName]) continue;
                        clientCfg[propName] = cfg[propName];
                    }
                    return clientCfg;
                },

                getClientCtorArguments: function() {
                    // TODO: Filter sensitive information from config
                    // console.error(JSON.stringify(this.Shared.config, null, '\t'));

                    return [
                        this._filterConfigForClient(this.Shared.config), 
                        this._filterConfigForClient(this.Shared.runtimeConfig)
                    ];
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
                /**
                 * Request a protected value. This is only available to staff.
                 */
                requestConfigValue: function(key) {
                    if (!this.Instance.User.isStaff() || !this.Shared.ConfigClientPrivilegedRequestableMap[key]) {
                        return Promise.reject('error.invalid.permissions');
                    }

                    return this.Shared.getValue(key);
                },

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
            __ctor: function (config, runtimeConfig) {
                this.config = config;
                this.runtimeConfig = runtimeConfig;

                this.updateTraceSettings('traceClient');
            },

            initClient: function() {
            },

            requestConfigValue: function(key) {
                return this.host.requestConfigValue(key)
                .bind(this)
                .then(function(val) {
                    this.config[key] = val;
                    return val;
                });
            },

            updateConfigValue: function(key, value) {
                return this.host.updateConfigValue(key, value);
            }

        	// setValue: function(name, value) {
        	// 	this.cfg[name] = value;
        	// 	// TODO: Store value in DB
        	// 	//this.host.setValue(name, value);
        	// },
        };
    })
});