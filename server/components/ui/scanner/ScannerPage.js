/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { 
        return {
            Assets: {
                Files: {
                    string: {
                        template: 'ScannerPage.html'
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
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
            ScannerSettings: {
                timeFrameSeconds: 600000000
            },

            __ctor: function() {
                ThisComponent = this;
                this.ScannerView = { open: {} };
                this.scannedMacs = [];
                this.colorsPerMacId = {};
            },

            initClient: function() {
                this.ScannerSettings.timeFrameSeconds = Instance.AppConfig.getValue('scannerTimeFrameSeconds') || 60;
            },

            /**
             * Prepares the scanner page controller.
             */
            setupUI: function(UIMgr, app) {
                // create Scanner controller
                app.lazyController('scannerCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    // customize your ScannerPage's $scope here:
                    $scope.ScannerView = ThisComponent.ScannerView;
                    $scope.ignoreCache = Instance.WifiScannerIgnoreList.wifiscannerIgnoreList;
                    $scope.historyCache = Instance.WifiScannerHistory.wifiScannerHistory;
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Scanner', this.assets.template, {
                    iconClasses: 'fa fa-wifi'
                });
            },


            runPromise: function(promise) {
                ThisComponent.busy = true;
                ThisComponent.page.invalidateView();

                return promise
                .finally(function() {
                    ThisComponent.busy = false;
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent));
            },


            refreshDelay: 500,

            refreshData: function() {
                ThisComponent.scanning = true;
                ThisComponent.page.invalidateView();
                
                return Promise.join(
                    Instance.CommonDBQueries.queries.CurrentlyScannedMACs(ThisComponent.ScannerSettings)
                    .then(function(scannedMacs) {
                        _.merge(ThisComponent.scannedMacs, scannedMacs);
                        //ThisComponent.scannedMacs = scannedMacs;
                    }),

                    Instance.WifiScannerIgnoreList.wifiscannerIgnoreList.readObjects(),

                    Instance.WifiScannerHistory.wifiScannerHistory.readObjects()
                )
                .finally(function() {
                    ThisComponent.scanning = false;
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent));;
            },

            toggleHistory: function(macEntry) {
                var historyCache = Instance.WifiScannerHistory.wifiScannerHistory;
                var historyEntry = historyCache.indices.macId.get(macEntry.macId);
                if (historyEntry) {
                    // remove
                    this.runPromise(historyCache.deleteObject(historyEntry));
                }
                else {
                    // add
                    this.runPromise(historyCache.createObject({
                        macId: macEntry.macId
                    }));
                }
            },

            toggleIgnore: function(macEntry) {
                var ignoreCache = Instance.WifiScannerIgnoreList.wifiscannerIgnoreList;
                var ignoreEntry = ignoreCache.indices.macId.get(macEntry.macId);
                if (ignoreEntry) {
                    // remove
                    this.runPromise(ignoreCache.deleteObject(ignoreEntry));
                }
                else {
                    // add
                    this.runPromise(ignoreCache.createObject({
                        macId: macEntry.macId
                    }));
                }
            },

            // ################################################################################################
            // Annotations

            onMACAnnotationUpdated: function(macId, macAnnotation) {
                ThisComponent.busy = true;

                //ThisComponent.host.updateMACAnnotation(macId, macAnnotation)
                Instance.MACAddress.macAddresses.updateObject({
                    macId: macId,
                    macAnnotation: macAnnotation
                })
                .finally(function() {
                    ThisComponent.busy = false;
                })
                .then(function() {
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent));
            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});