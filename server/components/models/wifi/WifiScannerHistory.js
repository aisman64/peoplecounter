/**
 * History of scanned MACs.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            Caches: {
                wifiScannerHistory: {
                    idProperty: 'scannerHistoryId'
                }
            },
                
            Private: {
            },
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
                return sequelize.define('WifiScannerHistory', {
                    scannerHistoryId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    
                    macId: { type: Sequelize.INTEGER.UNSIGNED }
                }, {
                    freezeTableName: true,
                    tableName: 'WifiScannerHistory'
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});