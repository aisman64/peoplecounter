/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            maxPacketsOnClient: 100
        };
    }),

    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var packetIncludes;
        var packetStreamLimit = 50;

        var componentsRoot = '../../';
        var libRoot = componentsRoot + '../lib/';

        return {
            Assets: {
                Files: {
                    string: {
                        template: 'LivePage.html'
                    }
                },
                AutoIncludes: {
                }
            },

            __ctor: function() {
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
            }
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
            /**
             * The different time frames over which to count people
             */
            PeopleCounterTimeFrames: [
                moment.duration({ minutes: 1 }),
                moment.duration({ minutes: 5 }),
                moment.duration({ hours: 1 }),
                moment.duration({ days: 1 }),
                moment.duration({ days: 7 }),
                moment.duration({ months: 1 }),
                moment.duration({ years: 1 })
            ],

            LayoutSettings: {
                BottomPanelOpen: false,
                BottomPanelHeight: '100px'
            },

            __ctor: function() {
                ThisComponent = this;
                ThisComponent.showPerDeviceInfo = false;
            },

            _registerDirectives: function(app) {
                // seven-seg directive
                // see: http://brandonlwhite.github.io/sevenSeg.js/
                app.lazyDirective('sevenSeg', function() {
                    var linkFun = function($scope, $element, $attrs) {
                        AngularUtil.decorateScope($scope);

                        // green by default
                        var settingsDefault = {
                            colorOn: '#00FF00',
                            colorOff: '#001100',
                            //colorBackground: 'white'
                        };

                        $scope.bindAttrExpression($attrs, 'settings', function(settings) {
                            settings = settings || {};
                            
                            squishy.mergeWithoutOverride(settings, settingsDefault);
                            $element.sevenSeg(settings);
                        });
                    };

                    return {
                        restrict: 'E',
                        link: linkFun,
                        replace: true,
                        template: '<div></div>'
                    };
                });
            },

            /**
             * Prepares the live page controller.
             */
            setupUI: function(UIMgr, app) {
                this._registerDirectives(app);

                // create Live controller
                app.lazyController('liveCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    // customize your $scope here:

                    // data
                    $scope.userCache = Instance.User.users;
                    $scope.deviceCache = Instance.WifiSnifferDevice.wifiSnifferDevices;
                    $scope.datasetCache = Instance.WifiDataset.wifiDatasets;

                    // layouting
                    $scope.LayoutSettings = ThisComponent.LayoutSettings;
                    $scope.toggleBottomPanel = function(isOpen) {
                        isOpen = isOpen === undefined ? !$scope.BottomPanelOpen : isOpen;
                        $scope.BottomPanelOpen = isOpen;
                        $scope.BottomPanelCurrentHeight = isOpen && $scope. BottomPanelHeight || 0;
                        console.error($scope.BottomPanelCurrentHeight);
                    };


                    $scope.toggleBottomPanel($scope.LayoutSettings.BottomPanelOpen);

                    $scope.options = {
                        chart: {
                            type: 'lineChart',
                            height: 510,
                            margin : {
                                top: 20,
                                right: 20,
                                bottom: 100,
                                left: 55
                            },
                            x: function(d){ return d.x; },
                            y: function(d){ return d.y; },
                            showTooltip : false,
                            useInteractiveGuideline: true,
                            dispatch: {
                                stateChange: function(e){ console.log("stateChange"); },
                                changeState: function(e){ console.log("changeState"); },
                                tooltipShow: function(e){ e.stopPropagation() },
                                tooltipHide: function(e){ console.log("tooltipHide"); }
                            },
                            xAxis: {
                                axisLabel: 'Time',
                                tickFormat: function(d){
                                    console.log(d);
                                    return d3.format('d')(d);
                                },
                            },
                            yAxis: {
                                axisLabel: 'People Count',
                                tickFormat: function(d){
                                    return d3.format('d')(d);
                                },
                                axisLabelDistance: 30,

                            },
                            transitionDuration: 0,
                            callback: function(chart){
                                console.log("!!! lineChart callback !!!");
                            }
                        },
                        tooltip: {
                            enable: false,

                        },
                        title: {
                            enable: true,
                            text: 'People Counter by Mac Address'
                        },
                        subtitle: {
                            enable: false,
                            text: 'Subtitle for simple line chart. Lorem ipsum dolor sit amet, at eam blandit sadipscing, vim adhuc sanctus disputando ex, cu usu affert alienum urbanitas.',
                            css: {
                                'text-align': 'center',
                                'margin': '10px 13px 0px 7px'
                            }
                        },
                        caption: {
                            enable: false,
                            html: '<b>Figure 1.</b> Lorem ipsum dolor sit amet, at eam blandit sadipscing, <span style="text-decoration: underline;">vim adhuc sanctus disputando ex</span>, cu usu affert alienum urbanitas. <i>Cum in purto erat, mea ne nominavi persecuti reformidans.</i> Docendi blandit abhorreant ea has, minim tantas alterum pro eu. <span style="color: darkred;">Exerci graeci ad vix, elit tacimates ea duo</span>. Id mel eruditi fuisset. Stet vidit patrioque in pro, eum ex veri verterem abhorreant, id unum oportere intellegam nec<sup>[1, <a href="https://github.com/krispo/angular-nvd3" target="_blank">2</a>, 3]</sup>.',
                            css: {
                                'text-align': 'justify',
                                'margin': '10px 13px 0px 7px'
                            }
                        }
                    };

                    

                    /*Random Data Generator */
                    


                    // $scope.data = [
                    // {key: 'Packet Number',
                    // color: '#ff7f0e',
                    // values : [{x : 1, y: 5}, {x : 2, y: 10}] }]
                    $scope.data = [];

                    



                });

                // register page
                Instance.UIMgr.registerPage(this, 'Live', this.assets.template, {
                    iconClasses: 'fa fa-calculator'
                });
            },

            onPageActivate: function() {
                var users = Instance.User.users;
                var devices = Instance.WifiSnifferDevice.wifiSnifferDevices;
                var datasets = Instance.WifiDataset.wifiDatasets;

                ThisComponent.currentTimeFrame = ThisComponent.currentTimeFrame || ThisComponent.PeopleCounterTimeFrames[0];

                // get all kinds of related data
                Promise.join(
                    users.readObjects(),
                    devices.readObjects(),
                    datasets.readObjects(),

                    this.refreshData()
                );
            },


            // ################################################################################################
            // Annotations


            // ################################################################################################
            // Filtering


            // ################################################################################################
            // Refreshing + real-time updates

            refreshDelay: 1000,

            refreshData: function() {
                if (ThisComponent.refreshPaused) return;

                ThisComponent.busy = true;
                ThisComponent.page.invalidateView();

                var timeFrameSeconds = ThisComponent.currentTimeFrame.asMilliseconds() / (1000);
                return Promise.join(
                    Instance.CommonDBQueries.queries.PeopleCount({
                        timeFrameSeconds: timeFrameSeconds,
                        includeDevices: ThisComponent.showPerDeviceInfo
                    })
                    .then(function(deviceCounts) {
                        ThisComponent.deviceCounts = deviceCounts;
                    })
                    
                    ThisComponent.fetchHistoryData(timeFrameSeconds)
                )
                .finally(function() {
                    ThisComponent.busy = false;
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent));
            },



            // ################################################################################################
            // History graph

            fetchHistoryData: function(timeFrameSeconds) {
                if (!ThisComponent.HistoryGraphOpen) return null;
                
                // TODO: Fix X-axis labels to be absolute, not relative
                // TODO: Fix Y-axis to start at 0
                // TODO: Graph does not refresh when timeframe is changed
                // TODO: What is `xRange`?
                // TODO: deviceId == 1?

                // var promises = [];
                // promises.push(Instance.CommonDBQueries.queries.PeopleCount({
                //         timeFrameSeconds: timeFrameSeconds,
                //         includeDevices: ThisComponent.showPerDeviceInfo
                //     })
                //     .then(function(deviceCounts) {
                //         ThisComponent.deviceCounts = deviceCounts;
                //     }));
                // if (!!ThisComponent.HistoryGraphOpen) {
                //     promises.push(Instance.CommonDBQueries.queries.PacketSeries({ deviceId : 1, 
                //         timePeriod : 60, timeRangeFromNow : 6000000})
                //     .then(function(packets) {
                //                     // console.log('promise back');
                //                     console.log(packets);
                //                     var lines = {
                                        

                //                     };

                //                     for (var i = packets.length - 1;i >= 0; i--) {
                //                         if ( !(packets[i].deviceId in lines)) {
                //                             lines[packets[i].deviceId] = 
                //                             {
                //                                 key: packets[i].deviceId,
                //                                 color: (d3.scale.category10())[packets[i].deviceId],
                //                                 values : []

                //                             };

                //                         } 
                //                         var point = {
                //                             x : -lines[packets[i].deviceId].values.length,
                //                             y : packets[i].count,
                //                         };
                                        
                //                         lines[packets[i].deviceId].values.push(point);


                //                     }
                //                     var lineChart = []
                //                     for (var deviceId in lines) {
                //                         lineChart.push(lines[deviceId]);
                //                     }

                //                     ThisComponent.page.scope.data = lineChart;


                                


                //             }));
                // }
                // console.log(timeFrameSeconds);

                var xRange = 100*24;                
                return Instance.CommonDBQueries.queries.PacketSeries({ 
                    deviceId : 1, 
                    timePeriod : timeFrameSeconds,
                    timeRangeFromNow : timeFrameSeconds*xRange
                })
                .then(function(packets) {
                        // console.log('promise back');
                        // console.log(packets);
                        var lines = {
                        
                        };

                        for (var i = packets.length - 1;i >= 0; i--) {
                            if ( !(packets[i].deviceId in lines)) {
                                lines[packets[i].deviceId] = 
                                {
                                    key: packets[i].deviceId,
                                    color: (d3.scale.category10())[packets[i].deviceId],
                                    values : []

                                };

                            } 
                            var point = {
                                x : -(lines[packets[i].deviceId].values.length+1),
                                y : packets[i].count,
                            };
                            
                            if (lines[packets[i].deviceId].values.length < xRange)lines[packets[i].deviceId].values.push(point);
                        }
                        
                        var lineChart = []
                        for (var deviceId in lines) {
                            lineChart.push(lines[deviceId]);
                        }

                        ThisComponent.page.scope.data = lineChart;
                })
                .then(function() {
                    d3.selectAll("text").attr("fill", 'white');
                });
            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});