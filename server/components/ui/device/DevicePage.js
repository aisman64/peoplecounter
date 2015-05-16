/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { return {
        Assets: {
            Files: {
                string: {
                    template: 'DevicePage.html'
                }
            },
            AutoIncludes: {
            }
        },
                
        /**
         * 
         */
        initHost: function() {
            
        },
        
        /**
         * Host commands can be directly called by the client
         */
        Public: {
            
        },
    }}),
    
    
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
             * Prepares the home page controller.
             */
            setupUI: function(UIMgr, app) {
                ThisComponent.deviceSelection = new Instance.UIMain.SelectionState('deviceId');
                ThisComponent.datasetSelection = new Instance.UIMain.SelectionState('datasetId');

                // create DevicePage controller
                app.lazyController('deviceCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    // customize your $scope here:
                    $scope.DeviceJobType = Instance.WifiSnifferDevice.DeviceJobType;
                    $scope.deviceCache = Instance.WifiSnifferDevice.wifiSnifferDevices;
                    $scope.datasetCache = Instance.WifiDataset.wifiDatasets;


                    $scope.onChange = function() {
                        $scope.errorMessage = null;
                        ThisComponent.deviceSaved = false;
                    };


                    // #########################################################################################################
                    // Devices

                    $scope.registerNewDevice = function(name) {
                        $scope.onChange();

                        ThisComponent.deviceSaving = true;
                        ThisComponent.deviceSaved = true;

                        Instance.WifiSnifferDevice.host.registerDevice(name)
                        .finally(function() {
                            ThisComponent.deviceSaving = false;
                        })
                        .then(function(newDevice) {
                            // select new device!
                            ThisComponent.deviceSelection.toggleSelection(newDevice);
                            ThisComponent.page.invalidateView();
                        })
                        .catch(function(err) {
                            ThisComponent.deviceSaved = false;
                            $scope.handleError(err);
                        });
                    };

                    $scope.downloadImage = function(device) {
                        // start downloading image
                        Instance.DeviceImage.downloadDeviceImage();
                    };
                    

                    $scope.clickSaveDevice = function(device, done) {
                        $scope.onChange();

                        ThisComponent.deviceSaving = true;
                        ThisComponent.deviceSaved = true;

                        Promise.join(
                            //Instance.WifiSnifferDevice.wifiSnifferDevices.updateObject(device)
                            Instance.User.users.updateObject(device.getUserNow())
                        )
                        .finally(function() {
                            ThisComponent.deviceSaving = false;
                        })
                        .then(function(newDevice) {
                            if (done) {
                                // we are done editing
                                ThisComponent.deviceSelection.unsetSelection();
                            }
                            ThisComponent.page.invalidateView();
                        })
                        .catch(function(err) {
                            ThisComponent.deviceSaved = false;
                            $scope.handleError(err);
                        });
                    };

                    $scope.showDeviceConfig = function(device) {
                        if (ThisComponent.showDeviceConfig) {
                            // toggle it off
                            ThisComponent.showDeviceConfig = false;
                            return;
                        }

                        ThisComponent.busy = true;

                        Instance.DeviceConfiguration.host.getDeviceConfigPublic(device.deviceId)
                        .finally(function() {
                            ThisComponent.busy = false;
                        })
                        .then(function(deviceSettings) {
                            ThisComponent.currentDeviceSettings = deviceSettings;
                            ThisComponent.showDeviceConfig = true;
                            ThisComponent.page.invalidateView();
                        })
                        .catch($scope.handleError.bind($scope));
                    };

                    $scope.setDataset = function(device, dataset) {
                        $scope.updateDevice({
                            deviceId: device.deviceId,
                            currentDatasetId: dataset.datasetId
                        });
                    };

                    $scope.setDeviceJobType = function(device, jobType) {
                        $scope.updateDevice({
                            deviceId: device.deviceId,
                            currentJobType: jobType
                        });
                    };

                    $scope.updateDevice = function(deviceUpdate) {
                        ThisComponent.busy = true;

                        var devices = Instance.WifiSnifferDevice.wifiSnifferDevices;

                        return devices.updateObject(deviceUpdate)
                        .finally(function() {
                            ThisComponent.busy = false;
                        })
                        .then(function(deviceSettings) {
                            // success!
                            ThisComponent.page.invalidateView();
                        })
                        .catch($scope.handleError.bind($scope));

                    };


                    // #######################################################################################
                    // Reset + Delete

                    $scope.tryResetDevice = function(device) {
                        $scope.errorMessage = null;

                        // var nProblems = 0;
                        // if (nProblems > 0) {
                        // see: http://angular-ui.github.io/bootstrap/#modal
                        var title = 'WARNING - You are resetting `' + device.getUserNow().userName + '`';
                        var body = 'Upon next connection attempt, the device will get a new ' +
                            'configuration and new credentials without having to login first. ' +
                            'That is why the device has to reset soon, or attackers can use this vulnerability to hi-jack ' +
                            'device privlege levels. ' +
                            'Do you really want to reset device `' + device.getUserNow().userName + '`?';
                        var onOk = function() {
                            // user pressed Ok -> Tell host to reset it.
                            doResetDevice(device);
                        };
                        var onDismiss;      // don't do anything on dismiss
                        $scope.okCancelModal('', title, body, onOk, onDismiss);
                    };


                    var doResetDevice = function(device) {
                        Instance.WifiSnifferDevice.host.resetDevice(device.deviceId)
                        .then(function() {
                            // invalidate view
                            ThisComponent.page.invalidateView();
                        })
                        .catch($scope.handleError.bind($scope));
                    };


                    $scope.tryDeleteDevice = function(device) {
                        $scope.errorMessage = null;

                        // var nProblems = 0;
                        // if (nProblems > 0) {
                        // see: http://angular-ui.github.io/bootstrap/#modal
                        var title = 'WARNING - You are deleting `' + device.getUserNow().userName + '`';
                        var body = 'This way, the device will not be able to log into the server anymore, ' +
                            ' and you will need to re-configure it manually for future operation! ' +
                            'Do you really want to delete device `' + device.getUserNow().userName + '`?';
                        var onOk = function() {
                            // user pressed Ok -> Tell host to delete it.
                            doDeleteDevice(device);
                        };
                        var onDismiss;      // don't do anything on dismiss
                        $scope.okCancelModal('', title, body, onOk, onDismiss);
                    };

                    var doDeleteDevice = function(device) {
                        // delete user object (device will be deleted with it)
                        Promise.join(
                            Instance.User.users.deleteObject(device.getUserNow().uid),
                            Instance.WifiSnifferDevice.wifiSnifferDevices.deleteObject(device.deviceId)
                        )
                        .then(function() {
                            // stop editing
                            ThisComponent.deviceSelection.unsetSelection();

                            // invalidate view
                            ThisComponent.page.invalidateView();
                        })
                        .catch($scope.handleError.bind($scope));
                    };


                    // #########################################################################################################
                    // Datasets

                    $scope.startNewDataset = function(datasetName) {
                        // TODO: Create new dataset, then assign name and devices to it.
                        //      Eventually, archive the dataset...
                    };
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Device', this.assets.template, {
                    iconClasses: 'fa fa-cogs'
                });
            },

            onPageActivate: function() {
                return Promise.join(
                    // load all users into cache
                    Instance.User.users.readObjects(),

                    // load all devices into cache
                    Instance.WifiSnifferDevice.wifiSnifferDevices.readObjects(),

                    // load all datasets into cache
                    Instance.WifiDataset.wifiDatasets.readObjects()
                )
                .then(function() {
                    ThisComponent.page.invalidateView();
                });
            },

            cacheEventHandlers: {
                wifiSnifferDevices: {
                    sendingReadQueryToHost: function(queryInput) {
                        ThisComponent.busy = true;
                        ThisComponent.page.invalidateView();
                    },
                    updated: function(newValues) {
                        ThisComponent.busy = false;
                        ThisComponent.page.invalidateView();
                    }
                },
            }
        };
    })
});