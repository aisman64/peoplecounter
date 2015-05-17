/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side.
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { return {
        Assets: {
            Files: {
                string: {
                    template: 'MACInfoElement.html'
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
     * Everything defined in this `Client` lives only in the browser.
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
            __ctor: function() {
                ThisComponent = this;
            },

            /**
             * Prepares the directive
             */
            setupUI: function(UIMgr, app) {
                var linkFun = function($scope, $element, $attrs) {
                    UIMgr.registerElementScope(ThisComponent, $scope);
                    
                    // customize your $scope here:
                    $scope.bindAttrExpression($attrs, 'macId', function(newMacId) {
                        $scope.genGraph(newMacId);
                    });

                    $scope.genGraph = function(macId) {
                        if (!macId) return;
                        if (!Instance.User.isStandardUser()) return;

                        $scope.busy = true;
                        $scope.otherSsids = []; // all SSIDs that are not added to the graph

                        return Promise.join(
                            Instance.CommonDBQueries.host.computeMACRelationGraphPublic(macId)
                        )
                        .spread(function(macInfo) {
                            $scope.macInfo = macInfo;

                            // make sure, container exists
                            $scope.safeDigest();

                            // get container element
                            var $container = $element.find('#macgraph');
                            console.log($element[0].innerHTML);
                            console.assert($container.length, 'could not find graph canvas container');

                            // remove all existing elements
                            $container.empty();

                            // create new canvas
                            var $canvas = $container.append('<canvas>');
                            $canvas.attr('width', $container.innerWidth());
                            $canvas.attr('height', $container.innerHeight());

                            // create and populate graph
                            var NodeType = squishy.makeEnum(['MAC', 'SSID']);

                            var graph = new Springy.Graph();
                            var macNode = graph.newNode({
                                label: macInfo.macAddress,
                                type: NodeType.MAC
                            });

                            for (var i = 0; i < macInfo.ownSsids.length; ++i) {
                                var ssidData = macInfo.ownSsids[i];
                                var ssidPopularity = ssidData.macIds.length;
                                if (ssidPopularity < 2) {
                                    // no one else is on this SSID
                                    $scope.otherSsids.push(ssidData);
                                    continue;
                                }

                                var ssidName = ssidData.name;
                                var node = graph.newNode({
                                    label: ssidName + '(' + ssidPopularity + ')',
                                    type: NodeType.SSID
                                });

                                // connect them with an edge
                                graph.newEdge(macNode, node);
                            };

                            jQuery(function(){
                              var springy = $canvas.springy({
                                graph: graph,
                                damping: .1
                              });
                            });
                        })
                        .finally(function() {
                            $scope.busy = false;
                            $scope.safeDigest();
                        })
                        .catch($scope.handleError.bind($scope));
                    };
                };

                // mac-info directive
                app.lazyDirective('macInfo', function() {
                    return {
                        restrict: 'E',
                        link: linkFun,
                        replace: true,
                        template: ThisComponent.assets.template
                    };
                });

                // register element component
                Instance.UIMgr.registerElementComponent(this);
            }
        };
    })
});