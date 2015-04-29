/**
 * The MaiI component kicks decides what to do, depending on the connecting Client
 */
"use strict";
 

var NoGapDef = require('nogap').Def;



module.exports = NoGapDef.component({
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { return {
        Assets: {
            AutoIncludes: {
            }
        },

        initHost: function(app, cfg) {
            // load default localization files
            Shared.Localizer.Default = Shared.Localizer.createLocalizer(cfg.localizer || {});
        },
        
        Private: {
            __ctor: function() {
            },

            getClientCtorArguments: function() {
                if (!this.Context.clientScriptOnly) {
                    return ['UIMain'];
                }
                else {
                    return ['DeviceMain'];
                }
            },

            onNewClient: function() {
                // enable these core components on the client initially
                var initialComponents = [
                    // Core stuff
                    'RuntimeError',
                    'AppConfig', 
                    'User',

                    // utilities
                    'CacheUtil',
                    'MiscUtil',
                    'Localizer',
                    'Log',
                    'ValidationUtil',
                    'Auth',

                    // kick things off!
                    'Main'
                ];

                var specializedComponents = [];
                if (!this.Context.clientScriptOnly) {
                    // add core UI components (UI-client only)
                    specializedComponents = [
                        'UIMgr',
                        'UIMain'
                    ];
                }
                else {
                    // add core Device components (device-client only)
                    specializedComponents = [
                        'DeviceMain'
                    ];
                }
                initialComponents.push.apply(initialComponents, specializedComponents);

                // decide on whether to send UI components
                return this.Tools.requestClientComponents(initialComponents)
                .bind(this)
                .then(function() {
                    // send default localizer to client
                    this.client.setDefaultLocalizer(Shared.Localizer.Default);
                })

                // then send other core components that depend on previous components to be ready
                .then(function() {
                    // return this.Tools.requestClientComponents(
                    //     'UIActivityTracker'
                    // );
                });
            },

            /**
             * This is called after `onNewClient`
             */
            onClientBootstrap: function() {
                // explicitely install caches
                this.Instance.CacheUtil.initCaches();

                // sanity check: Make sure, User cache is present
                console.assert(this.Instance.User.users, 'INTERNAL ERROR: Cache installation failed.');

                // resume user session
                return this.Instance.User.resumeSession();
            },
        }
    };}),
    

    
    Client: NoGapDef.defClient(function (Tools, Instance, Context) {
        var ThisComponent;
        var MainComponentName;

        return {
            // ################################################################################################################
            // Main initialization

            __ctor: function(_MainComponentName) {
                ThisComponent = this;
                MainComponentName = _MainComponentName;
            },

            events: {
            },

            /**
             * 
             */
            initClient: function() {
            },

            
            Public: {
                // ################################################################################################################
                // Events triggered directly by the server (or by client)

                setDefaultLocalizer: function(localizerData) {
                    Instance.Localizer.Default = Instance.Localizer.createLocalizer(localizerData);
                    this.updateClientLocale();
                },

                updateClientLocale: function() {
                    var locale = Instance.User.getCurrentLocale();
                    Instance.Localizer.Default.setLocale(locale);
                    if (typeof(moment) !== 'undefined') {
                        moment.locale(locale);  // update moment locale, too (for date + time formatting)
                    }
                },

                /**
                 * Invalidate certain aspects of the view
                 */
                onCurrentUserChanged: function(privsChanged) {
                    if (Instance.Localizer.Default) {
                        // update user locale
                        this.updateClientLocale();
                    }

                    Instance[MainComponentName].onCurrentUserChanged(privsChanged);
                }
            }
        };
    })
});