/**
 * Setup some basic logging stuff.
 */
"use strict";

// we use log4js
var log4js = require('log4js');

// get utilities
var StacktraceBuilder = squishy.Stacktrace;

var path = require('path');
var fs = require('fs');

// get "mkdir -p" functionality
var mkdirp = require('mkdirp');

// get config
var appConfig = require('../appConfig');
var logCfg = appConfig.logging;

// get all log files from the config
var logFiles = [logCfg.defaultFile, logCfg.dbFile];

// make sure, all logging directories exist
for (var i = 0; i < logFiles.length; i++) {
    var logFile = logFiles[i];

    // recursively create logging directory
    var logFolder = path.dirname(logFile);
    if (!fs.existsSync(logFolder)) {
        // create folders recursively, if not existed yet
        var logPath = mkdirp.sync(logFolder);
        if (path) {
            console.log('>>> INFO: Created log folder `' + logPath + '`. <<<');
        }
    }
};

// configure loggers
log4js.configure(
	{
  	"appenders": [
    {
      "type": "console",
      "category": "default"
    },
    {
      "type": "file",
      "filename": logCfg.defaultFile,
      "backups": 2,
      "category": "default"
    },
    {
      "type": "file",
      "filename": logCfg.dbFile,
      "backups": 2,
      "category": "db"
    },
    {
      "type": "file",
      "filename": logCfg.userFile,
      "backups": 2,
      "category": "user"
    },
  ],

  /**
   * IMPORTANT: This MUST be false! Since `patchConsole` does more customization.
   * It won't currently work correctly with `replaceConsole` set to `true`.
   */
  "replaceConsole": false
});

// ########################################################################################################################
// add source information to logging

var defaultLogger = log4js.getLogger('default');

function patchConsole(methodName, log4jsMethodName) {
  var log4jsFunction = defaultLogger[log4jsMethodName || methodName];
  var origFunction = console[methodName];

  // override function
	console[methodName] = function() {
	    var args = Array.prototype.slice.call(arguments, 0); // convert arguments to array

      var srcFrame = StacktraceBuilder.getStacktrace()[1];
	    args[0] += ' \x1B[90m(' + srcFrame.fileName + ':' + srcFrame.row + ')\x1B[39m'; // append source to message

      try {
  	      log4jsFunction.apply(defaultLogger, args);
      }
      catch (err) {
          // break an infinite cycle here
          origFunction('[LOGGING ERROR] ' + err.stack);
      }
	};

  // also store original function
  console['_' + methodName] = origFunction;
};


// TODO: This is quite a performance hit. Disable fancy source information in release mode.
patchConsole('log', 'info');
patchConsole('debug');
patchConsole('info');
patchConsole('warn');
patchConsole('error');


// ########################################################################################################################
// some basic logging utilities

module.exports = {
	/**
	 * Returns a function that can be used to log DB activity.
	 */
	getDbLogger: function() {
		var logger = log4js.getLogger('db');
		return logger.info.bind(logger);
	}
};