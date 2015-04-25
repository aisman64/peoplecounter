/**
 * `StacktraceBuilder` parses the output of `printStackTrace` to build a run-time agnostic array of stack frame information.
 */
"use strict";

// use printStackTrace to get run-time agnostic stack frames in string format
var printStackTrace;
if (typeof(require) !== 'undefined') {
    printStackTrace = require('./stacktrace');
}


squishy.StacktraceBuilder = {
    
    /**
     * Get all stack frames past the first stackframe whose filename is NOT in the given path.
     */
    getStackframesNotFromPath: function(path, err) {
        var trace = this.getStacktrace(err);
        path = path.replace(/\\/g, '/');        // normalize path
        for (var i = 1; i < trace.length; ++i) {
            var frame = trace[i];
            var fileName = frame.fileName.replace(/\\/g, '/');  // normalize file name
            if (!frame.fileName.startsWith(path) && frame.fileName.indexOf('/') >= 0) {
                return trace.slice(i, trace.length);
            }
        };

        return null;
    },

    /**
     * Returns the first frame (as defined by `getStackTrace`) calling the function of given name.
     * Note that in order to identify a function by name, you need to explicitly assign a name to it.
     * E.g.: var myFun = function myFun(args) { ... } // Note the second occurence of `myFun`, that is the actualy function name!
     */
    getCallerOfFunction: function(funName, err) {
        var trace = this.getStacktrace(err);
        var dist = -1;

        // run through the trace in reverse to get the first occurence
        for (var i = trace.length-1; i >= 0; --i) {
            var frame = trace[i];
            console.log(frame.infoString);
            if (frame.functionName === funName) {
                return frame;
            }
        };
        return null;
    },
    
    /**
     * Build array of all frames of the given error's stack or of the current stack.
     * Each resulting frame is an object of type: {fileName, functionName, line, column, infoString}.
     * Line & column are -1, if the frame is not transparent (e.g. when in native frames).
     */
    getStacktrace: function (err) {
        // ignore this stackframe, if we produce a new trace
        var start = err ? 0 : 1;
        
        // build stacktrace of given error's stack, or current stack
        err = err || new Error();
        
        // generate universal stacktrace string
        var trace = printStackTrace({e: err});
        
        // create frame array
        var frames = [];
        
        // Parse the printStackTrace format (no idea, why they had to produce a string anyway...)
        // Each frame has a format similar to: "functionName@url:row:column" (however, URL can (but does not have to) contain colons and/or @'s)
        //var frameRegex = /([^@]+)@([^\:]+)\:([^\:]+)\:([^\:]+)/;
        for (var i = start; i < trace.length; ++i) {
            var frameInfo = trace[i];
            var functionName = frameInfo;
            var url = ""
            var row = -1, column = -1;
            
            var locationIndex = frameInfo.indexOf('@')+1;
            if (locationIndex > 0) {
                functionName = frameInfo.substring(0, locationIndex-1);
                var location = frameInfo.substring(locationIndex);
                var colIdx = frameInfo.lastIndexOf(':')+1;
                var lineIdx = frameInfo.lastIndexOf(':', colIdx-2)+1;
                if (colIdx > 0 && lineIdx > 0) {
                    url = frameInfo.substring(locationIndex, lineIdx-1);
                    row = frameInfo.substring(lineIdx, colIdx-1);
                    column = frameInfo.substring(colIdx);
                }
                else {
                    // no row or column given (probably native code)
                    url = location;
                }
            }
            
            // add to set of frames
            frames.push({
                fileName: url.replace(/\\/g, '/'), 
                functionName: functionName, 
                row: parseInt(row), 
                column: parseInt(column), 
                infoString: frameInfo
            });
        }
        
        return frames;
    }
};

if (typeof(module) !== 'undefined') {
    module.exports = squishy.StacktraceBuilder;
}