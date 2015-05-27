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
                ThisComponent.showDevices = false;
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

                    $scope.toggleHistoryGraph = function(isOpen) {
                        isOpen = isOpen === undefined ? !$scope.HistoryGraphOpen : isOpen;
                        $scope.HistoryGraphOpen = isOpen;
                        // console.error($scope.BottomPanelCurrentHeight);
                    };

                    // $scope.HistoryGraphOpen = false;

                    $scope.toggleBottomPanel($scope.LayoutSettings.BottomPanelOpen);

                    $scope.options = {
                        chart: {
                            type: 'lineChart',
                            height: 600,
                            margin : {
                                top: 20,
                                right: 20,
                                bottom: 100,
                                left: 55
                            },
                            x: function(d){ return d.x; },
                            y: function(d){ return d.y; },
                            useInteractiveGuideline: true,
                            dispatch: {
                                stateChange: function(e){ console.log("stateChange"); },
                                changeState: function(e){ console.log("changeState"); },
                                tooltipShow: function(e){ console.log("tooltipShow"); },
                                tooltipHide: function(e){ console.log("tooltipHide"); }
                            },
                            xAxis: {
                                axisLabel: 'Time'
                            },
                            yAxis: {
                                axisLabel: 'People(Mac Address) Count',
                                tickFormat: function(d){
                                    return d3.format('d')(d);
                                },
                                axisLabelDistance: 30
                            },
                            callback: function(chart){
                                console.log("!!! lineChart callback !!!");
                            }
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
                    


                    $scope.data = [];

                    



                });

                // register page
                Instance.UIMgr.registerPage(this, 'Live', this.assets.template, {
                    iconClasses: 'fa fa-bar-chart'
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

                return Instance.CommonDBQueries.queries.PeopleCount({
                    timeFrameSeconds: timeFrameSeconds,
                    includeDevices: ThisComponent.showDevices
                })
                .finally(function() {
                    ThisComponent.busy = false;
                })
                .then(function(deviceCounts) {
                    console.log(deviceCounts);
                    ThisComponent.deviceCounts = deviceCounts;
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent));
            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});