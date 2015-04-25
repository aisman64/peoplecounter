/**
 * Random collection of utilities.
 */

"use strict";



var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {     
    var entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };

    return {
        initBase: function() {
            // add some stuff to lodash:
            _.mixin(this.lodash);
        },

        escapeHtml: function(string) {
            return String(string).replace(/[&<>"'\/]/g, function (s) {
              return entityMap[s];
            });
        },

        lodash: (function() {
            /**
             * @param objects An array of objects to be indiced by more than one partial index.
             * @param callbacks An array of callbacks, each representing one partial index, as handed to `_.groupBy` or `_.indexBy`.
             */
            var compoundIndexOrGroupBy = function(leafCb) {
                /**
                 * Recursive iterator for creating compound indices
                 */
                var _compoundIterator = function(src, iDepth, leafCb, keyCb, thisObj) {
                    var dst = {};
                    if (iDepth == 1) {
                        // arrived at recursion leaf
                        for (var key in src) {
                            dst[key] = leafCb(src[key], keyCb, thisObj);
                        }
                    }
                    else {
                        // keep going
                        for (var key in src) {
                            dst[key] = _compoundIterator(src[key], iDepth-1, leafCb, keyCb);
                        }
                    }
                    return dst;
                };
                
                return function(objects, callbacks, thisObj) {
                    console.assert(callbacks && callbacks.length > 1, 'Invalid argument. ' + 
                        '`compoundIndexBy` can only be used for indexing by at least two indices at a time.');
                    
                    // get started
                    var map = _.groupBy(objects, callbacks[0], thisObj);
                    
                    // keep grouping
                    for (var iCallback = 1; iCallback < callbacks.length - 1; ++iCallback) {
                        var callback = callbacks[iCallback];
                        map = _compoundIterator(map, iCallback, _.groupBy, callback, thisObj);
                    }
                    
                    // create unique index
                    return _compoundIterator(map, iCallback, leafCb, _.last(callbacks), thisObj);
                };
            };

            return {
                /**
                 * Index by multiple keys.
                 * @return An object of objects (of objects...) of objects
                 */
                compoundIndexBy: compoundIndexOrGroupBy(_.indexBy),

                /**
                 * Group by multiple keys.
                 * @return An object of objects (of objects...) of arrays
                 */
                compoundGroupBy: compoundIndexOrGroupBy(_.groupBy),

                sum: function(arr, property) {
                    return _.reduce(arr, function(result, item){
                        result += item[property];
                        return result;
                    }, 0);
                }
            };
        })(), // lodash



        /**
         * Generic, simply queue
         */
        Queue: squishy.createClass(function() {
            // ctor
            this.arr = [];
        },{
            // methods

            enqueue: function(obj) {
                this.arr.push(obj);
            },

            /**
             * Remove and return oldest obj.
             */
            dequeue: function() {
                if (this.arr.length == 0) return null;

                var obj = this.arr[0];
                this.arr.splice(0, 1);
                return obj;
            }
        })

    };    // return
    }),     // Base


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {
            /**
             * Guess browser locale
             * @see http://stackoverflow.com/a/26889118/2228771
             */
            guessBrowserLanguage: function() {
                var locale = window.navigator.languages ? window.navigator.languages[0] : null;
                locale = locale || window.navigator.language || 
                    window.navigator.browserLanguage || window.navigator.userLanguage;
                return locale;
            }
        };
    })
});  // NoGapDef.component