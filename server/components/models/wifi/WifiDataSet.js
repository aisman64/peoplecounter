/**
 * A data set is just a batch of packets sniffed with a particular device in a particular time frame.
 * Device ids group packets by physical locality, whereas datasets group packets by physical and temporal locality.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            Caches: {
                wifiDatasets: {
                    idProperty: 'datasetId'
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
                    datasetName: {type: Sequelize.STRING(256) },
                }, {
                    freezeTableName: true,
                    tableName: 'WifiDataset',
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});
