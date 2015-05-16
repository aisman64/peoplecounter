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
