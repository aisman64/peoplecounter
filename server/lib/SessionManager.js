/**
 * The session manager helps us manage session data & cookies.
 */
"use strict";

var process = require('process');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MySQLSessionStore = require('express-mysql-session');

var tokenStore = require('./TokenStore');
var appConfig = require('../appConfig');


/**
 * This is called after the built-in session & cookie management.
 * We use it to validate, enhance and (possibly) clean current session state.
 */
var onRequest = function(req, res, next) {
    // if (req.method === "GET") {
        // req.session.lastVisited = req.originalUrl;
    // }
    next();
};

/**
 * SessionStore class persists the session in the mysql DB.
 * @constructor
 */
var SessionManager = squishy.extendClass(MySQLSessionStore, function() {
    // ctor

    // Initialize mysql store:
    // see: https://github.com/chill117/express-mysql-session#options
    var dbOptions = _.clone(appConfig.db) || {};
    dbOptions.autoReconnect = true;
    dbOptions.expiration = appConfig.session.lifetime;
    dbOptions.multipleStatements =  true;
    this._super(dbOptions);

    // check if connection already failed (since mysql lib might raise errors more than once)
    var fataled = false;

    // add mysql connection error handler
    // see: https://github.com/felixge/node-mysql/issues/832/#issuecomment-44478560
    var del = this.connection._protocol._delegateError;
    this.connection._protocol._delegateError = function(err, sequence){
        if (fataled) return;        // ignore silently

        if (err.fatal) {
            // fatal error
            fataled = true; 
            var reconnectDelay = dbOptions.reconnectDelay || 5;

            console.error('mysql fatal error: ' + err.stack);
            console.warn('Connection to database lost. Reconnecting in ' + reconnectDelay + 's...');

            // re-connect after delay
            setTimeout(function() {
                fataled = false;
                this.reconnect();
            }.bind(this), reconnectDelay * 1000);
        
            //process.exit(-1);
        }
        else {
            return del.call(this, err, sequence);
        }
    }.bind(this);
},{
    // methods

    installSessionManager: function(app) {
        app.use(cookieParser()); // required for `express-session` module
        
        // TODO: Support multiple domains

        // install session middleware
        // see: https://github.com/expressjs/session#options
        app.use(session({
            // secret token
            secret: tokenStore.getToken('sessionSecret'),
            resave: false,
            saveUninitialized: true,
            
            // default cookie settings
            // see: http://expressjs.com/api.html#res.cookie
            cookie: {
                domain: appConfig.session.domain,
                path: appConfig.session.path,
                maxAge: appConfig.session.maxAge,
                httpOnly: true,
            },
            
            // persist session in DB, using 'express-mysql-session' module
            store: this
        }));
        
        // add our custom request handler
        app.use(onRequest);
    }
});


module.exports = SessionManager;