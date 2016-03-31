
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
                            //return macData.macEntry.macAddress;
                            var label = macData.macEntry.macAnnotation || macData.macEntry.macAddress;
                            if (macData.macEntry.OUI && macData.macEntry.OUI.model) {
                                label += ' (' + macData.macEntry.OUI.model + ')';
                            }
                            return label;
                        },
                        computeNodeWeight: function(macData) {
                            return .5;
                        },
                        selectedBackgroundColor: '#FFEEBB',
                        backgroundColor: '#FFFFAA'
                    },
                    SSID: {
                        getNodeLabel: function(ssidData) {
                            return ssidData.name + ' (' + ssidData.macIdCount + ')';
                        },
                        computeNodeWeight: function(ssidData) {
                            var nodeSize = ThisComponent.RenderSettings.maxSSIDPopularity - ssidData.macIdCount;
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

                var currentGraph;
                var $graphContainer;
                var nodesByLabel = {};
        
                // get container element
                $graphContainer = $element.find('#macgraph');
                console.assert($graphContainer.length, 'could not find graph canvas container');

                // customize your $scope here:
                $scope.$watchCollection($attrs.macIds, function(macIds) {
                    $scope.currentMacIds = macIds;
                    $scope.prepGraph(macIds);
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

                $scope.prepGraph = function(macIds) {
                    if (!macIds) return;
                    if (!Instance.User.isStandardUser()) return;

                    $scope._updateMACInfo(null);
                    $scope.setBusy(true, true);

                    return Promise.join(
                        Instance.CommonDBQueries.host.computeMACRelationGraphPublic(macIds)
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

                $scope.getNodeById = function(label) {
                    return currentGraph.nodeSet[label];
                };

                $scope.getNodeByLabel = function(label) {
                    return nodesByLabel[label];
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
                    
                    var node = currentGraph.newNode(nodeDescription);
                    nodesByLabel[label] = node;
                    return node;
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
                    nodesByLabel = {};

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
                        if (ssidData.macIdCount < 2) {
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

                            if (type == NodeType.SSID) {

                            }
                            else if (type == NodeType.MAC) {
                                $scope.PC.toggleMacId(typeData.macEntry.macId);
                            }
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
