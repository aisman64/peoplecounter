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
                ThisComponent.historyGraphPointLimit = 50;
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

                    // history graph
                    $scope.labels = [];
                    $scope.series = [];
                    $scope.data = [
                    ];

                    $scope.options = {
                        scaleBeginAtZero: true,
                    };

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
                if (!ThisComponent.HistoryGraphOpen) {
                    ThisComponent.labels = [];
                    ThisComponent.series = [];
                    ThisComponent.data = [];
                    return null;
                }

                if (ThisComponent.page.scope.labels.length == 0 
                    || !ThisComponent.page.scope.timeFrameSeconds 
                    || ThisComponent.page.scope.timeFrameSeconds != timeFrameSeconds ) {

                    ThisComponent.page.scope.timeFrameSeconds = timeFrameSeconds;

                    return Instance.CommonDBQueries.queries.PacketSum({ 
                        timePeriod : timeFrameSeconds,
                        pointLimit : ThisComponent.historyGraphPointLimit
                    })
                    .then(function(packets) { // first time
                        console.log('first time');
                        console.log(packets.length);
                        var labels = []
                        var series = ['sum']
                        var data = [[]]

                        for (var i = 0;i < packets.length;i++){
                            labels.push(packets[i].timeNearTo)
                            data[0].push(parseInt( packets[i].count));
                        }

                        ThisComponent.page.scope.data = data;
                        ThisComponent.page.scope.labels = labels;
                        ThisComponent.page.scope.series = series;

                    });

                } else { // incremental
                    console.log('incremental');
                    var labels = ThisComponent.page.scope.labels;
                    var latestTime = labels[labels.length - 1]
                    return Instance.CommonDBQueries.queries.PacketIncremental({ 
                        timePeriod : timeFrameSeconds,
                        latestTime : latestTime

                    })
                    .then(function(packets) {

                        var data = ThisComponent.page.scope.data;
                        var labels = ThisComponent.page.scope.labels;

                        // update the last data
                        var dataLength = data[0].length;
                        data[0][dataLength-1] = parseInt(packets[0].count);
                        
                        for (var i = 1;i < packets.length;i++){
                            labels.push(packets[i].timeNearTo)
                            data[0].push(parseInt( packets[i].count));
                        }

                        ThisComponent.page.scope.data = data;
                        ThisComponent.page.scope.labels = labels;
                        
                    });



                }


               
                
            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});