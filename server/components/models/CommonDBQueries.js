/**
 * All stored data packets that have been received in devices (read via pcap)
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
    		DefaultLimit: 50,

	    	Private: {
	    	}
	    };
	}),


    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var componentsRoot = '../../';
        var libRoot = componentsRoot + '../lib/';
        var SequelizeUtil;
        var fs;

        var queriesFolder = __dirname + '/queries/';

        return {
        	Queries: { },

        	/**
        	 * These queries may be triggered by anyone, no matter the privilege level
        	 */
        	GuestQueryWhitelist: [

        	],

            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
                fs = require('fs');

                this.GuestQueryWhitelistMap = {};
                for (var i = 0; i < this.GuestQueryWhitelist.length; ++i) {
                	this.GuestQueryWhitelistMap[this.GuestQueryWhitelist[i]] = 1;
                };
            },

            initHost: function() {
            	// read all queries from files
            	return new Promise(fs.readdir(queriesFolder, function(err, files) {
            		if (err) {
            			reject(makeError(err, 'Could not initialize DB queries - Could not read directory `' + queriesFolder +  '`'));
            		}
            		else {
            			this.readAllQueryFiles(files)
            			.then(resolve)
            			.catch(reject);
            		}
            	}.bind(this)));
            },

            readAllQueryFiles: function(files) {
            	return Promise.map(files, this.readQueryFile.bind(this))
            	.bind(this)
            	.then(function() {
            		this.QueryNameMap = {};
	                for (var i = 0; i < this.Queries.length; ++i) {
	                	this.QueryNameMap[this.Queries[i]] = 1;
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
	            			registerQuery(queryName, content);
	            			resolve();
	            		}
            		});
            	});
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
			  	})
				.tap(function(results) {
				  	console.error(results);
				});
            },

            Private: {
            	getClientCtorArguments: function() {
            		return [this.getAllowedQueriesForUser()];
            	},

            	getAllowedQueriesForUser: function() {
            		if (!this.Instance.User.isStandardUser()) {
            			// Guests can only execute some of the queries
            			return this.GuestQueryWhitelistMap;
            		}

            		// 
            		return this.QueryNameMap;
            	}
            },

            Public: {
            	executeQuery: function(queryName, args, suffix) {
            		var allowedQueries = this.getAllowedQueriesForUser();
            		if (!allowedQueries || !allowedQueries[]) {
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
            		return this.executeQueryByName(queryName, args, suffix, prefix);
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
        			this.queries[queryName] = function(args) {
        				ThisComponent.host.executeQuery(queryName, args);
        			};
        		}
        	},

        	queries: {}
        };
    })
});