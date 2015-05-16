/**
 * All Wifi probe packets that have been captured by our devices
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            Caches: {
                wifiSSIDPackets: {
                    idProperty: 'packetId',

                    members: {
                        compileCreateObject: function(queryInput, ignoreAccessCheck) {
                            if (!this.Instance.User.isDevice() && !ignoreAccessCheck) {
                                return Promise.reject('error.invalid.permissions');
                            }

                            // TODO: Pre-processing

                            return queryInput;
                        },

                        compileReadObjectsQuery: function(queryInput, ignoreAccessCheck) {
                            if (!this.Instance.User.isStaff()) {
                                return Promise.reject('error.invalid.permissions');
                            }

                            // var queryData = {
                            //     where: {}
                            // };


                            return queryInput;
                        }
                    }
                }
            },
            
	    	Private: {
	    	}
	    };
	}),


    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var componentsRoot = '../../';
        var libRoot = componentsRoot + '../lib/';
        var SequelizeUtil;

        return {
            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
            },

            initModel: function() {
                var This = this;

                /**
                 * 
                 */
                return sequelize.define('WifiSSIDPacket', {
                    packetId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

                    deviceId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
                    macId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
                    ssidId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
                    datasetId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },

                    signalStrength: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },

                    /**
                     * capture time in unix time (seconds since 1970)
                     */
                    time: { type: Sequelize.DECIMAL(16, 6), allowNull: false },

                    /**
                     * Sequence number, in protocol
                     */
                    seqnum: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
                },{
                    createdAt: false,
                    // updatedAt: false, // we can use `udpatedAt` for our live-stream

                    freezeTableName: true,
                    tableName: 'WifiSSIDPacket',
                    classMethods: {
                        onBeforeSync: function(models) {
                            // setup foreign key Association between packet and SSID and MACAddress
                            models.WifiSSIDPacket.belongsTo(models.SSID,
                                 { foreignKey: 'ssidId', as: 'SSID', constraints: false });
                             models.SSID.hasMany(models.WifiSSIDPacket,
                                 { foreignKey: 'ssidId', as: 'packets', constraints: false });

                            models.WifiSSIDPacket.belongsTo(models.MACAddress,
                                 { foreignKey: 'macId', as: 'MACAddress', constraints: false });
                            models.MACAddress.hasMany(models.WifiSSIDPacket,
                                 { foreignKey: 'macId', as: 'packets', constraints: false });
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['deviceId']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['macId']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['ssidId']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['datasetId']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['time']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['signalStrength']),

                                SequelizeUtil.createIndexIfNotExists(tableName, ['macId', 'updatedAt'])
                            );
                        }
                    }
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});