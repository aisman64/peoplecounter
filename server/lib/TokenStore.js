/**
 * Provides a simple method to generate & store secure strings
 */
"use strict";

var crypto = require('crypto');
var fs = require('fs');
var process = require('process');
var path = require('path');
var mkdirp = require('mkdirp');

var defaultOptions = {
    folder: 'data',

    /**
     * Location of token file.
     */
    fileName: 'tokens.json',
    
    /**
     * Whether to write file to disk whenever a token is generated.
     */
    flushOnWrite: true,
    
    defaultLen: 64
};

/**
 * TokenStore prototype.
 */
var TokenStore = Object.create({

    getFilePath: function() {
        var folder = this.options.folder;
        return path.join(folder, this.options.fileName);
    },

    /**
     * Resets this store with the given options.
     */
    setupStore: function(newOptions) {
        var options = this.options = {};
        
        // set default options
        Object.keys(defaultOptions).forEach(function(prop) {
            if (newOptions.hasOwnProperty(prop)) {
                options[prop] = newOptions[prop];
            }
            else {
                options[prop] = defaultOptions[prop];
            }
        });
        
        // read tokens from file
        var fpath = this.getFilePath();
        if (fs.existsSync(fpath)) {
            this.tokens = this.readTokens();
        }
        else {
            this.tokens = {};
            this.writeTokens(function() {
                console.warn("Token file did not exist: New file created. This message should only display upon first use.");
            });
        }
    },

    /**
     * Generates a random string, consisting of the given amount of symbols of type [0-9a-zA-Z].
     * Does NOT store or write new token to disk. Use getToken for that.
     *
     * @see: http://stackoverflow.com/questions/8855687/secure-random-token-in-node-js
     * @param {Number} len Total length of result string.
     * @param {String} symbols The symbols that the token string should be composed of.
     */
    generateTokenString: function(len) {
        len = len || this.options.defaultLen;
        //symbols = symbols || '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_#!';
        var buf = crypto.randomBytes(len);
        
        // only get `len` characters
        return buf.toString('base64').substring(0, len);

        // var res = '';
        // for (var i = 0; i < len; ++i) {
        //     var nextByte = buf[i];
        //     res += symbols.charAt(nextByte%nSymbols);      // map bytes to our given set of symbols
        // }
        // return res;
    },
    
    /**
     * Gets the token of the given name and calls cb on it when ready.
     * Generates new token if the token does not exist or has the wrong length.
     */
    getToken: function(name, generatorOrLen, dontWrite) {
        len = len || this.options.defaultLen;
        var token = this.tokens[name];
        if (!token || token.length != len) {
            console.debug("Generating new token \"" + name + "\"...");
            if (generatorOrLen instanceof Function) {
                var generator = generatorOrLen;
                token = generator();
            }
            else if (!generatorOrLen || (!isNaN(generatorOrLen) && generatorOrLen > 0)) {
                var len = generatorOrLen;
                token = this.generateTokenString(len);
            }
            else {
                throw new Error('Invalid argument to `getToken` - generatorOrLen = ' + generatorOrLen);
            }
            this.tokens[name] = token;
            
            // rewrite file
            if (!dontWrite && this.options.flushOnWrite) {
                this.writeTokens();
            }
        }
        return token;
    },
    
    /**
     * Read tokens synchronously.
     * Throws error if things go wrong.
     */
    readTokens: function() {
        var fpath = this.getFilePath();
        var foptions = {
            //mode: parseInt('0600', 10)
        };
        try {
            var content = fs.readFileSync(fpath, foptions).toString();
            if (content.length > 0) {
                return eval(content.toString('utf8')) || {};
            }
            else {
                return {};
            }
        }
        catch (err) {
            throw new Error("Unable to load TokenStore from file \"" + fpath + "\": " + (err.message || err));
        }
    },
    
    /**
     * Writes tokens to file and calls cb when done.
     * cb's first argument will be an error, if things went wrong.
     */ 
    writeTokens: function(cb) {
        cb = cb || this.checkError;

        var fpath = this.getFilePath();
        var backupFpath = fpath + ".bak";
        
        var foptions = {
            //mode: parseInt('0600', 10)
        };

        // create directory (if it does not exist)
        var folder = this.options.folder;
        mkdirp.sync(folder);
        
        var doWriteTokens = function(tokens) {
            // write actual token file
            fs.writeFile(fpath, squishy.objToEvalable(tokens), foptions, 
            function(err) {
                if (err) {
                    // write failed
                    throw new Error("Unable to write TokenStore file (luckily, you have a backup!) \"" + fpath + "\": " + (err.message || err));
                }
                else {
                    // success!
                    cb();
                }
            }.bind(this));
        }.bind(this);
        
        if (fs.existsSync(fpath)) {
            // backup existing file first
            // if this fails, we won't even try writing the new file
            var oldTokens = this.readTokens();
            fs.writeFile(backupFpath, squishy.objToEvalable(oldTokens), foptions, function(err) {
                if (err) {
                    cb(new Error("Unable to backup TokenStore file \"" + fpath + "\": " + (err.message || err)));
                }
                else {
                    doWriteTokens(this.tokens);
                }
            }.bind(this));
        }
        else {
            doWriteTokens(this.tokens);
        }
    },
    
    /**
     *
     */
    checkError: function(err) {
        if (err) {
            console.error(err.stack || err);
        }
    }
});

// set default options
TokenStore.setupStore(defaultOptions);

module.exports = TokenStore;