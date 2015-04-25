/**
 * TODO:
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) { 
    	return {
    		__ctor: function() {
    			squishy.getGlobalContext().makeError = this.makeError.bind(this);
    		},

    		makeError: function(reason, additionalInformation) {
    			if (additionalInformation) {
    				console.error(additionalInformation);
    			}
    			var err = new Error(reason);
    			//err.additionalInformation = additionalInformation;
    			return err;
    		}
    	};
	})
});