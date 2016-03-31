
/* Copyright (c) 2015-2016, <Christopher Chin>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */
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

                    $scope.fetchData = function(what, force) {
                        setTimeout(function() {
                            if (force) {
                                VisView.open[what] = true;
                            }
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
                recentMACs: function() {
                    return Instance.CommonDBQueries.queries.NewestMACs({ limit: 20 });
                },

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
                else if (_.isArray(pageArgs)) {
                    macIds = pageArgs;
                }
                else if (_.isNumber(pageArgs)) {
                    macIds = [pageArgs];
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
            },

            refreshData: function() {
                var promises = [];
                for (var what in VisView.open) {
                    if (VisView.open[what]) {
                        promises.push(ThisComponent.getVisData(what));
                    }   
                }

                return Promise.all(promises);
            },

            /**
             * Add/remove MAC to/from graph visualization
             */
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

            clearRelationshipGraph: function() {
                this.currentMacIdList = [];
                this.currentMacIdMap = {};

                ThisComponent.page.invalidateView();
                ThisComponent.refreshAddressBar();
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
        };
    })
});
