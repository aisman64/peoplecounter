/**
 * Since SSIDs in most of our use-cases are only used for grouping,
 * replacing SSID strings with numbers can significantly speed up queries and reduce the packet table's size.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
	    	Private: {
	    		Caches: {
	    			ssids: {
	    				idProperty: 'ssidId'
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
                return sequelize.define('SSID', {
                    /**
                     * The ssidId is a number, uniquely identifying the given ssid (which is actually a name string)
                     */
                    ssidId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    ssidName: { type: Sequelize.STRING(32), unique: true }
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});