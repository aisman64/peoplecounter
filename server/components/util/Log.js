/**
 * Utility component for logging of high-level system and user events.
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * The `Base` definition is merged into both, `Host` and `Client`
     */
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        var readLang;

        return {
            /**
             * Called right before `__ctor` of `Host` and `Client`.
             * Will be removed once called.
             */
            __ctor: function() {
            },

            /**
             * Called right before `initHost` and `initClient`.
             */
            initBase: function() {
            },

            Private: {
                debug: function(msg) {
                    var cfg = this.getConfig();
                    if (cfg && cfg.verbose) {
                        var userName = this.getUserIdentifier();

                        var msg = '[' + userName + '] - ' + msg;
                        userLogger.log(msg);
                    }
                },
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var log4js;
        var userLogger;
        return {
            /**
             * The ctor is called only once, during NoGap initialization,
             * when the shared component part is created.
             * Will be removed once called.
             */
            __ctor: function () {
            },

            /**
             * Is called once on each component after all components have been created.
             */
            initHost: function(app, cfg) {
                log4js = require('log4js');
                userLogger = log4js.getLogger('user');
                this.cfg = cfg.logging || {
                    verbose: 1
                };
            },

            /**
             * Private instance members.
             */
            Private: {
                __ctor: function() {
                    this.handleError = this.error = this.error.bind(this);      // aliased
                    this.getUserIdentifier = this.getUserIdentifier.bind(this);

                    // overwrite error handler and user id function
                    this.Tools.onError = function(err, message) {
                        this.Instance.Log.error(err, message);
                    };
                    this.Tools.getUserIdentifierImpl = function() {
                        return this.Instance.Log.getUserIdentifier();
                    };
                },

                getConfig: function() {
                    return this.Shared.cfg;
                },

                onClientBootstrap: function() {
                    this.client.setConfig(this.getConfig());
                },

                getUserIdentifier: function() {
                    var user = this.Instance.User.currentUser;
                    var userName;
                    if (!user) {
                        // ask communication layer for an identifier if user is not logged in
                        userName = this.Instance.Libs.ComponentCommunications.getUserIdentifier();
                     }
                     else {
                        userName = user.username;
                     }
                     return userName;
                },

                /** 
                 * User-related error
                 */
                error: function(err, message) {
                    var userName = this.getUserIdentifier();
                    var isException = err && err.stack;

                    if (isException) {
                        // extract some extra info from the error
                        var parent = err.parent;    // access the underlying error here
                        var sql = parent && parent.sql || err.sql;
                        console.error(squishy.objToString(err, true, 4));
                        var sqlMessage = sql && 'SQL error `' + sql + ']';
                        if (!message) {
                            if (sql) {
                                message = sqlMessage;
                            }
                            else {
                                message = 'exception';
                            }
                        }
                        else {
                            message += ' - ' + sqlMessage;
                        }
                        console.error(message = this.Tools.formatUserMessage((message && (message + ': ') || '')));
                        console.error(err.stack);
                        parent && parent.stack && console.error(parent.stack);
                    }
                    else {
                        var errString = err && err.message || err;
                        console.error(message = this.Tools.formatUserMessage((message && (message + ' - ') || '') + errString));
                    }
                    userLogger.error(message);

                    return errString;
                },

                warn: function(msg) {
                    var userName = this.getUserIdentifier();

                    var msg = '[' + userName + '] - ' + msg;

                    console.warn(msg);
                    userLogger.warn(msg);
                }
            },

            /**
             * Public instance methods that can be called by the client.
             */
            Public: {
            },
        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {
            /**
             * Called once after creation of the client-side instance.
             * Will be removed once called.
             */
            __ctor: function () {
            },

            /**
             * Called once after all currently deployed client-side 
             * components have been created.
             * Will be removed once called.
             */
            initClient: function() {

            },

            getConfig: function() {
                return this.cfg;
            },

            /**
             * This is optional and will be merged into the Client instance,
             * residing along-side the members defined above.
             */
            Private: {
            },

            /**
             * Public instance methods that can be called by the host.
             */
            Public: {
                setConfig: function(cfg) {
                    this.cfg = cfg;
                }
            }
        };
    })
});