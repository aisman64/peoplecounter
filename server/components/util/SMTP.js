
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
        var nodemailer;
        var smtpSettings;
        var mailTransporter;

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
                nodemailer = require('nodemailer');

            	smtpSettings = Shared.AppConfig.getValue('smtp');
            	if (smtpSettings) {
					mailTransporter = nodemailer.createTransport({
					    service: smtpSettings.service,
					    auth: {
					        user: smtpSettings.user,
					        pass: smtpSettings.pass
					    }
					});
				}
            },

            /**
             * Private instance members.
             */
            Private: {
                __ctor: function() {
                },

                onClientBootstrap: function() {
                },

                /**
                 * @param mail.to
                 * @param mail.subject
                 * @param mail.text
                 * @param mail.html
                 */
                sendMail: function(mail) {
                	if (!mailTransporter) {
                		return Promise.reject(makeError('error.not.available', 'Tried to send mail, but config has no `smtp` settings.'));
                	}

                	if (!mail.to) {
                		return Promise.reject(makeError('error.invalid.request', 'mail missing `to` field'));
                	}

                	mail.from = mail.from || smtpSettings.from; // sender address

					// send mail with defined transport object
					return new Promise(function(resolve, reject) {
						mailTransporter.sendMail(mail, function(error, info){
						    if(error) {
						    	this.Tools.handleError(error, 'Unable to send mail');
						        reject(error);
						    }else{
						        this.Tools.log('Sent mail to `' + mail.to + '` [' + info.response + ']');
						        resolve(info);
						    }
						}.bind(this));
					}.bind(this));
                }
            },

            /**
             * Public instance methods that can be called by the client.
             */
            Public: {
            	sendMailPublic: function(mail) {
            		if (!this.Instance.User.isStaff()) return Promise.reject(makeError('error.invalid.permissions'));

            		return this.sendMail(mail);
            	}
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
        };
    })
});
