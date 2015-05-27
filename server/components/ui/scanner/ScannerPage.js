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
                this.colorsPerMacId = {};
            },

            /**
             * Prepares the scanner page controller.
             */
            setupUI: function(UIMgr, app) {
                // create Scanner controller
                app.lazyController('scannerCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    // customize your ScannerPage's $scope here:
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Scanner', this.assets.template, {
                    iconClasses: 'fa fa-wifi'
                });
            },


            refreshDelay: 500,

            refreshData: function() {
                ThisComponent.busy = true;
                ThisComponent.page.invalidateView();

                
                return Promise.join(
                    Instance.CommonDBQueries.queries.CurrentlyScannedMACs(ThisComponent.ScannerSettings)
                    .then(function(scannedMacs) {
                        ThisComponent.scannedMacs = scannedMacs;
                    })
                )
                .finally(function() {
                    ThisComponent.busy = false;
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