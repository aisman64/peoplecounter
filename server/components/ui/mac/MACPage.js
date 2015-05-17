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
                    $scope.visualizeMACAddress = function(macId) {
                        Instance.UIMgr.gotoPage('MAC', macId);
                    }
                });

                // register page
                Instance.UIMgr.registerPage(this, 'MAC', this.assets.template, {
                    iconClasses: 'fa fa-mobile'
                });
            },

            getPageArgs: function() {
                return ThisComponent.currentMacId;
            },

            onPageActivate: function(pageArgs) {
                if (!Instance.User.isStandardUser()) return;

                var promises = [];
                promises.push(
                    // Instance.CommonDBQueries.queries.MostOftenSeenMACs({ limit: 20 })
                    // .then(function(mostOftenSeenMACs) {
                    //     ThisComponent.mostOftenSeenMACs = mostOftenSeenMACs;
                    // })
                    Instance.CommonDBQueries.queries.MostConnectedMACs({ limit: 20 })
                    .then(function(mostConnectedMACs) {
                        ThisComponent.mostConnectedMACs = mostConnectedMACs;
                    })
                );

                ThisComponent.currentMacId = parseInt(pageArgs);
                if (ThisComponent.currentMacId) {
                    promises.push(
                        Instance.CommonDBQueries.host.computeMACRelationGraphPublic(ThisComponent.currentMacId)
                        .then(function(macGraphData) {
                            ThisComponent.macGraphData = macGraphData;
                            ThisComponent.page.invalidateView();        // make sure canvas exists

                            // create and populate graph
                            var NodeType = squishy.makeEnum(['MAC', 'SSID']);

                            var graph = new Springy.Graph();
                            var macNode = graph.newNode({
                                label: macGraphData.macAddress,
                                type: NodeType.MAC
                            });

                            for (var i = 0; i < macGraphData.ownSsids.length; ++i) {
                                var ssid = macGraphData.ownSsids[i];
                                var node = graph.newNode({
                                    label: ssid,
                                    type: NodeType.SSID
                                });

                                // connect them with an edge
                                graph.newEdge(macNode, node);
                            };


                            var $canvas = jQuery('#macGraph');
                            console.assert($canvas.length, 'could not find graph canvas');

                            jQuery(function(){
                              var springy = $canvas.springy({
                                graph: graph,
                                damping: .1
                              });
                            });
                        })
                    );
                }

                ThisComponent.busy = true;

                Promise.all(promises)
                .finally(function() {
                    ThisComponent.busy = false;
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent.page));
            }
        };
    })
});