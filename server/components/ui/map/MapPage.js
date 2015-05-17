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
                            $scope.setPosition(1, $scope.x, $scope.y);
                            alert($scope.x);
                            var ll = event.latLng;
                            $scope.positions.push({lat:$scope.x, lng: $scope.y});
                        };
                        
                        $scope.device1 =function(){
                            console.log("123123");
                        };

                        $scope.setPosition = function(deviceId, lat, lon) {
                            $scope.updateDevice({
                                deviceId: deviceId,
                                lat: lat,
                                lon: lon
                            });
                        };

                        $scope.updateDevice = function(deviceUpdate) {
                            ThisComponent.busy = true;

                            var devices = Instance.WifiSnifferDevice.wifiSnifferDevices;

                            return devices.updateObject(deviceUpdate)
                            .finally(function() {
                                ThisComponent.busy = false;
                            })
                            .then(function(deviceSettings) {
                                // success!
                                ThisComponent.page.invalidateView();
                            })
                            .catch($scope.handleError.bind($scope));
                        };

                        // $scope.queryByDeviceId = function(deviceId) {
                        //     console.log(deviceId);
                        //      console.log('王長宏');
                        //     if (typeof deviceId !== 'undefined') {
                        //         var queryData = {
                        //             where: {
                        //                 deviceId: deviceId
                        //             }
                        //         };
                        //         console.log('hello');
                        //         Instance.WifiPacket.wifiPackets.getObjects(queryData)
                        //         .then(function(data) {
                        //             console.log("then");
                        //             console.log(data);

                        //         })
                        //         .catch(function(error){
                        //             console.log("catch");
                        //             console.log(error);

                        //         });
                        //         // console.log(Instance.WifiPacket);
                        //     }
                        // };

                    

                        $scope.queryByMacId = function(macId) {
                            if (typeof macId !== 'undefined') {
                                var queryData = {
                                    where: {
                                        macId: macId
                                    }
                                };
                                console.log('hello');
                                Instance.MACAddress.macAddresses.getObjects(queryData)
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
