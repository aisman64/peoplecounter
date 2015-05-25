/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Includes: [
        'MACSSIDGraphElement'
    ],

    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { return {
        Assets: {
            Files: {
                string: {
                    template: 'VisPage.html'
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
        var VisView;

        return {
            __ctor: function() {
                ThisComponent = this;
                VisView = this.VisView = { 
                    open: {},
                    busy: {},
                    data: {}
                };
            },

            /**
             * Prepares the MAC page controller.
             */
            setupUI: function(UIMgr, app) {
                // create MAC controller
                app.lazyController('visCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);

                    // customize your $scope here:
                    $scope.VisView = VisView;
                    
                    $scope.visualizeMACAddress = function(macId) {
                        Instance.UIMgr.gotoPage('Vis', macId);
                    }

                    $scope.fetchData = function(what) {
                        setTimeout(function() {
                            if (VisView.open[what]) {
                                ThisComponent.getVisData(what);
                            }
                        });
                    };
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Vis', this.assets.template, {
                    iconClasses: 'fa fa-wifi'
                });
            },

            getPageArgs: function() {
                return ThisComponent.currentMacId;
            },

            getVisData: function(what) {
                VisView.busy[what] = true;
                this.queryFunctions[what]()
                .finally(function() {
                    VisView.busy[what] = false;
                })
                .then(function(data) {
                    VisView.data[what] = data;
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent.page));
            },

            queryFunctions: {
                mostConnectedMACs: function() {
                    return Instance.CommonDBQueries.queries.MostConnectedMACs({ limit: 20 });
                },

                mostOftenUsedSSIDs: function() {
                    return Instance.CommonDBQueries.queries.MostOftenUsedSSIDs({ limit: 20 });
                },

                namedMACs: function() {
                    return Instance.CommonDBQueries.queries.NamedMACs();
                }
            },

            onPageActivate: function(pageArgs) {
                if (!Instance.User.isStandardUser()) return;

                ThisComponent.currentMacId = parseInt(pageArgs);
                ThisComponent.page.invalidateView();
            }
        };
    })
});