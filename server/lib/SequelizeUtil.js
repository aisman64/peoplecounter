/**
 * Provides some utilities that add some basic features for sequalize.
 */
"use strict";

var appConfig = require('../appConfig');
var nodeUtil = require('./NodeUtil');
var logging = require('./Logging');
var process = require('process');

var path = require('path');

function nothing() {};
var defaultOptions = {};

// use sequelize.js as our ORM to mysql
// see: http://sequelizejs.com/docs/latest/
GLOBAL.Sequelize = require('sequelize');
GLOBAL.sequelize = new Sequelize(appConfig.db.database, appConfig.db.user, appConfig.db.password, {
    host: appConfig.db.host,
    port: appConfig.db.port || 3306,
    
    // pool settings
    pool: { maxConnections: 5, maxIdleTime: 30},

    // log to `db.log`
    logging: logging.getDbLogger(),

    // allow multiple statements in queries
    dialectOptions: {
        multipleStatements: true
    }
    
    //syncOnAssociation: false            // sync manually
});

// var NoGapDef = require('nogap').Def;

// module.exports = NoGapDef.component({
//     Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
//        return {
var SequelizeUtil = {
    // keep track of all models
    modelComponents: [],
    modelComponentsByName: {},
    modelsByName: {},

    /**
     * Public events
     */
    events: {
        /**
         * Called after all DB config & setup steps have finished executing.
         */
        setupFinished: squishy.createEvent(),
        failed: squishy.createEvent(),
        done: squishy.createEvent(),
    },
    
    fatalError: function(err) {
        this.events.failed.fire(err);
        this._hasFailed = 1;
        this.reportError(err);
    },

    isModel: function(obj) {
        return obj && obj._$ds88$klk$_isModel;
    },
    

    // ############################################################################################################
    // initModels

    /**
     * Load all models from the lib/models directory, require them, and wait for all pending transactions, then call doneCb.
     */
    initModels: function(Shared) {
        // start DB interaction
        return sequelize.authenticate()
        .bind(this)

        // initialize all models
        .then(function() {
            console.log('Configuring DB...');
            
            // load all DB models
            var modelComponents = this.modelComponents;
            var modelComponentsByName = this.modelComponentsByName;
            var modelsByName = this.modelsByName;

            // iterate over all components and initialize their models
            Shared.forEach(function(modelComponent) {
                if (!modelComponent.initModel) return;

                // call `initModel` on each model component
                modelComponent.Model = modelComponent.initModel();
                modelComponent.Model._$ds88$klk$_isModel = true;
                console.assert(modelComponent.Model, '`initModel` did not return model in Component: ' + modelComponent);

                // keep track of all model component
                modelComponentsByName[modelComponent.Def.FullName] = modelComponent;
                modelsByName[modelComponent.Def.FullName] = modelComponent.Model;
                modelComponents.push(modelComponent);
            });

            // Run all pre-sync operations
            return Promise.map(modelComponents, function(modelComponent) {
                if (modelComponent.Model.onBeforeSync) {
                    return modelComponent.Model.onBeforeSync(modelsByName);
                }
            });
        })

        // send models to DB
        .then(function() {
            return sequelize.sync();
        })

        // create indices and other stuff (after sync)
        .then(function() {
            var modelComponents = this.modelComponents;
            var modelsByName = this.modelsByName;

            return Promise.map(modelComponents, function(modelComponent) {
                if (modelComponent.Model.onAfterSync) {
                    return modelComponent.Model.onAfterSync(modelsByName);
                }
            });
        })

        // exit if Model setup failed
        .catch(function(err) {
            throw new Error('DB setup failed' + (err.sql && ' (SQL: ' + err.sql + ')') + ' - ' + err.stack);
        });
    },


    // ############################################################################################################
    // Custom DB Queries - Table Index
    
    /**
     * Used to create a new index if it does not exist yet.
     * @see http://dev.mysql.com/doc/refman/5.0/en/create-index.html
     * Possible options: `indexName`, `logging`, `indexType`, `parser`
     */
    createIndexIfNotExists: function(table, columns, options) {
        if (_.isString(columns)) columns = [columns];

        var indexName = (options && options.indexName) || table + '_' + columns.join('_');
        
        // check if index exists
        // see: http://stackoverflow.com/questions/2480148/how-can-i-employ-if-exists-for-creating-or-dropping-an-index-in-mysql
        var checkIndexSql = 'SHOW INDEX FROM ' + table + ' WHERE KEY_NAME = \'' + indexName + '\'';
        return sequelize.query(checkIndexSql, null, defaultOptions)
        .bind(this)

        // 
        .catch(function(err) {
            this.fatalError(new Error("Unable to QUERY index for table `" + table + "` - " + err.stack));
        })

        // check if index exists
        .then(function(res) {
            // if (table === '...')
            //     console.log(JSON.stringify(res), indexName);

            if (res.length == 0 || !res[0] || !_.size(res[0])) {
                // index does not exist yet
                
                // disable logging
                if (options) options.logging = nothing;
                else options = defaultOptions;
                
                // see: https://github.com/sequelize/sequelize/blob/eb034333160867cf21251e51a08057985e1a5c77/lib/dialects/mysql/query-generator.js#L259
                var sql = "CREATE " + (options.indexOptions || "") + " INDEX " + indexName + 
                    (options.indexType ? (' USING ' + options.indexType) : "") +
                    " ON " + table + ' (' + columns.join(', ') + ')' +
                    (options.parser ? " WITH PARSER " + options.parser : "");
                
                // add index to DB
                return sequelize.query(sql, null, defaultOptions);
            }
            else {
                // index already exists -> Empty promise
                return Promise.resolve();
            }
        })

        .catch(function(err) {
            this.fatalError(new Error("Unable to CREATE index for table `" + table + "` - " + err.stack));
        });
    },


    // ############################################################################################################
    // Misc Utilities

    /**
     * Get POD (plain old data) values from Sequelize results.
     *
	 * @param row The result object or array from a Sequelize query's `success` or `complete` operation.
	 * @param associations The `include` parameter of the Sequelize query.
     * @see http://stackoverflow.com/a/24837502/2228771
     */
    getValuesFromRows: function(rows, associations) {
        // get POD (plain old data) values
        var values;
        if (rows instanceof Array) {
            // call this method on every element of the given array of rows
	        values = [];
	        for (var i = 0; i < rows.length; ++i) {
                // recurse
                values[i] = SequelizeUtil.getValuesFromRows(rows[i], associations);
	        }
	    }
	    else if (rows) {
	    	// only one row
	    	values = rows.dataValues;

            // get values from associated rows
            if (values && associations) {
                for (var i = 0; i < associations.length; ++i) {
                    var association = associations[i];
                    var propName = association.as;

                    // recurse
                    values[propName] = SequelizeUtil.getValuesFromRows(values[propName], association.include);
                };
            }
	    }

    	return values;
    },


    /**
     * Generates and returns a Sequelize query object whose `complete` function's result argument
     * will be an array of rows whose `dataValues` objects each have two properties:
     * One is the given column name, and one is `cnt`.
     */
    countGroups: function(model, column) {
        return model.findAll({
            attributes: [
                column,
                [sequelize.fn('count', sequelize.col(column)), '`cnt`']
            ],
            group: ["activityId"]
        });
    },


    // ##########################################################################################
    // bulkCreate

    /**
     * ActivityScheduleStage.Model.bulkCreate(stages).complete(function(err, newStages) {
     * @see http://sequelizejs.com/docs/1.7.8/instances#bulk
     */
    bulkCreate: function(model, objects) {
        // built-in `bulkCreate` does not give us autoIncrement ids
        //return model.bulkCreate(objects);

        // so we need to chain `create`s instead (for now).
        var queries = [];
        for (var i = 0; i < objects.length; ++i) {
            var object = objects[i];
            queries.push(model.create(object));
        };
        return Promise.all(queries);
    },

    // ##########################################################################################
    // Error handling

    reportError: function(err) {
        if (err && err.stack) {
            console.error('SQL error: ' + err.stack);
        }
        else {
            var errStr = squishy.objToString(err, true, 3);
            console.error('SQL error trace: ' + new Error(errStr).stack);
        }
    },

    errToLocalizable: function(err) {
        if (!err) return null;
        
        return {
            key: 'error.db',
            args: [this.errToString(err)]
        };
    },

    errToString: function(err) {
        // TODO: Proper interpretation of mysql errors
        // TODO: Localization of some errors, such as `duplicate entry` etc...
        //return err ? squishy.objToString(err) : null;
        if (err) {

            //this.reportError(err);
            this.reportError(err);
        }
        var errStr = err && err.toString();
        return errStr;
    }
};  // SequelizeUtil

module.exports = SequelizeUtil;