/**
 * Since MAC addresses in most of our use-cases are only used for grouping,
 * replacing the long identifier strings with short numbers can significantly 
 * speed up queries and reduce the packet table's size.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            Caches: {
                macSsidRelationships: {
                    idProperty: 'relationshipId'
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
                return sequelize.define('MAC_SSID_Relation', {
                    relationshipId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    macId: Sequelize.INTEGER.UNSIGNED,
                    ssidId: Sequelize.INTEGER.UNSIGNED
                }, {
                    freezeTableName: true,
                    tableName: 'MAC_SSID_Relation'
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});