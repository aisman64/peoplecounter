/**
 * Start Application
 */
"use strict";



// ####################################################################################
// Basic libraries

// all kinds of Node modules that we need
var express = require('express');
var util = require('util');
var path = require('path');
var url = require('url');
var favicon = require('static-favicon');
var fs = require('fs');
var process = require('process');

// get Promise library from Sequelize to support stacktraces properly
var Sequelize = require('sequelize');

// load config
var appConfig = require('./appConfig');


// ####################################################################################
// shared JS libraries (used on Host and Client), located in the public folder

// determine publicFolder
var publicFolder = appConfig.publicFolder = './pub/';

// Lo-Dash brings all kinds of utilities for array and object manipulation
// see: http://stackoverflow.com/questions/13789618/differences-between-lodash-and-underscore
GLOBAL._ = require(publicFolder + 'lib/lodash.min');

// moment.js for timing and measuring time
GLOBAL.moment = require(publicFolder + 'lib/moment');

// squishy adds some additional tools (e.g. makeEnum, createClass and more)
// squishy adds itself to the global namespace
require(publicFolder + 'js/squishy/squishy');

// Use an improved `toString` method.
Object.prototype.toString = function() { 
    var str = squishy.objToString(this, true, 3);
    var maxLen = 300;
    if (str.length > maxLen) {
        // truncate to at most maxLen characters
        str = str.substring(0, maxLen) + '...';
    }
    return str;
};


// ####################################################################################
// merge user config

var appConfigUser;
try {
    appConfigUser = require('./appConfig.user');
    if (appConfigUser) {
        _.merge(appConfig, appConfigUser);
    }
}
catch (err) {
    // no matter
    console.warn('[WARN] Could not load `appConfig.user.js`');
}

// ####################################################################################
// setup server

// get setup libraries and start setting up!
var Logging = require('./lib/Logging');
var SequelizeUtil = require('./lib/SequelizeUtil');
var Maintenance = require('./lib/Maintenance');
var Setup = require('./lib/Setup');

console.log('Starting server. Please wait...');

// only use one Promise library the entire application
GLOBAL.Promise = Sequelize.Promise || require('bluebird');

// setup long stack traces
GLOBAL.Promise.longStackTraces();

// ####################################################################################
// Node core settings

// fix stacktrace length
// see: http://stackoverflow.com/questions/7697038/more-than-10-lines-in-a-node-js-stack-error
Error.stackTraceLimit = 100;    // TODO: For some reason, Bluebird node ignores us here
//Error.stackTraceLimit = Infinity;



// ####################################################################################
// Get started


// start express app
var app = express();
app.set('title', appConfig.title);

// setup server configuration
var hosts = appConfig.hosts || ['0.0.0.0'];
console.assert(hosts instanceof Array && hosts.length > 0, 'Invalid `hosts` configuration: ' + hosts);

var port = appConfig.httpd.port || 8080;

// we are guessing that the first address is the external address
var externalListenAddress = app.externalListenAddress = hosts[0] + ':' + port;

// // for debugging purposes:
// app.use(function(req, res, next) {
//     console.log('Incoming request for: ' + req.url);
//     next();
// });

// add event listener when process exists
Maintenance.events.exit.addListener(function() {
    // close server gracefully
    if (app.serverInstance) {
        app.serverInstance.close();
    }
});

// // add longjohn for long stacktraces
// // see: https://github.com/mattinsler/longjohn
// if (process.env.NODE_ENV !== 'production') {
//     require('longjohn');
// }


// ####################################################################################
// start server

var Shared;
Promise.resolve()
.then(function() {
    // add favicon and session management middleware

    // all these parsers are somewhat evil
    // see: http://stackoverflow.com/questions/11295554/how-to-disable-express-bodyparser-for-file-uploads-node-js
    //app.use(bodyParser.json());
    //app.use(express.json()).use(express.urlencoded());
    //app.use(bodyParser.urlencoded());

    // add favicon
    app.use(favicon());
        
    // manage sessions & cookies
    var SessionManager = require('./lib/SessionManager');
    var sessionManager = new SessionManager();
    sessionManager.installSessionManager(app);
})
.then(function() {
    // load NoGap
    var NoGapLoader = require('nogap').Loader;

    // Note: This also calls `initHost` on every component
    return NoGapLoader.start(app, appConfig.nogap);
})
.then(function(_Shared) {
    // add Shared to app (for now)
    Shared = _Shared;

    // register connection error handler
    Shared.Libs.ComponentCommunications.events.connectionError.addListener(
        Maintenance.reportConnectionError.bind(Maintenance));
    
    // unhandled routes
    app.use(function(req, res, next) {
        var err = new Error('Not Found: ' + req.originalUrl);
        err.status = 404;
        next(err);
    });

    // error handler
    app.use(function(err, req, res, next) {
        var status = err && err.status || (!isNaNOrNull(err) && err) || 500;
        var errorMsg = 'Error during request (' + status + '): ' + (err.stack || err.message);

        if (req.Instance) {
            req.Instance.Libs.ComponentLoader.Tools.handleError(errorMsg);
        }
        else {
            console.error(errorMsg);
        }
        
        res.writeHead(status, {'Content-Type': 'text/html'});

        var clientAddress = req.connection.remoteAddress;
        var isLocalConnection = clientAddress === 'localhost' || clientAddress === '127.0.0.1' || clientAddress === '::1';
        if (isLocalConnection) {
            res.write('<pre>' + err.stack + '</pre>');
        }
        else {
            res.write('error.internal');
        }
        res.end();
    });
    

    // start configuring DB and setting up tables
    return SequelizeUtil.initModels(Shared);
})

/**
 * Start HTTP server.
 */
.then(function startApp() {
    for (var i = 0; i < hosts.length; ++i) {
        var host = hosts[i];
        (function(host) {
            app.listen(port, host, function() {
                console.log(appConfig.title + ' is online at: ' + (host + ':' + port));
            }).on('error', function (err) {
                // HTTP listen socket got closed unexpectedly...
                // TODO: Try to re-start
                console.error(new Error('Server connection error (on ' + (host + ':' + port) + '): ' + (err.stack || err.message || err)).stack);
            });
        })(host);
    }
})
.catch(function(err) {
    process.exit(new Error('Initialization failed - ' + err.stack));
});


module.exports = app;

