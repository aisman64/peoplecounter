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

                    $scope.labels = [];
                    $scope.series = [];
                    $scope.data = [
                        [],
                        []
                    ];

                     $scope.options = {
                        scaleBeginAtZero: true,
                     }



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

                ThisComponent.HistoryGraphOpen = false;

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
                    }),
                    
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
                // TODO: Graph does not refresh when timeframe is changed
                // TODO: Put the response data in graph

                var promises = [];
               
                return Instance.CommonDBQueries.queries.PacketSum({ 
                    timePeriod : timeFrameSeconds
                })
                .then(function(packets) {
                    var labels = []
                    var series = ['sum']
                    var data = [[]]

                    for (var i = 0;i < packets.length;i++){
                        labels.push(packets[i].timeNearTo)
                        data[0].push(parseInt( packets[i].count));
                    }



                    // console.log(packets);
                        // var data = [[
                        //         [65, 59, 80, 81, 56, 55, 40],
                        //         [28, 48, 40, 19, 86, 27, 90]
                        //     ], 
                        //     [
                        //         [49, 9, 36, 78, 26, 45, 70],
                        //         [68, 78, 30, 49, 56, 67, 50]
                        //     ],
                        //     [
                        //         [51, 49, 60, 61, 36, 45, 60],
                        //         [68, 78, 60, 69, 56, 67, 60]
                        //     ] ];

                        // console.log('hello world');
                        // var ii = Math.floor(Math.random() * (3 - 0));
                        // console.log(ii)
                        // console.log(data);
                        // console.log(labels);
                        // console.log(series);
                        ThisComponent.page.scope.data = data;
                        ThisComponent.page.scope.labels = labels;
                        ThisComponent.page.scope.series = series;
                })
                .then(function() {
                    
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