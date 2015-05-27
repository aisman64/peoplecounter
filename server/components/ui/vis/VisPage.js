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
                this.currentMacIdList = [];
                this.currentMacIdMap = {};
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
                    iconClasses: 'fa fa-bar-chart'
                });
            },

            toggleMacId: function(macId, enable) {
                enable = enable || enable === undefined && !this.currentMacIdMap[macId];
                if (enable) {
                    // enable
                    this.currentMacIdList.push(macId);
                    this.currentMacIdMap[macId] = 1;
                }
                else {
                    // disable
                    _.remove(this.currentMacIdList, function(macId2) {
                        return macId2 == macId;
                    });
                    delete this.currentMacIdMap[macId];
                }

                ThisComponent.page.invalidateView();
                ThisComponent.refreshAddressBar();
            },

            getPageArgs: function() {
                return ThisComponent.currentMacIdList.join(',');
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

            /**
             * Possible arguments: Array of comma-separated macIds (strings or numbers)
             */
            onPageActivate: function(pageArgs) {
                if (!Instance.User.isStandardUser()) return;

                var macIds;
                if (_.isString(pageArgs)) {
                    macIds = pageArgs.split(',');
                }
                else if (_.isArray(macIdStrings)) {
                    macIds = pageArgs;
                }

                // re-compute set of macIds
                ThisComponent.currentMacIdList = [];
                ThisComponent.currentMacIdMap = {};

                if (macIds) {
                    // 
                    macIds.forEach(function(macId_) {
                        var macId = _.isString(macId_) && parseInt(macId_) || macId_;
                        if (macId && !ThisComponent.currentMacIdMap[macId]) {
                            ThisComponent.currentMacIdList.push(macId);
                            ThisComponent.currentMacIdMap[macId] = 1;
                        }
                    });
                }

                ThisComponent.page.invalidateView();
                ThisComponent.refreshAddressBar();
            }
        };
    })
});