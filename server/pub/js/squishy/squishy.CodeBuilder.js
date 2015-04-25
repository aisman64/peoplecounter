/**
 *
 */
"use strict";

(function() {
if (typeof(require) !== 'undefined') {
    require('./squishy.Stacktrace');
}

var lastCodeId = 0;

/**
 * Provides tools to convert JS code to strings and back.
 */
squishy.CodeBuilder = {
    prettyFileNameUrl: function(fname) {
        // TODO: Use encodeURIComponent to make sure that fname is a valid URL (but will make URL ugly)
        // Note: Chrome (and possibly other browsers) cannot cope well with multiple codes having the same alias.
        //      So we add a unique part to every name.
        //      However, we don't want to use a number because that can be confused as line number.
        //      So we generate a string.
        var str = '';
        var code = ++lastCodeId;
        var offset = 'a'.charCodeAt(0);
        var nChars = 26;
        while (code > 0) {
            var charCode = code % nChars;
            str += String.fromCharCode(offset + charCode);

            // go to next char
            code -= charCode;
            code /= 26;
        }
        
        //return '!' + str + '!' + encodeURIComponent(fname.replace(/\\/g, '/'));
        return '!' + str + '!' + fname.replace(/\\/g, '/');
    },

    /**
     * Make sure that the function declaration is tightly wrapped by `serializeInlineFunction`.
     * Do NOT add additional spaces or new lines between `serializeInlineFunction(` and `function`!
     * Do NOT declare the function elsewhere and then hand it to `serializeInlineFunction`.
     * Declare it like this: squishy.CodeBuilder.serializeInlineFunction(function(...) { ...
     */
    serializeInlineFunctionCall: function(fun, args) {
        var trace = squishy.StacktraceBuilder.getStacktrace();
        var creationFrame = trace[1];
        
        // use heuristics to determine correct column of first line
        creationFrame.column += 'serializeInlineFunction'.length;
        
        var serializedFunction = this.serializeFunction(fun, creationFrame);
        return this.buildFunctionCall(serializedFunction, args);
    },
    
    buildFunctionCall: function(serializedFunction, args) {
        return '(' + serializedFunction + ')(' + squishy.objToString(args, true) + ');\n\n';
    },

    /**
     * Make sure that the function declaration is tightly wrapped by `serializeInlineFunction`.
     * Do NOT add additional spaces or new lines between `serializeInlineFunction(` and `function`!
     * Do NOT declare the function elsewhere and then hand it to `serializeInlineFunction`.
     * Declare it like this: squishy.CodeBuilder.serializeInlineFunction(function(...) { ...
     */
    serializeInlineFunction: function(fun) {
        var trace = squishy.StacktraceBuilder.getStacktrace();
        var creationFrame = trace[1];
        
        // use heuristics to determine correct column of first line
        creationFrame.column += 'serializeInlineFunction'.length;
        
        return this.serializeFunction(fun, creationFrame);
    },
    
    /**
     * Modifies string version of given function so that it's stacktrace will be correct when eval'ed.
     * The accuracy depends on the reliability of the stack frame information of where and when the function was defined.
     * @see http://jsfiddle.net/5CA5G/2/
     */
    serializeFunction: function(code, creationFrame) {
        // 'eval(('.length == 6
        creationFrame.column = Math.max(1, creationFrame.column-2);
    
        // build padded code string (to generate accurate stacktraces)
        // if we run it through a minifier, we can get rid of the whitespaces and get accurate sourcemaps
        var codeString = '(';
        for (var i = 1; i < creationFrame.row; ++i) {
            codeString += '\n';
        }
        for (var i = 1; i < creationFrame.column; ++i) {
            codeString += ' ';
        }
        codeString += code.toString() + ')';
        codeString += "\n//# sourceURL=" + this.prettyFileNameUrl(creationFrame.fileName);
        //codeString = 'eval(eval(' + this.escapeCode(codeString) + '))';

        var completeCode = '(eval(eval(' + JSON.stringify(codeString) + ')))';
        //var completeCode = 'eval(eval(' + JSON.stringify('(function() { return 1; })') + '))';
        
        // test serializing of functions
        // TODO: comment this thing out
        var funFromString = eval(completeCode);
        console.assert(typeof funFromString === 'function', 'Supplied code is not a function.');
        
        // only override `toString`, so we still get the original function
        code.toString = function() { return completeCode; };
        
        return code;
    },
    
    serializeFile: function(path) {
        // TODO: !
        // Need to consider AMD, Node's require, requirejs etc....
    },
    
    /**
     * Returns the code string to define a variable.
     */
    defVar: function(varName, varValue) {
        return 'var ' + varName + (varValue ? ' = ' + varValue : '') + ';\n';
    }
};
})();

if (typeof(module) !== 'undefined') {
    module.exports = squishy.CodeBuilder;
}