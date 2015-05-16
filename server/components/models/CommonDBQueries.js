/**
 * All stored data packets that have been received in devices (read via pcap)
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
    		DefaultLimit: 50,

            /**
             * These queries may be triggered by anyone, no matter the privilege level
             */
            GuestQueryWhitelist: [
                'MostOftenUsedSSIDs'
            ],

            __ctor: function () {
                this.GuestQueryWhitelistMap = {};
                for (var i = 0; i < this.GuestQueryWhitelist.length; ++i) {
                    this.GuestQueryWhitelistMap[this.GuestQueryWhitelist[i]] = 1;
                }
            },

	    	Private: {
                getAllowedQueriesForUser: function() {
                    var nameMap;
                    if (!this.Instance.User.isStandardUser()) {
                        // Guests can only execute some of the queries
                        nameMap = this.Shared.GuestQueryWhitelistMap;
                    }
                    else {
                        nameMap = this.Shared.QueryNameMap;
                    }

                    console.assert(nameMap, '`getAllowedQueriesForUser()` found nothing');
                    return nameMap;
                }
	    	}
	    };
	}),


    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var componentsRoot = '../';
        var libRoot = componentsRoot + '../lib/';
        var SequelizeUtil;
        var fs;

        var queriesFolder = __dirname + '/queries/';

        var startupSqlFile = __dirname + '/Startup.sql';

        return {
        	Queries: { },

            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
                fs = require('fs');
            },

            initHost: function() {
            	// read all queries from files
            	return Promise.join(
                    this._runInitialMySqlScript(),
                    new Promise(function(resolve, reject) {
                        fs.readdir(queriesFolder, function(err, files) {
                    		if (err) {
                    			reject(makeError(err, 'Could not initialize DB queries - Could not read directory `' + queriesFolder +  '`'));
                    		}
                    		else {
                    			this.readAllQueryFiles(files)
                    			.then(resolve)
                    			.catch(reject);
                    		}
                    	}.bind(this))
                    }.bind(this))
                );
            },

            _runInitialMySqlScript: function() {
                return new Promise(function(resolve, reject) {
                    try {
                        if (fs.existsSync(startupSqlFile)) {
                            var startupSql = fs.readFileSync(startupSqlFile).toString('utf8');

                            sequelize.query(startupSql, {
                                type: sequelize.QueryTypes.RAW
                            })
                            .then(function(result) {
                                resolve();
                            })
                            .catch(function(err) {
                                reject(err);
                            });
                        }
                    }
                    catch (err) {
                        reject('Could not run Startup.sql: ' + err.stack);
                    }
                });
            },

            readAllQueryFiles: function(files) {
            	return Promise.map(files, this.readQueryFile.bind(this))
            	.bind(this)
            	.then(function() {
            		this.QueryNameMap = {};
	                for (var queryName in this.Queries) {
	                	this.QueryNameMap[queryName] = 1;
	                };
            	});
            },

            readQueryFile: function(fileName) {
            	var fpath = queriesFolder + fileName;
            	return new Promise(function(resolve, reject) {
            		fs.readFile(fpath, function(err, content) {
	            		if (err) {
	            			reject(makeError(err, 'Could not initialize DB queries - Could not read query file `' + fileName + '`'));
	            		}
	            		else {
	            			var queryName = fileName.endsWith('.sql') ? fileName.substring(0, fileName.length-4) : fileName;
	            			this.registerQuery(queryName, content);
	            			resolve();
	            		}
            		}.bind(this));
            	}.bind(this));
            },

            registerQuery: function(queryName, query) {
            	this.Queries[queryName] = query;
            },

            executeQueryByName: function(queryName, args, suffix, prefix) {
            	var query = this.Queries[queryName];
            	if (!query) {
            		return Promise.reject(makeError('error.invalid.request', 'invalid queryName `' + queryName + '`'));
            	}
            	return this.executeQuery(query, args, suffix, prefix);
            },

            executeQuery: function(query, args, suffix, prefix) {
            	suffix = suffix || '';
            	prefix = prefix || '';

        		if (!args.limit) {
        			args.limit = 50;
        		}
                
            	query = [query, suffix, prefix].join(' ');
            	return sequelize.query(query, { 
				  	replacements: args, 
				  	type: sequelize.QueryTypes.SELECT
			  	});
            },

            Private: {
            	getClientCtorArguments: function() {
            		return [this.Shared.QueryNameMap];
            	},

                computeMACRelationGraph: function(macId) {
                    return Promise.join(
                        this.Instance.MACAddress.macAddresses.getObject({macId: macId}, true, false, true),
                        this.Instance.MAC_SSID_Relation.macSsidRelationships.getObjects(),
                        this.Instance.SSID.ssids.getObjects(),
                        sequelize.query('SELECT COUNT(*) FROM SSID WHERE ssidName != "" AND ssidName IS NOT NULL', {
                            type: sequelize.QueryTypes.SELECT
                        })
                    )
                    .spread(function(macAddressEntry, allRelations, allSsids, totalSsidCount) {
                        var ssidsByMacId = _.mapValues(_.groupBy(allRelations, 'macId'), function(group) {
                            return _.pluck(group, 'ssidId');
                        });

                        var macIdsBySsids = _.mapValues(_.groupBy(allRelations, 'ssidId'), function(group) {
                            return _.pluck(group, 'macId');
                        });

                        var ssidEntriesBySsidId = _.indexBy(allSsids, 'ssidId');

                        var ownSsids = ssidsByMacId[macId] || [];

                        // get all MAC addresses that the given MAC address is connected to
                        var allConnectedMacIds = {};
                        for (var iOwnSsid = 0; iOwnSsid < ownSsids.length; ++iOwnSsid) {
                            var ssid = ownSsids[iOwnSsid];
                            var connectedMacIds = macIdsBySsids[ssid] || [];
                            if (connectedMacIds.length > 0) {

                            }
                        };

                        var ownSsidNames = _.map(ownSsids, function(ssidId) {
                            var entry = ssidEntriesBySsidId[ssidId];
                            if (!(entry && entry.ssidName)) console.error(ssidId);
                            return entry && entry.ssidName || '<unknown>';
                        });

                        return {
                            macId: macId,
                            macAddress: macAddressEntry && macAddressEntry.macAddress,
                            ownSsids: ownSsidNames
                        };
                    });
                },
            },

            Public: {
            	executeQuery: function(queryName, args, suffix) {
            		var allowedQueries = this.getAllowedQueriesForUser();
            		if (!allowedQueries || !allowedQueries[queryName]) {
            			return Promise.reject('error.invalid.permissions');
            		}

            		args = args || {};

            		if (!this.Instance.User.isStaff() &&
            			(isNaNOrNull(args.limit) || args.limit > 50)) {
            			// Non-staff users are limited in how much they can query
            			args.limit = 50;
            		}

            		var prefix = '';
            		suffix = '';
            		return this.Shared.executeQueryByName(queryName, args, suffix, prefix);
            	},

                computeMACRelationGraphPublic: function(macId) {
                    return this.computeMACRelationGraph(macId);
                }
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
    	var ThisComponent;

        return {
        	__ctor: function(allQueryNamesMap) {
        		ThisComponent = this;
        		this.allQueryNamesMap = allQueryNamesMap;

        		for (var queryName in allQueryNamesMap) {
        			this.queries[queryName] = (function(queryName) { return function(args) {
        				return ThisComponent.host.executeQuery(queryName, args);
        			}})(queryName);
        		}
        	},

        	queries: {}
        };
    })
});