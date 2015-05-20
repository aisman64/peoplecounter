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
     * Everything defined in `Host` raws only on the host side (Node).
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
                        template: 'RawPage.html'
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
                getMostRecentPackets: function(settings, lastId) {
                    packetIncludes = [{
                        model: Shared.SSID.Model,
                        as: 'SSID',
                        attributes: ['ssidName']
                    },{
                        model: Shared.MACAddress.Model,
                        as: 'MACAddress',
                        attributes: ['macAddress', 'macAnnotation']
                    }];

                    var where = settings && settings.where || {};
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
                },

                // updateMACAnnotation: function(macId, macAnnotation) {
                //     if (!this.Instance.User.isStaff()) {
                //         return Promise.reject('error.invalid.permissions');
                //     }

                //     return 
                // }
            },
        };
    }),
    
    
    /**
     * Everything defined in `Client` raws only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;
        var maxId;

        return {
            __ctor: function() {
                ThisComponent = this;
                maxId = null;

                this.colorsPerMacId = {};
                this.lastColorIndex = -1;

                ThisComponent.nRawSettingsFilters = 0;
                ThisComponent.rawSettings = { where: {} };
            },

            /**
             * Prepares the raw page controller.
             */
            setupUI: function(UIMgr, app) {
                // create Raw controller
                app.lazyController('rawCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    
                    // customize your $scope here:
                    $scope.userCache = Instance.User.users;
                    $scope.deviceCache = Instance.WifiSnifferDevice.wifiSnifferDevices;
                    $scope.datasetCache = Instance.WifiDataset.wifiDatasets;
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Raw', this.assets.template, {
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

            onMACAnnotationUpdated: function(macId, macAnnotation) {
                ThisComponent.busy = true;

                //ThisComponent.host.updateMACAnnotation(macId, macAnnotation)
                Instance.MACAddress.macAddresses.updateObject({
                    macId: macId,
                    macAnnotation: macAnnotation
                })
                .finally(function() {
                    ThisComponent.busy = false;
                })
                .then(function() {
                    ThisComponent.page.invalidateView();
                })
                .catch(ThisComponent.page.handleError.bind(ThisComponent));
            },


            // ################################################################################################
            // Filtering

            setCurrentMacId: function(macId) {
                this.setPacketFilter('macId', macId);
            },

            setPacketFilter: function(filterName, value) {
                if (value) {
                    ++ThisComponent.nRawSettingsFilters;
                    ThisComponent.rawSettings.where[filterName] = value;
                }
                else {
                    --ThisComponent.nRawSettingsFilters;
                    delete ThisComponent.rawSettings.where[filterName];
                }
            },

            clearFilter: function() {
                ThisComponent.rawSettings.where = {};
                ThisComponent.nRawSettingsFilters = 0;
            },


            // ################################################################################################
            // Refreshing + real-time updates

            refreshDelay: 500,

            refreshData: function() {
                if (ThisComponent.refreshPaused) return;

                ThisComponent.busy = true;

                ThisComponent.host.getMostRecentPackets(ThisComponent.rawSettings)
                .finally(function() {
                    ThisComponent.busy = false;
                })
                .then(function(packets) {
                    ThisComponent.packets = packets;
                    for (var i = 0; i < packets.length; ++i) {
                        var packet = packets[i];
                        if (!ThisComponent.colorsPerMacId[packet.macId]) {
                            if (ThisComponent.lastColorIndex >= HtmlColors.array.length-1) {
                                // reset
                                ThisComponent.lastColorIndex = -1;
                            }
                            var minIntensity = 144;
                            var color = HtmlColors.getLightHex(++ThisComponent.lastColorIndex, minIntensity);
                            ThisComponent.colorsPerMacId[packet.macId] = color;
                        }
                    };
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