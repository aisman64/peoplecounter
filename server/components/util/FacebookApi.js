
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
        var FB,
            FB_ver,
            appID,
            appSecret;

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
                FB = require('fb');                
                FB_ver = 'v2.2';
                appID = Shared.AppConfig.getValue('facebookAppID');
                appSecret = Shared.AppConfig.getValue('facebookAppSecret');
            },

          sendNotifications: function(user, message) {
                var uid = user.facebookID;

                return new Promise(function(resolve, reject) {
                    FB.api(FB_ver + '/' + uid + '/notifications', 'post', { 
                          access_token: appID + '|' + appSecret,
                          href: 'localhost:9123',
                          template: message
                        }, function (res) {
                            if(!res || res.error) {
                                reject(res && res.error || 'error.unknown');
                            }
                            else {
                                resolve();
                            }
                        }
                    );
                });                
            },

            sendTestingNotifications: function() {
                //var user = this.Instance.User.currentUser;
                //var uid = this.Instance.User.facebookID;

                return new Promise(function(resolve, reject) {
                    FB.api(FB_ver + '/' + '100000413302421' + '/notifications', 'post', { 
                          access_token: appID + '|' + appSecret,
                          href: 'localhost:9123',
                          template: 'Testing Testing Testing'
                        }, function (res) {
                            if(!res || res.error) {
                                reject(res && res.error || 'error.unknown');
                            }
                            else {
                                resolve();
                            }
                        }
                    );
                });                
            },

            // return group_id not handle => need to save in database
            createNewFacebookGroup: function(groupName, groupPrivacy, groupAdmin) {

                return new Promise(function(resolve, reject) {
                    FB.api(FB_ver + '/' + appID + '/groups', 'post', {
                        access_token: appID + '|' + appSecret,
                        name: groupName,
                        privacy: groupPrivacy,
                        admin: groupAdmin
                    }, function (res) {
                        if(!res || res.error) {
                            reject(res && res.error || 'error.unknown');
                        }
                        else {
                            resolve();
                        }
                    });
                });                
            },

            createNewFacebookTestingGroup: function() {

                return new Promise(function(resolve, reject) {
                    FB.api(FB_ver + '/' + appID + '/groups', 'post', {
                         access_token: appID + '|' + appSecret,
                        name: 'This is a Testing Group of BJT5566',
                        privacy: 'closed',
                        admin: '1037745766240090'
                    }, function (res) {
                        if(!res || res.error) {
                            reject(res && res.error || 'error.unknown');
                        }
                        else {
                            resolve();
                        }
                    });
                });
            },

            // to be finished
            addNewUserToFacebookGroup: function(group, user) {
                var groupID = gorup.id;
                var userID = user.facebookID;

                return new Promise(function(resolve, reject) {
                    FB.api(FB_ver + '/' + groupID + '/members', 'post', {
                        access_token: appID + '|' + appSecret,
                        member: userID
                    }, function (res) {
                        if(!res || res.error) {
                            reject(res && res.error || 'error.unknown');
                        }
                        else {
                            resolve();
                        }
                    });
                });
            },

            addNewUserToTestingFacebookGroup: function() {
                return new Promise(function(resolve, reject) {
                    FB.api(FB_ver + '/' + '1542457789356843' + '/members', 'post', {
                        access_token: appID + '|' + appSecret,
                        member: '100000413302421'
                        //from: '1037745766240090'
                    }, function (res) {
                        if(!res || res.error) {
                            reject(res && res.error || 'error.unknown');
                        }
                        else {
                            resolve();
                        }
                    });
                });
            },

            postNewMeesageToFacebookGroup: function(group, message) {
                var groupID = group.id;

                return new Promise(function(resolve, reject) {
                    FB.api(FB_ver + '/' + groupID + '/feed', 'post', {
                        access_token: appID + '|' + appSecret,
                        message: message
                    }, function (res) {
                        if(!res || res.error) {
                            reject(res && res.error || 'error.unknown');
                        }
                        else {
                            resolve();
                        }
                    });
                });
            },

            postNewMessageToTestingFacebookGroup: function() {
                return new Promise(function(resolve, reject) {
                    FB.api(FB_ver + '/' + '1542457789356843' + '/feed', 'post', {
                        access_token: appID + '|' + appSecret,
                        message: 'This is a testing message'
                    }, function (res) {
                        if(!res || res.error) {
                            reject(res && res.error || 'error.unknown');
                        }
                        else {
                            resolve();
                        }
                    });
                });

            },

            deleteFacebookGroup: function(group) {             
                var groupID = group.id;

                return new Promise(function(resolve, reject) {
                    FB.api(FB_ver + '/' + appID + '/groups/', 'delete', {
                        access_token: appID + '|' + appSecret,
                        group_id: groupID
                    }, function (res) {
                        if(!res || res.error) {
                            reject(res && res.error || 'error.unknown');
                        }
                        else {
                            resolve();
                        }
                    });
                });
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
                 // facebook sdk
                window.fbAsyncInit = function() {
                    //console.error('fbAsyncInit has benn called');
                    FB.init({
                        appId      : '369298383249820',
                        xfbml      : true,
                        version    : 'v2.2'
                    });
                };    

              (function(d, s, id){
                 var js, fjs = d.getElementsByTagName(s)[0];
                 if (d.getElementById(id)) {return;}
                 js = d.createElement(s); js.id = id;
                 js.src = "//connect.facebook.net/en_US/sdk.js";
                 fjs.parentNode.insertBefore(js, fjs);
               }(document, 'script', 'facebook-jssdk'));
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
