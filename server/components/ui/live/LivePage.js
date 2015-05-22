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
            __ctor: function() {
                ThisComponent = this;
            },

            _registerDirectives: function(app) {
                // seven-seg directive
                // see: http://brandonlwhite.github.io/sevenSeg.js/
                app.lazyDirective('sevenSeg', function() {
                    var linkFun = function($scope, $element, $attrs) {
                        AngularUtil.decorateScope($scope);

                        $scope.bindAttrExpression($attrs, 'settings', function(settings) {
                            settings = settings || {};

                            // green by default
                            settings.colorOn = settings.colorOn || '#00FF00';
                            settings.colorOff = settings.colorOff || '#003200';
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
                    $scope.userCache = Instance.User.users;
                    $scope.deviceCache = Instance.WifiSnifferDevice.wifiSnifferDevices;
                    $scope.datasetCache = Instance.WifiDataset.wifiDatasets;
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

                return Instance.CommonDBQueries.queries.PeopleCount({
                    //timeFrameSeconds: 30000000
                    timeFrameSeconds: 300
                })
                .finally(function() {
                    ThisComponent.busy = false;
                })
                .then(function(deviceCounts) {
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