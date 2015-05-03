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
                ThisComponent.selection = new Instance.UIMain.SelectionState('deviceId');

                // create DevicePage controller
                app.lazyController('deviceCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    // customize your $scope here:
                    $scope.deviceCache = Instance.WifiSnifferDevice.wifiSnifferDevices;

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
                            ThisComponent.selection.toggleSelection(newDevice);
                            ThisComponent.page.invalidateView();
                        })
                        .catch(function(err) {
                            ThisComponent.deviceSaved = false;
                            $scope.handleError(err);
                        });
                    };

                    $scope.clickSave = function(device, done) {
                        $scope.onChange();

                        ThisComponent.deviceSaving = true;
                        ThisComponent.deviceSaved = true;

                        Promise.join(
                            Instance.WifiSnifferDevice.wifiSnifferDevices.updateObject(device),
                            Instance.User.users.updateObject(device.getUserNow())
                        )
                        .finally(function() {
                            ThisComponent.deviceSaving = false;
                        })
                        .then(function(newDevice) {
                            if (done) {
                                // we are done editing
                                ThisComponent.selection.unsetSelection();
                            }
                            ThisComponent.page.invalidateView();
                        })
                        .catch(function(err) {
                            ThisComponent.deviceSaved = false;
                            $scope.handleError(err);
                        });
                    };


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
                            // user pressed Ok -> Tell host to delete it.
                            doReset(device);
                        };
                        var onDismiss;      // don't do anything on dismiss
                        $scope.okCancelModal('', title, body, onOk, onDismiss);
                    };

                    var doReset = function(device) {
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
                            doDelete(device);
                        };
                        var onDismiss;      // don't do anything on dismiss
                        $scope.okCancelModal('', title, body, onOk, onDismiss);
                    };

                    var doDelete = function(device) {
                        // delete user object (device will be deleted with it)
                        Instance.User.users.deleteObject(device.getUserNow().uid)
                        .then(function() {
                            // stop editing
                            ThisComponent.selection.unsetSelection();

                            // invalidate view
                            ThisComponent.page.invalidateView();
                        })
                        .catch($scope.handleError.bind($scope));
                    };



                    $scope.onChange = function() {
                        $scope.errorMessage = null;
                        ThisComponent.deviceSaved = false;
                    };
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Device', this.assets.template, {
                    iconClasses: 'fa fa-cogs'
                });
            },

            onPageActivate: function() {
                return Promise.join(
                    // load all devices into cache
                    Instance.WifiSnifferDevice.wifiSnifferDevices.readObjects(),

                    // load all users into cache
                    Instance.User.users.readObjects()
                )
                .then(function() {
                    ThisComponent.page.invalidateView();
                });
            },


            cacheEventHandlers: {
                wifiSnifferDevices: {
                    sendingReadQueryToHost: function(queryInput) {
                        ThisComponent.loading = true;
                        ThisComponent.page.invalidateView();
                    },
                    updated: function(newValues) {
                        ThisComponent.loading = false;
                        ThisComponent.page.invalidateView();
                    }
                },
            }
        };
    })
});