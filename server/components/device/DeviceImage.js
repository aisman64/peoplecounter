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
            express
            mkdirp;

        var downloadRouter;

        return {
            __ctor: function () {
            },

            /**
             * 
             */
            initHost: function(app) {
                fs = require('fs');
                express = require('express');
                mkdirp = require('mkdirp');

                var deviceImageCfg = Shared.AppConfig.getValue('deviceImage');
                var imageFile = deviceImageCfg.filePath;     // location on disk
                var downloadPath = deviceImageCfg.downloadPath;     // download path, part of URL

                downloadRouter = express.Router();

                downloadRouter.get(function(req, res, next) {
                    // var Instance = req.Instance;
                    // if (!Instance) {
                    //     // could not look-up instance, meaning, the user has not bootstrapped first
                    //     res.redirect('/');
                    //     return;
                    // }

                    if (!this.doesImageExist()) {
                        // must generate image file first!
                        res.redirect('/Device');
                        return;
                    }

                    res.download(imageFile);
                }.bind(this));
 
                SharedTools.ExpressRouters.before.use(downloadPath, downloadRouter);
            },

            isImageBeingGenerated: function() {
                // TODO: File lock?
                return false;
            },

            doesImageExist: function() {
                var deviceImageCfg = Shared.AppConfig.getValue('deviceImage');
                var imageFile = deviceImageCfg.filePath;     // location on disk

                return !this.isImageBeingGenerated() && !fs.existsSync(imageFile);
            },

            Private: {
                onClientBootstrap: function() {
                },
                
                generateNewDeviceImage: function() {
                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject('error.invalid.permissions');
                    }

                    if (this.Shared.isImageBeingGenerated) {
                        // TODO: Sync on generation?
                        throw new Error('Image still being generated...');
                    }

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
                    });
                },
            },
            
            /**
             * Host commands can be directly called by the client
             */
            Public: {

                /**
                 * Re-directs to the image's download path.
                 * TODO: Add a button to DevicePage, to call this function.
                 */
                downloadDeviceImage: function() {
                    if (!this.Instance.User.isStandardUser()) {
                        // need to be logged in first!
                        return Promise.reject('error.invalid.permissions');
                    }

                    var deviceImageCfg = Shared.AppConfig.getValue('deviceImage');
                    var imageFile = deviceImageCfg.filePath;     // location on disk

                    var doDownload = function() {
                        // start downloading!
                        res.redirect(deviceImageCfg.downloadPath);
                    }.bind(this);

                    return Promise.resolve()
                    .bind(this)
                    .then(function() {
                        if (!this.Shared.doesImageExist()) {
                            // must generate image file first!
                            return this.generateNewDeviceImage();
                        }
                    })

                    // once finished -> start downloading!
                    .then(doDownload);
                }
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
        };
    })
});