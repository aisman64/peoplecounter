/**
 * The Organizational Unique Identifier (OUI) helps us identify vendors by MAC address.
 * @see http://www.webopedia.com/TERM/O/OUI.html
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            Caches: {
                ouis: {
                    idProperty: 'ouiId'
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
                return sequelize.define('OUI', {
                    /**
                     * The ssidId is a number, uniquely identifying the given ssid (which is actually a name string)
                     */
                    ouiId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    mac: { type: Sequelize.STRING(12), unique: true, allowNull: false },
                    model: { type: Sequelize.STRING(255), allowNull: false },
                    company: { type: Sequelize.STRING(255), allowNull: false }
                }, {
                    freezeTableName: true,
                    tableName: 'OUI',
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});