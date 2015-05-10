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
                    template: 'SSIDPage.html'
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
             * Prepares the SSID page controller.
             */
            setupUI: function(UIMgr, app) {
                // create SSID controller
                app.lazyController('ssidCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    // customize your SSIDPage's $scope here:
                });

                // register page
                Instance.UIMgr.registerPage(this, 'SSID', this.assets.template, {
                    iconClasses: 'fa fa-wifi'
                });
            },

            onPageActivate: function() {
                ThisComponent.busy = true;

                Instance.CommonDBQueries.queries.MostOftenUsedSSIDs({ limit: 20 })
                .finally(function() {
                    ThisComponent.busy = false;
                })
                .then(function(mostOftenUsedSSIDs) {
                    ThisComponent.mostOftenUsedSSIDs = mostOftenUsedSSIDs;
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent.page));
            }
        };
    })
});