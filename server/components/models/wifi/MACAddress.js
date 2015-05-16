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
                macAddresses: {
                    idProperty: 'macId',

                    indices: [
                        {
                            unique: true,
                            key: ['macAddress']
                        }
                    ],

                    members: {
                        getObjectNow: function(queryInput, ignoreAccessCheck) {
                            if (!queryInput || 
                                (isNaNOrNull(queryInput.macId) &&
                                isNaNOrNull(queryInput.macAddress))) {
                                return null;
                            }

                            if (!isNaNOrNull(queryInput.macId)) {
                                return this.byId[queryInput.macId];
                            }
                            if (!isNaNOrNull(queryInput.macAddress)) {
                                return this.indices.macAddress.get(queryInput.macAddress);
                            }
                        },

                        compileReadObjectQuery: function(queryInput, ignoreAccessCheck) {
                            if (!queryInput || 
                                (isNaNOrNull(queryInput.macId) &&
                                isNaNOrNull(queryInput.macAddress))) {
                                return Promise.reject(makeError('error.invalid.request'));
                            }

                            var queryData = { where: { } };
                            if (!isNaNOrNull(queryInput.macId)) {
                                queryData.where.macId = queryInput.macId;
                            }
                            if (!isNaNOrNull(queryInput.macAddress)) {
                                queryData.where.macAddress = queryInput.macAddress;
                            }
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
                return sequelize.define('MACAddress', {
                    /**
                     * Unique id, identifying the given MAC address.
                     * TODO: OUI?
                     */
                    macId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    macAddress: Sequelize.STRING(16)
                }, {
                    freezeTableName: true,
                    tableName: 'MACAddress',
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});