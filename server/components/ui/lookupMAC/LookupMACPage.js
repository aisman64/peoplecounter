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
                    template: 'LookupMACPage.html'
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
             * Prepares the lookupMAC page controller.
             */
            setupUI: function(UIMgr, app) {
                // create LookupMAC controller
                app.lazyController('lookupMACCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    // customize your LookupMACPage's $scope here:
                });

                // register page
                Instance.UIMgr.registerPage(this, 'LookupMAC', this.assets.template, {
                    iconClasses: 'fa fa-mobile'
                });
            },

            onPageActivate: function() {
                Instance.CommonDBQueries.queries.MostOftenSeenSSIDs()
                .then(function(mostOftenSeenSSIDs) {
                    ThisComponent.mostOftenSeenSSIDs = mostOftenSeenSSIDs;
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent.page));
            }
        };
    })
});