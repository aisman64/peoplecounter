/**
 * This component is responsible for configuring, resetting and maintaining device status
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Base` is available on Host and Client.
     */
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) { return {
        /**
         * 
         */
        initBase: function() {
            
        },
    };}),

    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { 
        var fs,
            path,
            express,
            mkdirp;

        return {
            __ctor: function () {
            },

            /**
             * 
             */
            initHost: function(app) {
                fs = require('fs');
                path = require('path');
                express = require('express');
                mkdirp = require('mkdirp');

                var deviceImageCfg = Shared.AppConfig.getValue('deviceImage');
                var imageFile = deviceImageCfg.filePath;     // location on disk
                var downloadPath = deviceImageCfg.downloadPath;     // download path, part of URL

                var downloadHandler = function(req, res, next) {
                    var Instance = req.Instance;
                    if (!Instance) {
                        // could not look-up instance. Meaning: the user has not bootstrapped first
                        res.redirect('/');
                        return;
                    }

                    var ThisInstance = Instance.DeviceImage;

                    var promise;
                    if (!this.doesImageExist()) {
                        // must generate image file first!
                        promise = ThisInstance.generateNewDeviceImage();
                    }
                    else {
                        // image file already exists
                        promise = Promise.resolve();
                    }
                    promise
                    .then(function() {
                        // image file has been generated! Go!
                        ThisInstance.Tools.log('Downloading device image from: ' + req.url);
                        res.download(imageFile);
                    });
                }.bind(this);
 
                SharedTools.ExpressRouters.before.get(downloadPath, downloadHandler);
            },

            isImageBeingGenerated: function() {
                // TODO: File lock?
                return false;
            },

            doesImageExist: function() {
                var deviceImageCfg = Shared.AppConfig.getValue('deviceImage');
                var imageFile = deviceImageCfg.filePath;     // location on disk

                return !this.isImageBeingGenerated() && fs.existsSync(imageFile);
            },

            Private: {
                onClientBootstrap: function() {
                },
                
                generateNewDeviceImage: function() {
                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }

                    if (this.Shared.isImageBeingGenerated()) {
                        // TODO: Sync on generation?
                        throw new Error('Image still being generated...');
                    }

                    this.Tools.log('Generating device image...');

                    if (this.Shared.doesImageExist()) {
                        // TODO: Delete?
                    }

                    var deviceImageCfg = Shared.AppConfig.getValue('deviceImage');
                    var imageFile = deviceImageCfg.filePath;     // location on disk
                    var imageFolder = path.dirname(imageFile);

                    // make sure, all parent folders exist
                    return new Promise(function(resolve, reject) {
                        mkdirp(imageFolder, function (err) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve();
                            }
                        });
                    })
                    .then(function() {
                        // TODO: Write `imageFile` here
                        fs.writeFileSync(imageFile, 'hi!');
                    });
                },
            },
            
            /**
             * Host commands can be directly called by the client
             */
            Public: {
            },
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
            __ctor: function() {
                ThisComponent = this;
            },

            /**
             * Device has initialized
             */
            initClient: function() {
            },

            /**
             * Re-directs to the image's download path.
             */
            downloadDeviceImage: function() {
                var deviceImageCfg = Shared.AppConfig.getValue('deviceImage');
                this.Instance.Libs.ComponentCommunications.redirect(deviceImageCfg.downloadPath, false);
            }
        };
    })
});