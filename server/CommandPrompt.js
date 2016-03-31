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
 *
 */
"use strict";

var process = require('process');
var SequelizeUtil = require('./lib/SequelizeUtil');


// #############################################################################
// Available variables

// some variables we want available to the command line interpreter
var Shared,
    Instance,
    models;


// #############################################################################
// Available functions

var su,
    switchUser;

/**
 * Switch to the given user.
 */
su = switchUser = function(userName) {
    userName = userName || 'console';

    return Instance.User.loginAs({userName: userName});
};


// #############################################################################
// Setting things up

/**
 * Eval some command line input
 */
function _interpret(line) {
    return Promise.resolve()
    .then(function () {
        return eval(line);
    })
    .then(function(result) {
        // Matlab style -> If line ends with ';', don't output anything
        if (result !== undefined && !line.endsWith(';')) {
            console.log('result = ' + result);
        }
    });
}

/**
 * Create the default instance
 */
function _bootstrapInstance() {
    // create instance map with empty session
    Instance = Shared.Libs.ComponentInstance.createInstanceMap();
    Instance.Libs.ComponentSession.setSession();

    // store some client information
    Instance.User.Context.clientAddr = 'http://localhost';
    Instance.User.Context.clientIsLocal = true;
    Instance.User.Context.clientRoot = 'localhost/';

    // install new instance and generate client-side code
    var ComponentBootstrapInstance = Instance.Libs.ComponentBootstrap;
    return ComponentBootstrapInstance.bootstrapComponentInstance();
}

/**
 * @see http://stackoverflow.com/a/13654006/2228771
 */
function _startCommandPrompt(_Shared) {
    Shared = _Shared;
    models = SequelizeUtil.modelsByName;

    return _bootstrapInstance()
    .then(function() {
        var readline = require('readline');

        var rl = readline.createInterface(process.stdin, process.stdout);

        rl.setPrompt('> ');
        rl.prompt();
        rl.on('line', function(line) {
            // run it!
            _interpret(line)
            .then(function() {
                // wait for more input
                rl.prompt();
            });
        }).on('close',function(){
            process.exit(0);
        });
    });
}

module.exports = _startCommandPrompt;
