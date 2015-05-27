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
                fontWithoutSize: 'px Verdana, sans-serif',
                minFontSize: 12,
                maxFontSize: 24,
                maxSSIDPopularity: 40,
                PerType: {
                    MAC: {
                        getNodeLabel: function(macData) {
                            return macData.macEntry.macAddress;
                        },
                        computeNodeWeight: function(macData) {
                            return .5;
                        },
                        selectedBackgroundColor: '#FFEEBB',
                        backgroundColor: '#FFFFAA'
                    },
                    SSID: {
                        getNodeLabel: function(ssidData) {
                            return ssidData.name + ' (' + ssidData.macIds.length + ')';
                        },
                        computeNodeWeight: function(ssidData) {
                            var nodeSize = ThisComponent.RenderSettings.maxSSIDPopularity - ssidData.macIds.length;
                            return Math.max(Math.min(1, nodeSize / ThisComponent.RenderSettings.maxSSIDPopularity), 0);
                        },
                        selectedBackgroundColor: '#FFBBBB',
                        backgroundColor: '#FFAAAA'
                    },
                }
            },

            __ctor: function() {
                ThisComponent = this;
                NodeType = squishy.makeEnum([
                    'MAC',
                    'SSID'
                ]);
            },

            /**
             * Prepares the directive
             */
            setupUI: function(UIMgr, app) {
                // mac-ssid-graph directive
                app.lazyDirective('macSsidGraph', function() {
                    return {
                        restrict: 'E',
                        link: ThisComponent.linkFun,
                        replace: true,
                        template: ThisComponent.assets.template,
                        require:'ngModel'
                    };
                });

                // register element component
                Instance.UIMgr.registerElementComponent(this);
            },

            linkFun: function($scope, $element, $attrs, $ngModelCtrl) {
                Instance.UIMgr.registerElementScope(ThisComponent, $scope);

                var currentGraph,
                    $graphContainer;
        
                // get container element
                $graphContainer = $element.find('#macgraph');
                console.assert($graphContainer.length, 'could not find graph canvas container');

                // customize your $scope here:
                $scope.bindAttrExpression($attrs, 'macId', function(macId) {
                    $scope.prepGraph(macId);
                });

                $scope.setBusy = function(isBusy, dontInvalidate) {
                    // use this hack-around for now...
                    $scope.PC.busy = isBusy;
                    if (!dontInvalidate) {
                        $scope.PC.page.invalidateView();
                    }
                };

                $scope._updateMACInfo = function(macEntries) {
                    $scope.macEntries = macEntries;
                    $ngModelCtrl.$setViewValue(macEntries);
                    $ngModelCtrl.$render();
                    //$scope.PC.page.invalidateView();
                };

                $scope.prepGraph = function(macId) {
                    if (!macId) return;
                    if (!Instance.User.isStandardUser()) return;

                    $scope._updateMACInfo(null);
                    $scope.setBusy(true, true);

                    return Promise.join(
                        Instance.CommonDBQueries.host.computeMACRelationGraphPublic([macId])
                    )
                    .spread(function(macEntries) {
                        // make sure, container exists
                        $scope.$digest();

                        $scope.genMACGraph(macEntries);
                    })
                    .finally(function() {
                        $scope.setBusy(false);
                    })
                    .catch($scope.handleError.bind($scope));
                };


                // #############################################################################
                // Graph functions

                $scope.getNodeByLabel = function(label) {
                    return currentGraph.nodeSet[label];
                };

                $scope.addGraphNode = function(nodeType, typeData, isOpen) {
                    var RenderSettings = ThisComponent.RenderSettings;
                    var NodeTypeSettings = RenderSettings.PerType[nodeType];

                    var label = typeData.label || NodeTypeSettings.getNodeLabel(typeData);
                    var nodeWeight = typeData.nodeWeight || NodeTypeSettings.computeNodeWeight(typeData);
                    var mass = typeData.mass || nodeWeight + 1;

                    var fontSize = RenderSettings.minFontSize + nodeWeight * (RenderSettings.maxFontSize - RenderSettings.minFontSize);

                    var nodeDescription = {
                        label: label,
                        type: NodeType[nodeType],
                        isOpen: isOpen,
                        font: fontSize + RenderSettings.fontWithoutSize,
                        height: fontSize,
                        mass: mass,
                        typeData: typeData
                    };

                    if (NodeTypeSettings) {
                        squishy.mergeWithoutOverride(nodeDescription, NodeTypeSettings);
                    }
                    return currentGraph.newNode(nodeDescription);
                };

                $scope.getOrCreateNode = function(nodeType, typeData, isOpen) {
                    var RenderSettings = ThisComponent.RenderSettings;
                    var NodeTypeSettings = RenderSettings.PerType[nodeType];

                    var label = typeData.label || NodeTypeSettings.getNodeLabel(typeData);
                    var node = $scope.getNodeByLabel(label);
                    if (!node) {
                        node = $scope.addGraphNode(nodeType, typeData, isOpen);
                    }
                    return node;
                };

                /**
                 * Generate the graph around the given MAC
                 */
                $scope.genMACGraph = function(macEntries) {
                    $scope._updateMACInfo(macEntries);

                    // create and populate graph
                    currentGraph = new Springy.Graph();

                    for (var i = 0; i < macEntries.length; ++i) {
                        var macEntry = macEntries[i];
                        var macData = {
                            macEntry: macEntry,
                            nodeMass: 10
                        };
                        var macNode = $scope.addGraphNode('MAC', macData, true);

                        $scope.addSSIDNodes(macNode, macEntry.ownSsids, macEntry.unsharedSsids = []);
                    };

                    $scope.drawCurrentGraph();
                };

                $scope.addSSIDNodes = function(macNode, allSsidData, unsharedSsids) {
                    for (var i = 0; i < allSsidData.length; ++i) {
                        var ssidData = allSsidData[i];
                        if (ssidData.macIds.length < 2) {
                            // no one else is on this SSID
                            unsharedSsids.push(ssidData);
                            continue;
                        }

                        //var ssidNodeSize = ssidData.macIds.length;
                        var node = $scope.getOrCreateNode('SSID', ssidData, false);

                        // connect them with an edge
                        currentGraph.newEdge(macNode, node);
                    };
                };

                $scope.drawCurrentGraph = function() {
                    console.assert(currentGraph, '`currentGraph` must be generated before calling `drawCurrentGraph`');

                    // remove all existing elements
                    $graphContainer.empty();

                    // create new canvas
                    var canvasCss = {
                        // 'overflow': 'visible',
                        // 'z-index': 10000
                    };
                    var $canvas = $('<canvas></canvas>');
                    $graphContainer.append($canvas);
                    $canvas.css(canvasCss);
                    $canvas.attr('width', $graphContainer.innerWidth());
                    $canvas.attr('height', $graphContainer.innerHeight());

                    // render graph in canvas
                    var springy = $canvas.springy({
                        graph: currentGraph,
                        damping: .2,
                        backgroundColor: '#FFFFFF',

                        nodeSelected: function(node) {
                            var type = node.data.type;
                            var typeData = node.data.typeData;
                            if (node.data.isOpen) {
                                // remove all children
                                var childEdgeList = currentGraph.adjacency[node.id];
                                for (var childId in childEdgeList) {
                                    var child = $scope.getNodeByLabel(childId);
                                    if (child) {
                                        currentGraph.removeNode(child);
                                    }
                                };
                                $scope.drawCurrentGraph();
                            }
                            else {
                                // query and append children
                                var promise;
                                $scope.setBusy(true);

                                if (type == NodeType.SSID) {

                                }
                                else if (type == NodeType.MAC) {
                                    var macId = typeData.macEntry.macId;
                                    promise = Instance.CommonDBQueries.host.computeMACRelationGraphPublic([macId])
                                    .then(function(macEntries) {
                                        $scope.genMACGraph(macEntries);
                                    });
                                }

                                promise.finally(function() {
                                    $scope.setBusy(false);
                                })
                                .catch($scope.handleError.bind($scope));
                            }
                            node.data.isOpen = !node.data.isOpen;
                        }
                    });

                    // patch Springy library (because it re-defines the Node prototype with every graph creation)
                    var _oldNodeGetHeight = Springy.Node.prototype.getHeight;
                    Springy.Node.prototype.getHeight = function() {
                        if (this.data.height) {
                            return this.data.height;
                        }
                        return _oldNodeGetHeight.call(this);
                    };

                    // update the rest of the element
                    $scope.$digest();
                };
            },
        };
    })
});