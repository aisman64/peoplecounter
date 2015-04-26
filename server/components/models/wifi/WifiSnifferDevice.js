/**
 * Each device is deployed in a physical location and captures WifiPackets in bundles of WifiDataSets.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
	    	Private: {
	    		Caches: {
	    			wifiPackets: {
	    				idProperty: 'deviceId'
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
                return sequelize.define('WifiSnifferDevice', {
                    deviceId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
                    deviceName: { type: Sequelize.TEXT, notNull: true },

                    // the time when the device has last contacted the server
                    lastSeen: { type: Sequelize.DATE },

                    // physical location (latitude + longitude)
                    lat: SEQUELIZE.FLOAT,
                    lon: SEQUELIZE.FLOAT,

                    host: SEQUELIZE.STRING(255)
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {

    })
});