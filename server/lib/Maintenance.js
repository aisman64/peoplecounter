/**
 * Process & general app management.
 * Features:
 *   -> Allows the user to add a clean-up hook for when the process exits.
 *   (That's it for now)
 */
"use strict";

var appConfig = require('../appConfig');
var process = require('process');

/**
 * The Maintenance object for registering exit hooks.
 */
var Maintenance = {
    events: {
        exit: squishy.createEvent()
    },

    /**
     * This is called whenever any HTTP connection reports an error.
     * Usually this is because a socket hung up unexpectedly.
     * This happens, if for example, the user cancels or refreshes while still downloading content.
     * We also absolutely need the error handlers in place to prevent Node from crashing.
     * If no error handler was installed, immaturely closed sockets would throw exceptions.
     */
    reportConnectionError: function(req, res, err, who) {
        // get client address
        // see: http://stackoverflow.com/questions/8107856/how-can-i-get-the-users-ip-address-using-node-js
        if (req) {
            var ipStr = req.headers['x-forwarded-for'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress ||
                 req.connection.socket.remoteAddress;

             ipStr = squishy.objToString(ipStr);

            if (req.headers && req.headers['x-forwarded-for']) {
                ipStr += ' [' + req.headers['x-forwarded-for'] + ']';
            }

            console.trace('Network error [' + who + '] - Address: ' + ipStr + ' - ' + err);
        }
        else {
            console.trace(who + ' connection error : ' + err.stack);
        }
    }
};


/**
 * Ensures graceful shutdown
 * See: http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits
 */
(function() {
    function exitHandler(options, errOrCode) {
        if (GLOBAL._thisProcessExited) return;            // prevent recursive clean-up
        
        // first, get the original logger to prevent possible problems (logging.js overrides default logging)
        var logInfo = (console._log || console.log).bind(console);
        var logError = (console._error || console.error).bind(console);

        try {
            GLOBAL._thisProcessExited = true;
            
            // really kill this thing (WARNING: If the deferred code throws an exception, it will haunt you!)
            setTimeout(function() { process.exit(); });
            
            logInfo('\n\n');
            logInfo('#################################################################');

            // TODO: Use printStackTrace to find the actual culprit right away (it's often buried between all kinds of node-internal stackframes)
            if (errOrCode) logError(errOrCode.stack || new Error('Exiting: ' + errOrCode).stack);
            
            logInfo('Shutting down...');
            
            // call all hooks for extra clean-up work
            try {
                Maintenance.events.exit.fire(options, errOrCode, options.what);
            }
            catch (err) {
                logError("ERROR during shutdown: " + err.stack);
            }
            
            // make sure, we don't keep reading from stdin (if we started reading)
            process.stdin.destroy();
            
            logInfo('#################################################################');
            logInfo('\n\n');
            logInfo('Shutdown complete. Bye bye!');
        }
        catch (err) {
            logError("ERROR during shutdown: " + err.stack);
        }
    }

    // app is closing
    process.on('exit', exitHandler.bind(null,{what: 'exit'}));

    // app catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {what: 'SIGINT'}));

    // app catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, {what: 'uncaughtException'}));
})();



module.exports = Maintenance;