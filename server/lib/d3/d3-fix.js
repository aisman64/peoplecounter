/**
 * This allows using D3 in Node without any Python or OS dependencies!
 *
 * @see http://bloggemdano.blogspot.tw/2014/02/running-d3-in-nodejs-on-windows-without.html
 */

"use strict";

var fs = require('fs')
    , jsdom = require('jsdom-nogyp')
    , htmlStub = '<html><head></head><body><script src="./d3.min.js"></script></body></html>'
    , document = jsdom.jsdom(htmlStub)
    , window = document.createWindow();

module.exports = function(cb) {
    jsdom.env({ features : { QuerySelector : true }, html : htmlStub, done : function(errors, win) {
        // make window + document global, so d3 works properly
        global.window = window;
        global.document = document;

        // https://github.com/chad3814/CSSStyleDeclaration/issues/3
        var CSSStyleDeclaration_prototype = window.CSSStyleDeclaration.prototype,
            CSSStyleDeclaration_setProperty = CSSStyleDeclaration_prototype.setProperty;
            
        CSSStyleDeclaration_prototype.setProperty = function(name, value, priority) {
          return CSSStyleDeclaration_setProperty.call(this, name + "", value == null ? null : value + "", priority == null ? null : priority + "");
        };

        // in this context, we can run the browser version of D3!
        var d3 = require('./d3.min.js');

        // call user code with a valid reference to D3
        cb(d3);

        // // restore globals
        // if ('window' in globals) global.window = globals.window;
        // else delete global.window;
        // if ('document' in globals) global.document = globals.document;
        // else delete global.document;
    }});
};