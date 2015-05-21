/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var packetIncludes;
        var packetStreamLimit = 10;

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
                getMostRecentPackets: function(lastId) {
                    packetIncludes = [{
                        model: Shared.SSID.Model,
                        as: 'SSID',
                        attributes: ['ssidName']
                    },{
                        model: Shared.MACAddress.Model,
                        as: 'MACAddress',
                        attributes: ['macAddress']
                    }];

                    var where = {};
                    var queryData = {
                        where: where,
                        include: packetIncludes,
                        order: 'time DESC'
                    };

                    if (lastId) {
                        where.packetId = {gt: lastId}
                    }
                    else {
                        // first query, just contains the latest few packets
                        queryData.limit = packetStreamLimit;
                    }

                    return this.Instance.WifiSSIDPacket.wifiSSIDPackets.findObjects(queryData);
                }
            },
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;
        var maxId;
        var refreshDelay;
        var refreshTimer;

        return {
            __ctor: function() {
                ThisComponent = this;
                maxId = null;
                refreshDelay = 500; // .5 seconds
            },

            /**
             * Prepares the live page controller.
             */
            setupUI: function(UIMgr, app) {
                // create Live controller
                app.lazyController('liveCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    // customize your LivePage's $scope here:
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Live', this.assets.template, {
                    iconClasses: 'fa fa-bar-chart'
                });
            },

            onPageActivate: function() {
                if (!refreshTimer) {
                    refreshTimer = setInterval(ThisComponent.refetchPackets.bind(ThisComponent), refreshDelay);
                }

                this.refetchPackets();
            },

            onPageDeactivate: function() {
                if (refreshTimer) {
                    clearInterval(refreshTimer);
                    refreshTimer = null;
                }
            },

            refetchPackets: function() {
                this.busy = true;

                this.host.getMostRecentPackets()
                .finally(function() {
                    this.busy = false;
                })
                .then(function(packets) {
                    ThisComponent.packets = packets;
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