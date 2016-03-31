
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
 * The MaiI component kicks decides what to do, depending on the connecting Client
 */
"use strict";
 

var NoGapDef = require('nogap').Def;

var componentsRoot = './';
var libRoot = componentsRoot + '../lib/';
var pubFolder = componentsRoot + '../pub/';

module.exports = NoGapDef.component({
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { return {
        Assets: {
            Files: {
                code: {
                    /**
                     * We are using bcrypt on client side to generate a password from user input.
                     * Currently only used in the browser.
                     *
                     * @see https://github.com/dcodeIO/bcrypt.js
                     */
                    bcrypt: __dirname + '/' + libRoot + 'bcrypt.js',

                    /**
                     * moment.js for working with time, dates and timespans
                     *
                     * @see http://momentjs.com/
                     */
                    moment: __dirname + '/' + pubFolder + 'lib/moment.js'
                }
            }
        },

        initHost: function(app, cfg) {
            // load default localization files
            Shared.Localizer.Default = Shared.Localizer.createLocalizer(cfg.localizer || {});
        },

        __ctor: function() {
            
        },
        
        Private: {

            getClientCtorArguments: function() {
                if (!this.Context.clientNoHtml) {
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

                    // model components
                    'MACAddress',
                    'OUI',
                    'SSID',
                    'WifiDataset',
                    'WifiSSIDPacket',
                    'WifiActivityPacket',
                    'MAC_SSID_Relation',
                    'WifiScannerHistory',
                    'WifiScannerIgnoreList',

                    'WifiSnifferDevice',
                    'DeviceStatus',


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
                if (!this.Context.clientNoHtml) {
                    // add core UI components (UI-client only)
                    specializedComponents = [
                        'UIMgr',
                        'UIMain'
                    ];

                    // not a device Instance
                    this.Context.IsDevice = 0;
                }
                else {
                    // add core Device components (device-client only)
                    specializedComponents = [
                        'DeviceMain'
                    ];

                    // make this officially a device Instance
                    this.Context.IsDevice = 1;
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
                // bcrypt does some weird things... Need some fixing uppin` so it works the same on Node and in the browser
                this.assets.bcrypt = this.assets.bcrypt || dcodeIO.bcrypt;

                if (typeof(moment) === 'undefined') {
                    squishy.getGlobalContext().moment = this.assets.moment;
                }
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
