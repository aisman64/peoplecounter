/**
 *
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
             * Localizer class.
             *
             * @constructor
             */
            LocalizerClass: squishy.createClass(function(cfg) {
                console.assert(cfg.dict, 'INTERNAL ERROR: Could not create Localizer.');

                this.dict = cfg.dict;

                /**
                 * Fallback Locale, if entry for `locale` does not exist.
                 */
                this.defaultLocale = 'en';

                this.locale = cfg.defaultLocale || 'en';
            },{ 
                setLocale: function(locale) {
                    this.locale = locale;
                },

                /**
                 * Builds a composite key from the given propName and locale to lookup
                 * a localized property in data.
                 */
                getLocalizedProperty: function(locale, data, propName) {
                    var key = propName + '_' + locale;
                    return data[key];
                },

                /**
                 * Lookup the given key in the given data object, 
                 * with the localized version of the given propName.
                 */
                buildMessageFromProperty: function(locale, data, propName, args, argsIdxStart) {
                    var str = this.getLocalizedProperty(locale, data, propName);

                    // lookup format string according to key
                    if (!str) {
                        // could not find entry
                        if (locale !== this.defaultLocale) {
                            if (locale !== this.locale) {
                                // try preferred locale
                                str = this.getLocalizedProperty(this.locale, data, propName);
                            }
                            if (!str) {
                                // try fall-back locale
                                str = this.getLocalizedProperty(this.defaultLocale, data, propName);
                            }
                        }
                        if (!str) {
                            str = data[locale];
                        }
                        if (!str) {
                            return '[MISSING TRANSLATION FOR PROPERTY: ' + propName + ']';
                        }
                    }

                    // replace arguments in format string and return it
                    return this.replaceArgs(str, args, argsIdxStart);
                },


                // #########################################################################################
                // Property Lookup
                
                /**
                 * Lookup the given key for the current locale, with argument replacement.
                 */
                lookUp: function(key, args) {
                    var locale;

                    if (key && key.key) {
                        // first argument is a complex object containing all arguments.
                        key = key.key;
                        args = key.args;
                        locale = key.locale;
                    }

                    // make sure, locale is set
                    locale = locale || this.locale;

                    var areArgsArray = args instanceof Array;
                    return this.buildMessageFromDict(locale, key, areArgsArray ? args : arguments, areArgsArray ? 0 : 1);
                },
                
                /**
                 * Looks up the given key for the given locale, with argument replacement.
                 */
                lookUpLocale: function(locale, key, args) {
                    if (key && key.key) {
                        // first argument is a complex object containing key and args
                        key = key.key;
                        args = key.args;
                        locale = locale || key.locale;
                    }

                    // make sure, locale is set
                    locale = locale || this.locale;

                    var areArgsArray = args instanceof Array;
                    return this.buildMessageFromDict(locale, key, areArgsArray ? args : arguments, areArgsArray ? 0 : 2);
                },
                
                lookUpForUser: function(user, key, args) {
                    var locale = user && user.locale;
                    return this.lookUpLocale(locale, key, args);
                },

                /**
                 * Lookup the given key in the current dictionary.
                 */
                buildMessageFromDict: function(locale, key, args, argsIdxStart) {
                    var dict = this.dict[locale];
                    var str;
                    if (!key) {
                        var msg = '[ERROR: Localizer.lookUp method is missing `key` argument ' +
                            ' to represent the translation entry to be looked up.]';
                        console.error(msg);
                        return msg;
                    }

                    // lookup format string according to key
                    if (!dict || !(str = dict[key])) {
                        // could not find entry
                        if (locale !== this.defaultLocale) {
                            if (locale !== this.locale) {
                                // try preferred locale
                                locale = this.locale;
                            }
                            else {
                                // try fall-back locale
                                locale = this.defaultLocale;
                            }
                            return this.buildMessageFromDict(locale, key, args, argsIdxStart);
                        }
                        return '[MISSING TRANSLATION FOR KEY: ' + key + ']';
                    }

                    // replace arguments in format string and return it
                    return this.replaceArgs(str, args, argsIdxStart);
                },
                


                // #########################################################################################
                // Message building
                
                /**
                 * Simplistic templating. Arguments are defined as {1}, {2}, etc.
                 * The regex is mostly copied from node-localize (https://github.com/AGROSICA/node-localize).
                 */
                replaceArgs: function(outString, args, argsIdxStart) {
                    // TODO: Improve performance - First find all occurences, then build a single new string.
                    var idx = 1;
                    for(var i = argsIdxStart; i < args.length; ++i, ++idx) {
                        var arg = args[i];
                        outString = outString.replace(new RegExp("\\{" + idx + "\\}", "g"), arg);
                    }
                    return outString;
                },

                localeExists: function(locale) {
                    return locale && !!this.dict[locale];
                },
                
                /**
                 * Returns all resources.
                 */
                getDict: function() {
                    return this.dict;
                },

                getAllLocales: function() {
                    return Object.keys(this.dict);
                }
            }),

            /**
             * Called right before `initHost` and `initClient`.
             */
            initBase: function() {
            },

            /**
             * Public instance methods that can be called by the other side.
             */
            Public: {
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var fs = require('fs');
        
        /**
         * Read all language files from the given directory and 
         * return single dictionary containing them all.
         */
        var readLang = function(dir) {
            var dict = {};
            try {
                var files = fs.readdirSync(dir);
                for(var i in files){
                    if (!files.hasOwnProperty(i)) continue;
                    var fname = files[i];
                    if (!fname.endsWith('.json')) continue; // only json files

                    var langName = fname.split('.', 1)[0];
                    
                    var path = dir + '/' + fname;
                    var data = fs.readFileSync(path);
                    
                    // read all translations of the language and append to dictionary
                    var file = JSON.parse(data);
                    
                    dict[langName] = file;
                }
            }
            catch (err) {
                process.exit(new Error('Unable to load lang files (' + fname + '): ' + err.stack));
            }
            return dict;
        };

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
            initHost: function() {
            },

            /**
             * Creates a new localizer and loads its data from file, 
             * according to the given configuration.
             */
            createLocalizer: function(cfg) {
                console.assert(cfg.folder, 'Localizer configuration requires (but did not have) `folder` parameter');

                // read translations from file
                cfg.dict = readLang(cfg.folder);

                // create localizer object
                var localizer = new this.LocalizerClass(cfg);

                // test localizer
                // localizer.dict.en.testt = 'hello {1} and {2}!';
                // var trans = localizer.lookUp('testt', ['a', 'b']);
                // console.log(trans);
                // console.assert(trans === 'hello a and b!');

                return localizer;
            },

            /**
             * Private instance members.
             */
            Private: {
                /**
                 * Is called only once per session and application start, 
                 * when the instance for the given session has been created.
                 * Will be removed once called.
                 */
                __ctor: function () {
                },

                /**
                 * Called when a client connected.
                 */
                onNewClient: function() {
                },

                /**
                 * Called after `onNewClient`, once this component is bootstrapped on the client side.
                 * Since components can be deployed dynamically, this might happen much later, or never.
                 */
                onClientBootstrap: function() {
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

            /**
             * Creates a new Localizer from the given data.
             */
            createLocalizer: function(localizerData) {
                // create localizer object
                var localizer = new this.LocalizerClass(localizerData);
                return localizer;
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
            }
        };
    })
});