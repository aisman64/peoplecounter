/**
 * Each device is deployed in a fixed physical location and captures WifiSSIDPackets in bundles of WifiDataSets.
 * The location of each device while capturing this dataset is stored in this table.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            Caches: {
                datasetSnifferRelation: {
                    idProperty: 'datasetSnifferRelationId',

                    indices: [
                        {
                            key: ['deviceId']
                        },
                        {
                            key: ['datasetId']
                        },
                    ],

                    members: {
                    }
                }
            },    // Caches:
            
	    	Private: {
	    	} // Private:
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
                return sequelize.define('WifiDatasetSnifferRelation', {
                    datasetSnifferRelationId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

                    datasetId: Sequelize.INTEGER.UNSIGNED,
                    deviceId: Sequelize.INTEGER.UNSIGNED,

                    lat: Sequelize.DECIMAL,                     
                    lng: Sequelize.DECIMAL
                },{

                    freezeTableName: true,
                    tableName: 'WifiDatasetSnifferRelation',
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();

                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['datasetId']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['deviceId'])
                            );
                        }
                    }
                });
            },

            Private: {
            },

            Public: {
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});