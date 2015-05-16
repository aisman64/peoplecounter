/**
 * Each device is deployed in a physical location and captures WifiSSIDPackets in bundles of WifiDataSets.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            Caches: {
                datasetSnifferRelation: {
                    idProperty: 'datasetSnifferRelationId',

                    indices: [
                        {
                            key: ['deviceId']
                        },
                        {
                            key: ['datasetId']
                        },
                    ],

                    members: {
                    }
                }
            },    // Caches:
            
	    	Private: {
	    	} // Private:
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
                    datasetSnifferRelationId: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

                    datasetId: Sequelize.INTEGER.UNSIGNED,

                    deviceId: Sequelize.INTEGER.UNSIGNED,

                    lat: Sequelize.DECIMAL,
                     
                    lng: Sequelize.DECIMAL
                },{

                    freezeTableName: true,
                    tableName: 'WifiSnifferDevice',
                    classMethods: {
                        onBeforeSync: function(models) {
                            // setup foreign key Association between user and device (one-to-one relationship)
                            this.belongsTo(models.User,
                                { foreignKey: 'uid', as: 'user', foreignKeyConstraint: true,
                                onDelete: 'cascade', onUpdate: 'cascade' });
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['uid']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['isAssigned']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['resetTimeout'])
                            );
                        }
                    }
                });
            },

            Private: {
            },

            Public: {
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});