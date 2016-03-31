
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
 
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {

        var passport,
            FacebookStrategy,
            authRouter,
            express,
            session;

        var authPath;

        return {
            /**
             * The ctor is called only once, during NoGap initialization,
             * when the shared component part is created.
             * Will be removed once called.
             */
            __ctor: function () {
                authPath = '/Auth';
            },

            /**
             * Is called once on each component after all components have been created.
             */
            initHost: function(app, cfg) {
                this.registerFacebookAuth(app, cfg);
            },

            registerFacebookAuth: function(app, cfg) {
                var facebookAppId = Shared.AppConfig.getValue('facebookAppID');
                var facebookAppSecret = Shared.AppConfig.getValue('facebookAppSecret');

                if (!facebookAppId || !facebookAppSecret) {
                    console.error('Facebook DISABLED. facebookAppId or facebookAppSecret has not been set.');
                    return;
                }

                express = require('express');
                passport = require('passport');
                FacebookStrategy = require('passport-facebook').Strategy;
                authRouter = express.Router();

                passport.serializeUser(function(user, done) {
                    done(null, user && user.uid || user);
                });

                // used to deserialize the user
                passport.deserializeUser(function(id, done) {
                    console.error('id');
                    done(null, id);
                });

                
                var facebookCallbackUrl = app.externalUrl + authPath + '/facebook/callback';

                passport.use(new FacebookStrategy({
                    clientID: facebookAppId,
                    clientSecret: facebookAppSecret, 
                    callbackURL: facebookCallbackUrl,
                    passReqToCallback : true
                },

                function(req, accessToken, refreshToken, profile, done) {
                    var Instance = req.Instance;
                    if (!Instance) {
						// could not look-up instance, meaning, the user has not bootstrapped first
                        done(new Error('Please refresh.'), null);
                        return;
                    }

                    process.nextTick(function() {
                        var authData = {
                            facebookID: profile.id,
                            facebookToken: accessToken,
                            userName: profile.name.familyName + ' ' + profile.name.givenName,
                            preferredLocale: profile._json && profile._json.locale && profile._json.locale.replace('_', '-')
                        };

                        Instance.User.tryLogin(authData)
                        .then(function(user) {
                            done(null, user);
                        })
                        .catch(function(err) {
                            done(err, null);
                        });
                    });
                })); 


                authRouter.use(function(req, res, next) {
                    //console.error(req.url);
                    next();
                });
                authRouter.get('/facebook', passport.authenticate('facebook', {scope: 'email'}));
                authRouter.get('/facebook/callback', 
                    passport.authenticate('facebook', {
                        successRedirect: '/',
                        failureRedirect: '/Guest'
                }));                
 
                SharedTools.ExpressRouters.before.use(passport.initialize());
                SharedTools.ExpressRouters.before.use(authPath, authRouter);
            },

            /**
             * Private instance members.
             */
            Private: {
                __ctor: function() {

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
