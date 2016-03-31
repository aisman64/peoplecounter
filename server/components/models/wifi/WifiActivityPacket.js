
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
 * All unencrypted Wifi packets that have been captured by our devices
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            Caches: {
                wifiActivityPackets: {
                    idProperty: 'packetId',

                    members: {
                        compileCreateObject: function(queryInput, ignoreAccessCheck) {
                            if (!this.Instance.User.isDevice() && !ignoreAccessCheck) {
                                return Promise.reject('error.invalid.permissions');
                            }

                            // TODO: Pre-processing

                            return queryInput;
                        },

                        compileReadObjectsQuery: function(queryInput, ignoreAccessCheck) {
                            if (!this.Instance.User.isStaff()) {
                                return Promise.reject('error.invalid.permissions');
                            }

                            // var queryData = {
                            //     where: {}
                            // };


                            return queryInput;
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
                return sequelize.define('WifiActivityPacket', {
                    packetId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

                    deviceId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
                    macId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
                    datasetId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },

                    signalStrength: { type: Sequelize.INTEGER, allowNull: false },

                    /**
                     * capture time in unix time (seconds since 1970)
                     */
                    time: { type: Sequelize.DECIMAL(16, 6), allowNull: false },

                    /**
                     * Sequence number, in protocol
                     */
                    seqnum: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
                },{
                    createdAt: false,
                    // updatedAt: false, // we can use `udpatedAt` for our live-stream

                    freezeTableName: true,
                    tableName: 'WifiActivityPacket',
                    classMethods: {
                        onBeforeSync: function(models) {
                            // setup foreign key Association between packet and MACAddress
                            models.WifiActivityPacket.belongsTo(models.MACAddress,
                                 { foreignKey: 'macId', as: 'MACAddress', constraints: false });
                            models.MACAddress.hasMany(models.WifiActivityPacket,
                                 { foreignKey: 'macId', as: 'activityPackets', constraints: false });
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['deviceId']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['macId']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['datasetId']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['time']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['signalStrength']),

                                SequelizeUtil.createIndexIfNotExists(tableName, ['time', 'macId'])
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
