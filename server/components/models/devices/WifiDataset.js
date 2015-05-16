/**
 * A dataset is a batch of packets captured with a particular device in a particular time frame.
 * Each device can only participate in one dataset at a time, and during the duration of that dataset, cannot (should not) be moved.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            Caches: {
                wifiDatasets: {
                    idProperty: 'datasetId',

                    hasHostMemorySet: 1,

                    members: {
                        compileReadObjectsQuery: function(queryInput) {
                            var queryData = {
                                where: {}
                            };

                            queryData.include = [{
                                model: Shared.WifiDatasetSnifferRelation.Model,
                                as: 'deviceRelations'
                            }];

                            return queryData;
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
                return sequelize.define('WifiDataSet', {
                    datasetId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    datasetName: {type: Sequelize.STRING(256) }
                }, {
                    freezeTableName: true,
                    tableName: 'WifiDataset',

                    classMethods: {
                        onBeforeSync: function(models) {
                            models.WifiDatasetSnifferRelation.belongsTo(models.WifiDataset,
                                 { foreignKey: 'datasetId', as: 'dataset', constraints: false });
                            models.WifiDataset.hasMany(models.WifiDatasetSnifferRelation,
                                 { foreignKey: 'datasetId', as: 'deviceRelations', constraints: false });
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();

                            // return Promise.join(
                            //     // create indices
                            //     SequelizeUtil.createIndexIfNotExists(tableName, ['datasetId']),
                            //     SequelizeUtil.createIndexIfNotExists(tableName, ['datasetName'])
                            // );
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
