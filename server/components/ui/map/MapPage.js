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
                        // $scope.items = [{
                        //     id: 1,
                        //     img: 'pub/img/HuaShan.jpg',
                        // }
                        // ];
                        $scope.relations = [];
                       
                        $scope.dragendPos = function(event) {
                            //var markerId = infoWindow.visibleOnMarker;
                            console.log('王長宏');
                            console.log(event);
                            console.log(getMarker());
                                $scope.updateDevice({
                                    datasetSnifferRelationId: $scope.datasetSnifferRelationIdLast,
                                    deviceId: $scope.datasetIdLast,
                                    lat: event.latLng.A,
                                    lng: event.latLng.F
                            });
                           
                        }
                        // $scope.addReport = function() {
                        //   //  console.log('王長宏');
                        //   //$scope.showForm = !$scope.showForm; ---> if declaration is here, scope is updated and the form is shown
                        //     var newMarkerListener = google.maps.event.addListener($scope.map, 'click', function(event) {
                        //             placeMarker(event.latLng); // create the actual marker

                        //             //update the new report object
                        //             $scope.newReport.lat = event.latLng.lat();
                        //             console.log($scope.newReport.lat);
                        //             $scope.newReport.lng = event.latLng.lng();
                        //             $scope.$apply(function () { 
                        //                 $scope.showForm = !$scope.showForm; 
                        //             });
                        //             console.log($scope.showForm) // logs true
                        //             google.maps.event.addListener($scope.tempMarker,'dragend',function(event) {
                        //                 $scope.newReport.lat = event.latLng.lat();
                        //                 $scope.newReport.lng = event.latLng.lng();
                        //             });

                        //             google.maps.event.removeListener(newMarkerListener);
                        //     });
                        // }
                       
                        $scope.addMarker = function(event) {
                            
                                ThisComponent.busy = true;
                                Instance.WifiSnifferDevice.wifiSnifferDevices.getObjects()
                                    .then(function(data) {
                                    // console.log(data);
                                    $scope.deviceNum = data.length;
                                    $scope.deviceData = data;
                                        //console.log('王長宏');   
                                        //console.log(data[0].deviceId);                                         

                                    })
                                    .catch(function(error){
                                        console.log("catch");
                                        console.log(error);
                                    });
                                   
                                for(var i = 0; i < $scope.deviceNum; i++){                                        
                                    $scope.relations.push({deviceID: $scope.deviceData[i].deviceId, lat: 25.045574 , lng: 121.528325});
                                }    

                            //}    
                        };
                        
                       


                        $scope.setPosition = function(datasetSnifferRelationId, deviceId, lat, lng) {
                            $scope.updateDevice({
                                datasetSnifferRelationId: datasetSnifferRelationId,
                                deviceId: deviceId,
                                lat: lat,
                                lng: lng
                            });
                        };
                    
                        
                   

                        $scope.updateDevice = function(deviceUpdate) {
                            ThisComponent.busy = true;

                            //var devices = Instance.WifiSnifferDevice.wifiSnifferDevices;
                            var datasetDeviceRelations = Instance.WifiDatasetSnifferRelation.datasetSnifferRelation;
                            //var datasetDeviceRelations = Instance.WifiDatasetSnifferRelation.datasetSnifferRelation;

                            return datasetDeviceRelations.updateObject(deviceUpdate)
                            .finally(function() {
                                ThisComponent.busy = false;
                            })
                            .then(function(deviceSettings) {
                                // success!
                                ThisComponent.page.invalidateView();
                            })
                            .catch($scope.handleError.bind($scope));
                        };

                        

                    

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
                    iconClasses: 'fa fa-map-marker'
                });
            },

            onPageActivate: function() {
                var datasetCache = Instance.WifiDataset.wifiDatasets;
                var deviceCache = Instance.WifiSnifferDevice.wifiSnifferDevices;
                var userCache = Instance.User.users;

                // get all kinds of related data
                Promise.join(
                    // ....relations....
                    datasetCache.readObjects(),
                    deviceCache.readObjects(),
                    userCache.readObjects()
                )
                .finally(function() {
                    ThisComponent.busy = false;
                })
                .spread(function() {
                    ThisComponent.allRelationsOfDataset = relationCache.indices.datasetId.get(currentDatasetId);
                    ThisComponent.page.invalidateView();
                })
                .catch($scope.handleError.bind($scope));
            },

            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});
