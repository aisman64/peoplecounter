/**
 * All stored data packets that have been received in devices (read via pcap)
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
	    	Private: {
	    		Caches: {
	    			wifiPackets: {
	    				idProperty: 'packetId',

                        members: {
                            compileObjectCreate: function(queryInput, ignoreAccessCheck) {
                                if (!this.Instance.User.isDevice() && !ignoreAccessCheck) {
                                    return Promise.reject('error.invalid.permissions');
                                }

                                // TODO: Pre-processing

                                return queryInput;
                            }
                        }
	    			}
	    		}
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
                return sequelize.define('WifiPacket', {
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
                    freezeTableName: true,
                    tableName: 'WifiPacket',
                    classMethods: {
                        onBeforeSync: function(models) {
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
                                SequelizeUtil.createIndexIfNotExists(tableName, ['signalStrength'])
                            );
                        }
                    }
                });
            },

            Private: {
                storePacket: function(packet) {
                    // insert into DB
                    // see: http://docs.sequelizejs.com/en/latest/api/model/#createvalues-options-promiseinstance
                    return this.Instance.wifiPackets.createObject(packet, false, true);
                }
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});