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
                    template: 'MACPage.html'
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
             * Prepares the MAC page controller.
             */
            setupUI: function(UIMgr, app) {
                // create MAC controller
                app.lazyController('macCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    // customize your MACPage's $scope here:
                });

                // register page
                Instance.UIMgr.registerPage(this, 'MAC', this.assets.template, {
                    iconClasses: 'fa fa-mobile'
                });
            },

            onPageActivate: function() {
                if (!Instance.User.isStandardUser()) return;

                ThisComponent.busy = true;

                Instance.CommonDBQueries.queries.MostOftenSeenMACs({ limit: 20 })
                .finally(function() {
                    ThisComponent.busy = false;
                })
                .then(function(mostOftenSeenMACs) {
                    ThisComponent.mostOftenSeenMACs = mostOftenSeenMACs;
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent.page));
            }
        };
    })
});