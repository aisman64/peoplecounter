/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(Shared, Context) { return {
        Assets: {
            Files: {
                string: {
                    template: 'MapPage.html'
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
        var cities = [
            {
                city : 'HuaShan',
                desc : 'Culture park',
                latitude : 25.045574,
                longitude : 121.528325
            }
        ];

        return {
            __ctor: function() {
                ThisComponent = this;
            },

            /**
             * Prepares the home page controller.
             */
            setupUI: function(UIMgr, app) {
               


                app.lazyController('mapCtrl', ['$scope', 'uiGmapGoogleMapApi', 
                    function($scope, GoogleMapApi) {
                        $scope.positions = [];
                        $scope.addMarker = function(event) {
                            console.log(event);
                            $scope.x = event.latLng.A;
                            $scope.y = event.latLng.F;
                            var ll = event.latLng;
                            $scope.positions.push({lat:$scope.x, lng: $scope.y});
                            console.log($scope.positions);
                        };

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

                        

                    $scope.map = { 
                        center: { 
                            latitude: 24.045574, 
                            longitude: 121.228325 
                        }, 
                        zoom: 15,
                        markers: [{
                            id: 1,
                            latitude: 24.045574,
                            longitude: 121.228325,
                            showWindow: false,
                            options: {
                            animation: 1,
                            labelContent: 'Markers id 1',
                            labelAnchor: "22 0",
                            labelClass: "marker-labels"
                            }
                        },
                        ],
                    };



                     $scope.positions = [{ 
                        latitude: 24.045574, 
                        longitude: 121.228325 
                     }];

                     $scope.renewData = function(deviceId, timePeriod, timeRangeFromNow) {
                        if (typeof deviceId == 'undefined' ||
                            typeof timePeriod == 'undefined' ||
                            typeof timeRangeFromNow == 'undefined' )return;
                        ThisComponent.busy = true;
                        Instance.CommonDBQueries.queries.PacketSeries({ deviceId : deviceId, timePeriod : timePeriod, timeRangeFromNow : timeRangeFromNow})
                            .finally(function() {
                                ThisComponent.busy = false;
                            })
                            .then(function(packets) {
                                console.log('promise back');
                                console.log(packets);
                                var line = {
                                    key: 'Packet Number',
                                    color: '#ff7f0e',
                                    values : []

                                };
                                var index = 0;
                                for (var i = packets.length - 1;i >= 0; i--) {
                                    var point = {
                                        x : -i,
                                        y : packets[i].count,
                                    };
                                    line.values.push(point);
                                    index += 1;

                                }
                                var lineChart = [line];
                                $scope.data = lineChart


                            })
                            .catch(ThisComponent.page.handleError.bind(ThisComponent.page));

                     


                    };

                     $scope.queryByMacId = function(macId) {
                        if (typeof macId !== 'undefined') {
                            var queryData = {
                                where: {
                                    macId: macId
                                }
                            };
                            console.log('hello');
                            Instance.WifiPacket.wifiPackets.getObjects(queryData)
                            .then(function(data) {
                                console.log("then");
                                console.log(data);

                            })
                            .catch(function(error){
                                console.log("catch");
                                console.log(error);

                            });
                            // console.log(Instance.WifiPacket);

                        }




                     }
                    // $scope.addMarker = function(event) {
                    //     google.maps.event.addListener($scope.map, "click", function(event) {
                    //         var lat = event.latLng.lat();
                    //         var lng = event.latLng.lng();
                    //         // populate yor box/field with lat, lng
                    //         alert("Lat=" + lat + "; Lng=" + lng);
                    //     });
                    //     $scope.positions.push({latitude:lat,  longitude: lon});
                    //  }   
                    


                        // https://github.com/angular-ui/angular-google-maps/blob/7edede9372a95fba99b1abd49ebcfd2a85ec8c66/example/assets/scripts/controllers/example.js#L252
                                                              
                      UIMgr.registerPageScope(ThisComponent, $scope);
                }]);

                // register page
                Instance.UIMgr.registerPage(this, 'Map', this.assets.template, {
                    iconClasses: 'fa fa-cogs'
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
