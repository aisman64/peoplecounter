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
                    template: 'MACSSIDGraphElement.html'
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
        var NodeType;

        return {
            RenderSettings: {
                minFontSize: 10,
                maxFontSize: 24,
                maxSSIDPopularity: 100
            },

            __ctor: function() {
                ThisComponent = this;
                NodeType = squishy.makeEnum([
                    'MAC',
                    'SSID'
                ]);
            },

            _patchSpringy: function() {
                // patch Springy library
                var _oldNodeGetHeight = Springy.Node.prototype.getHeight;
                Springy.Node.prototype.getHeight = function() {
                    if (this.data.height) {
                        return this.data.height;
                    }
                    return _oldNodeGetHeight.call(this);
                };
            },

            /**
             * Prepares the directive
             */
            setupUI: function(UIMgr, app) {
                // write element's link function
                var linkFun = function($scope, $element, $attrs) {
                    UIMgr.registerElementScope(ThisComponent, $scope);
                    
                    // customize your $scope here:
                    $scope.bindAttrExpression($attrs, 'macId', function(macId) {
                        $scope.prepGraph(macId);
                        $scope.macId = macId;
                    });

                    $scope.prepGraph = function(macId) {
                        if (!macId) return;
                        if (!Instance.User.isStandardUser()) return;

                        $scope.busy = true;
                        $scope.otherSsids = []; // all SSIDs that are not added to the graph

                        return Promise.join(
                            Instance.CommonDBQueries.host.computeMACRelationGraphPublic(macId)
                        )
                        .spread(function(macInfo) {
                            // make sure, container exists
                            $scope.$digest();

                            // get container element
                            var $container = $element.find('#macgraph');
                            console.assert($container.length, 'could not find graph canvas container');

                            $scope.genMACGraph($container, macInfo);
                        })
                        .finally(function() {
                            $scope.busy = false;
                            $scope.safeDigest();
                        })
                        .catch($scope.handleError.bind($scope));
                    };

                    /**
                     * Generate the graph around the given MAC
                     */
                    $scope.genMACGraph = function($container, macInfo) {
                        $scope.macInfo = macInfo;

                        var nodes = [];
                        var edges = [];

                        $scope.genGraph($container, nodes, edges);
                    };

                    $scope.genGraph = function($container, nodes, edges) {
                        // remove all existing elements
                        $container.empty();

                        // create new canvas
                        var $canvas = $('<canvas></canvas>');
                        $container.append($canvas);
                        $canvas.attr('width', $container.innerWidth());
                        $canvas.attr('height', $container.innerHeight());

                        // create and populate graph

                        var graph = new Springy.Graph();
                        var macNode = graph.newNode({
                            label: macInfo.macAddress,
                            type: NodeType.MAC,

                            selectedBackgroundColor: '#FFEEBB',
                            backgroundColor: '#FFFFAA',
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
                            var RenderSettings = ThisComponent.RenderSettings;
                            var fontRatio = Math.min(1, ssidPopularity / RenderSettings.maxSSIDPopularity);
                            var fontSize = RenderSettings.minFontSize + fontRatio * (RenderSettings.maxFontSize - RenderSettings.minFontSize);
                            var node = graph.newNode({
                                label: ssidName + ' (' + ssidPopularity + ')',
                                type: NodeType.SSID,
                                font: fontSize + 'px Verdana, sans-serif',
                                height: fontSize,
                                mass: fontSize,
                                selectedBackgroundColor: '#FFBBBB',
                                backgroundColor: '#FFAAAA'
                            });

                            // connect them with an edge
                            graph.newEdge(macNode, node);
                        };

                        var springy = $canvas.springy({
                            graph: graph,
                            damping: .1,
                            selectedBackgroundColor: '#FFAAAA',
                            backgroundColor: '#FFFFFF',
                        });
                        ThisComponent._patchSpringy(springy);
                    };
                };

                // mac-ssid-graph directive
                app.lazyDirective('macSsidGraph', function() {
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