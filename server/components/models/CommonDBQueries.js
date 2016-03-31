
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
                args = args || {};
            	suffix = suffix || '';
            	prefix = prefix || '';

        		if (!args.limit) {
        			args.limit = 50;
        		}
                
            	query = [prefix, query, suffix].join(' ');
            	return sequelize.query(query, { 
				  	replacements: args,
				  	type: sequelize.QueryTypes.SELECT
			  	});
            },

            Private: {
            	getClientCtorArguments: function() {
            		return [this.Shared.QueryNameMap];
            	},

                computeMACRelationGraph: function(macIds) {
                    if (!_.isArray(macIds)) return Promise.reject(makeError('error.invalid.request'));
                    if (macIds.some(function(macId) { return isNaNOrNull(macId); })) return Promise.reject(makeError('error.invalid.request'));

                    var queries = [
                        this.Instance.MAC_SSID_Relation.macSsidRelationships.getObjects(),
                        this.Instance.SSID.ssids.getObjects(),
                        // sequelize.query('SELECT COUNT(*) FROM SSID WHERE ssidName != "" AND ssidName IS NOT NULL', {
                        //     type: sequelize.QueryTypes.SELECT
                        // }),
                        this.Instance.MACAddress.macAddresses.getObjects({
                            macId: macIds
                        }, true, false, true),
                        this.Shared.executeQueryByName('MACTimes', null, 'HAVING ' + macIds.map(function(macId) { return 'macId = "' + macId + '"'; }).join(' OR '))
                    ];

                    return Promise.all(queries)
                    .bind(this)
                    .spread(function(allRelations, allSsids, /* totalSsidCount, */ 
                            macEntries, times) {

                        var ssidIdsByMacId = _.mapValues(_.groupBy(allRelations, 'macId'), function(group) {
                            return _.pluck(group, 'ssidId');
                        });

                        var macIdsBySsidIds = _.mapValues(_.groupBy(allRelations, 'ssidId'), function(group) {
                            return _.pluck(group, 'macId');
                        });

                        var timesByMacId = _.indexBy(times, 'macId');

                        var ssidEntriesBySsidId = _.indexBy(allSsids, 'ssidId');

                        var getSSIDsOfMAC = function(macId) {
                            var ownSsidIds = ssidIdsByMacId[macId] || [];

                            return _.map(ownSsidIds, function(ssidId) {
                                var entry = ssidEntriesBySsidId[ssidId];
                                var ssidName = entry && entry.ssidName;
                                if (!ssidName) {
                                    console.error('unnamed SSID: ' + ssidId);
                                    // ignore unnamed SSIDs
                                    return;
                                }

                                
                                // get all MAC addresses that the given MAC address is connected to
                                var ssidMacIds = macIdsBySsidIds[ssidId] || [];

                                return {
                                    // name of SSID
                                    name: ssidName,

                                    // array of macIds associated to SSID
                                    macIdCount: ssidMacIds.length
                                };
                            });
                        }.bind(this);

                        for (var i = 0; i < macEntries.length; i++) {
                            var macEntry = macEntries[i] = macEntries[i] || {};
                            macEntry.ownSsids = getSSIDsOfMAC(macEntry.macId);
                            macEntry.times = timesByMacId[macEntry.macId];
                        };

                        //console.error(JSON.stringify(timesByMacId, null, '\t'));

                        return macEntries;
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

                    // for safety reasons, don't allow this stuff
            		var prefix = '';
            		suffix = '';
            		return this.Shared.executeQueryByName(queryName, args, suffix, prefix);
                    // .tap(function(res) {
                    //     console.error(JSON.stringify(res, null, '\t'));
                    // });
            	},

                computeMACRelationGraphPublic: function(macIds) {
                    return this.computeMACRelationGraph(macIds);
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
