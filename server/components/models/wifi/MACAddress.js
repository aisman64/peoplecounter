
/* Copyright (c) 2015-2016, <Christopher Chin>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */
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

                        getObjectsNow: function(queryInput, ignoreAccessCheck) {
                            if (!queryInput || 
                                (!_.isArray(queryInput.macId) &&
                                !_.isArray(queryInput.macAddress))) {
                                return null;
                            }

                            if (_.isArray(queryInput.macId)) {
                                return queryInput.macId.map(function(macId) {
                                    return this.byId[macId];
                                });
                            }
                            else if (_.isArray(queryInput.macAddress)) {
                                return queryInput.macAddress.map(function(macAddress) {
                                    return this.indices.macAddress.get(macAddress);
                                });
                            }
                        },

                        compileReadObjectQuery: function(queryInput, ignoreAccessCheck) {
                            if (!queryInput || 
                                (isNaNOrNull(queryInput.macId) &&
                                isNaNOrNull(queryInput.macAddress))) {
                                return Promise.reject(makeError('error.invalid.request'));
                            }

                            var queryData = { 
                                where: { },
                                include: [{
                                    model: Shared.OUI.Model,
                                    as: 'OUI'
                                }]
                            };
                            if (!isNaNOrNull(queryInput.macId)) {
                                queryData.where.macId = queryInput.macId;
                            }
                            if (!isNaNOrNull(queryInput.macAddress)) {
                                queryData.where.macAddress = queryInput.macAddress;
                            }
                            return queryData;
                        },

                        compileReadObjectsQuery: function(queryInput, ignoreAccessCheck) {
                            if (!queryInput || 
                                (!queryInput.macId &&
                                !queryInput.macAddress)) {
                                return Promise.reject(makeError('error.invalid.request'));
                            }

                            var queryData = { 
                                where: { },
                                include: [{
                                    model: Shared.OUI.Model,
                                    as: 'OUI'
                                }]
                            };
                            if (queryInput.macId) {
                                queryData.where.macId = queryInput.macId;
                            }
                            else if (queryInput.macAddress) {
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
                    macAddress: Sequelize.STRING(16),
                    macAnnotation: Sequelize.TEXT,
                    ouiId: {type: Sequelize.INTEGER.UNSIGNED}
                }, {
                    freezeTableName: true,
                    tableName: 'MACAddress',
                    classMethods: {
                        onBeforeSync: function(models) {
                            models.MACAddress.belongsTo(models.OUI,
                                 { foreignKey: 'ouiId', as: 'OUI', foreignKeyConstraint: true });
                            models.OUI.hasMany(models.MACAddress,
                                 { foreignKey: 'ouiId', as: 'MACAddresses', constraints: false });

                            models.WifiScannerIgnoreList.belongsTo(models.MACAddress,
                                 { foreignKey: 'macId', as: 'MAC', foreignKeyConstraint: true });
                            models.MACAddress.hasMany(models.WifiScannerIgnoreList,
                                 { foreignKey: 'macId', as: 'scannerIgnoreList', constraints: false });

                            models.WifiScannerHistory.belongsTo(models.MACAddress,
                                 { foreignKey: 'macId', as: 'MAC', foreignKeyConstraint: true });
                            models.MACAddress.hasMany(models.WifiScannerHistory,
                                 { foreignKey: 'macId', as: 'scannerHistory', constraints: false });
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['macAddress'], { indexOptions: 'UNIQUE'}),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['ouiId'])
                                //SequelizeUtil.createIndexIfNotExists(tableName, ['macAnnotation'], { indexOptions: 'UNIQUE'})
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
