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
	    	Private: {
	    		Caches: {
	    			wifiPackets: {
	    				idProperty: 'macId'
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
                return sequelize.define('MACAddress', {
                    /**
                     * Unique id, identifying the given MAC address.
                     * TODO: OUI?
                     */
                    macId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    macAddress: Sequelize.VARCHAR(16)
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {

    })
});