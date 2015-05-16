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
                js: [
                    'http://maps.googleapis.com/maps/api/js?key=&sensor=false&extension=.js',
                    'lib/angular/angular-google-maps.min',
                    'lib/angular/ng-map.min',
                    //'lib/angular/ng-map.js',
                    'lib/angular/ng-map.debug.js'
                    //'https://rawgit.com/allenhwkim/angularjs-google-maps/master/build/scripts/ng-map.js',
                ]
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
                        

                    

                     $scope.queryByMacId = function(macId) {
                        if (typeof macId !== 'undefined') {
                            var queryData = {
                                where: {
                                    macId: macId
                                }
                            };
                            console.log('hello');
                            Instance.WifiSSIDPacket.wifiSSIDPackets.getObjects(queryData)
                            .then(function(data) {
                                console.log("then");
                                console.log(data);

                            })
                            .catch(function(error){
                                console.log("catch");
                                console.log(error);

                            });
                            // console.log(Instance.WifiSSIDPacket);

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
                    iconClasses: 'fa fa-map-marker'
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
