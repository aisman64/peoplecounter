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
        var TokenStore;

        return {
            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
                TokenStore = require(libRoot + 'TokenStore');
            },

            initModel: function() {
                var This = this;

                /**
                 * 
                 */
                return sequelize.define('WifiSnifferDevice', {
                    deviceId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
                    deviceName: { type: Sequelize.STRING(255), notNull: true },

                    // the time when the device has last contacted the server
                    lastSeen: { type: Sequelize.DATE },

                    // physical location (latitude + longitude)
                    lat: SEQUELIZE.FLOAT,
                    lon: SEQUELIZE.FLOAT,

                    host: SEQUELIZE.STRING(255),

                    /**
                     * The secret is only known by server and device, and very rarely exchanged (for refresh purposes).
                     */
                    deviceSecret:  { type: Sequelize.STRING(1024), notNull: true },

                    /**
                     * The current authentication token for this device. Required to establish a session.
                     */
                    authenticationToken:  { type: Sequelize.STRING(1024), notNull: true },
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {

    })
});