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
                // create Home controller

                app.lazyController('mapCtrl', function($scope) {
                    $scope.map = { center: { latitude: 25.045574, longitude: 121.528325 }, zoom: 17 };
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    /*$scope.myMarkers = [
                          {
                             "latitude":25.045574,
                             "longitude":121.528325
                          },
                          
                      ];
                    $scope.markers = $scope.myMarkers;
                    $scope.fit = true;    
                    */
                    /*var mapOptions = {
                    zoom: 4,
                    center: new google.maps.LatLng(40.0000, -98.0000),
                    mapTypeId: google.maps.MapTypeId.TERRAIN
                    }

                    $scope.map = new google.maps.Map(document.getElementById('map'), mapOptions);
*/
/*                    $scope.markers = [];
                        var infoWindow = new google.maps.InfoWindow();
    
                        var createMarker = function (info){
                        
                        var marker = new google.maps.Marker({
                            map: $scope.map,
                            position: new google.maps.LatLng(info.lat, info.long),
                            title: info.city
                        });
                        marker.content = '<div class="infoWindowContent">' + info.desc + '</div>';
                        
                        google.maps.event.addListener(marker, 'click', function(){
                            infoWindow.setContent('<h2>' + marker.title + '</h2>' + marker.content);
                            infoWindow.open($scope.map, marker);
                        });
                        
                        $scope.markers.push(marker);
                        
                    }  
                    
                    for (i = 0; i < cities.length; i++){
                        createMarker(cities[i]);
                    }
*/                    

    $scope.openInfoWindow = function(e, selectedMarker){
        e.preventDefault();
        google.maps.event.trigger(selectedMarker, 'click');
    }
                    // customize your HomePage's $scope here:
                });

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