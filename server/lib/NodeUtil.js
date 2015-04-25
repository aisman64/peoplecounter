/**
 * Contains a variety of misc tools, useful when using Node.
 */
"use strict";

var fs = require('fs');
var path = require('path');
var http = require('http');

var NodeUtil = {
    /**
     * Calls cb(fname, path) for every file in the given directory and its sub-directories.
     */
    forEachFileInDir: function(dir, cb, checkDir) {
        return this._forEachFileInDir(fs.realpathSync(dir), '', cb, checkDir);
    },
    
    _forEachFileInDir: function(rootDir, relativePath, cb, checkDir) {
        var dir = path.join(rootDir, relativePath);     // current dir
        var fPathRel = relativePath;
        var fPathAbs = rootDir;
        var fname = '';
        var files = fs.readdirSync(dir);
        
        try {
            for(var i in files) {
                if (!files.hasOwnProperty(i)) continue;
                fname = files[i];
                fPathAbs = path.join(dir, fname);
                fPathRel = path.join(relativePath, fname);
                
                var stat = fs.lstatSync(fPathAbs);
                if (stat.isDirectory() && (!checkDir || checkDir(fPathAbs, fPathRel, fname))) {
                    // recurse into sub-directory
                    if (!this._forEachFileInDir(rootDir, fPathRel, cb, checkDir)) {
                        return false;
                    }
                }
                else if (stat.isFile()) {
                    // call callback
                    cb(fPathAbs, fPathRel, fname);
                }
            }
           return true;
        }
        catch (err) {
           cb(fPathAbs, fPathRel, fname, err);
           return false;
        }
    },

    /**
     * @see http://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
     */
    copyFile: function(source, target) {
        var cbCalled = false;

        return new Promise(function(resolve, reject) {
            // create streams
            var reader = fs.createReadStream(source);
            var writer = fs.createWriteStream(target);

            var promise = Promise
            .join(this.streamToPromise(reader))
            .then(function() {
                if (cbCalled) return;
                cbCalled = true;
                resolve();
            })
            .catch(function(err) {
                if (cbCalled) return;
                cbCalled = true;
                reject(err);
            });

            // start copying
            reader.pipe(writer);

            return promise;
        }.bind(this));
    },

    /**
     * @see http://stackoverflow.com/questions/20273128/how-to-get-my-external-ip-address-with-node-js
     */
    getExternalIp: function(cb) {
        var req = http.request(
            {
                hostname: 'fugal.net',
                path: '/ip.cgi'
            },
            function(res) {
                if (res.statusCode != 200) {
                    throw new Error('Could not retreive external IP from `fugal.net`. Status code: ' + res.statusCode);
                }
                res.setEncoding('utf-8');
                var ipAddress = '';
                res.on('data', function(chunk) { ipAddress += chunk; });
                res.on('end', function() {
                    // ipAddress contains the external IP address
                    cb(null, ipAddress.trim());
                });
        }).on('error', function(err) {
            cb(err);
        });

        req.end();
    },

    // ##########################################################################################
    // Promises

    streamToPromise: function(stream, onData) {
        return new Promise(function(resolve, reject) {
            if (onData) {
                stream.on('data', onData);
            }
            stream.on('end', resolve);
            stream.on('error', reject);
        });
    },

    processToPromise: function(prc) {
        var hasExited = false;
        return new Promise(function(resolve, reject) {
            prc.on('close', function(code, signal) {
                if (hasExited) return;
                hasExited = true;

                if (signal) {
                    reject(new Error('Process failed. - Interrupt signal: ' + signal));
                }
                else if (code) {
                    reject(new Error('Process failed. - Returned code: ' + code));
                }
                else {
                    resolve();
                }
            });
            prc.on('error', function(err) {
                if (hasExited) return;
                hasExited = true;
                
                reject(err);
            });
        });
    }
};


module.exports = NodeUtil;