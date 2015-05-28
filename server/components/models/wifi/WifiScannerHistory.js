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
                    idProperty: 'scannerHistoryId',
                    indices: [{
                        key: ['macId'],
                        unique: true
                    }],

                    members: {
                        compileReadObjectsQuery: function(queryInput, ignoreAccessCheck, sendToClient) {
                            return {
                                include: [{
                                    model: Shared.MACAddress.Model,
                                    as: 'MAC',
                                    include: [{
                                        model: Shared.OUI.Model,
                                        as: 'OUI'
                                    }]
                                }]
                            }
                        }
                    }
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
                    tableName: 'WifiScannerHistory',
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['macId'], { indexOptions: 'UNIQUE'})
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