/**
 * Provides scanning, parsing and code generation tools for SimpleBooleanExpressions.
 * We take lessons from standard compiler building:
 *
 * The "Scanner" (or "Lexer") scans the input string to produce tokens.
 *    (see http://en.wikipedia.org/wiki/Lexical_analysis)
 * The "Parser" takes tokens to build the AST (Abstract Syntax Tree).
 *    (see http://en.wikipedia.org/wiki/Recursive_descent_parser)
 * The "CodeGenerator" traverses the AST to generate code or evaluate an expression on the fly.
 *    (see http://en.wikipedia.org/wiki/Code_generation_(compiler))
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) { 
        var TokenType = squishy.makeEnum([
            'Not',
            'And',
            'Identifier'
        ]);

        var ASTNodeType = squishy.makeEnum([
            'And',
            'Value'
        ]);

        function isWhiteSpace(chr) {
            return /\s/.test(chr);
        }

        function isDigit(chr) {
            return /[0-9]/.test(chr);
        }

        // let's keep it easy with what constitutes as an "identifier" for now
        // of course, the set of all valid JS identifiers is much much more complicated
        // see: http://stackoverflow.com/a/2008444/2228771
        var idFirstCharacter = /[_a-zA-Z]/i;
        var idCharacter = /[_a-zA-Z0-9]/i;

        /**
         * Wraps the source string object and provides error tracking on that string.
         */
        var Source = squishy.createClass(function(source) {
            // ctor
            source = source || '';      // empty string by default
            console.assert(_.isString(source),
                'Invalid source argument is not a string: ' + source);

            // actual source string
            this._sourceString = source;
            this._cursor = 0;

            // error status
            this._statusOk = true;
            this._lastErrorMessage = null;

            // generate error
            this.errorOut = function(msg) {
                // already had an error... ignore this one
                // (since we have no error recovery, subsequent errors are generally inaccurate)
                if (!this._statusOk) return;

                this._statusOk = false;
                this._lastErrorMessage = msg + ' at column #' + this._cursor + 
                    ' (' + this._sourceString.substring(this._cursor) + ')';
            }.bind(this);
        },{
            // methods
            getSourceString: function() {
                return this._sourceString;
            },

            charAt: function(index) {
                return this._sourceString.charAt(index);
            },

            hasFailed: function() {
                return !this._statusOk;
            },

            getError: function() {
                return this._lastErrorMessage;
            },

            getCursor: function() {
                return this._cursor;
            },

            setCursor: function(cursor) {
                this._cursor = cursor;
            }
        });

        /** 
         * Simplistic Abstract Syntax Tree is the intermediate output
         * of the Parser, used for all code generation purposes.
         * Note that the AST of a boolean expression can always be represented linearly.
         * E.g. in Conjunctive Normal Form 
         *      (http://en.wikipedia.org/wiki/Conjunctive_normal_form)
         *
         * @see http://en.wikipedia.org/wiki/Abstract_syntax_tree
         */
        var ASTNode = squishy.createClass(function(nodeIndex, nodeType, cursor, 
                otherProperties) {
            // ctor
            this._children = [];

            this.nodeIndex = nodeIndex;
            this.nodeType = nodeType;
            this.cursor = cursor;
            squishy.clone(otherProperties, false, this);
        },{
            // methods
            reset: function() {
                this._children.clear();
            },

            getChildren: function() {
                return this._children;
            },

            addChild: function(nodeType, cursor, otherProperties) {
                this._children.push(new ASTNode(this._children.length, 
                    nodeType, cursor, otherProperties));
            },

            /**
             * Generates a source string that represents this subtree.
             */
            toExpressionString: function() {
                var expression = "";
                for (var i = 0; i < this._children.length; ++i) {
                    var child = this._children[i];

                    switch (child.nodeType) {
                        case ASTNodeType.Value:
                            if (child.negated) {
                                expression += '!';
                            }
                            expression += child.identifier;
                            break;
                        case ASTNodeType.And:
                            expression += ' + ';
                            break;
                        default:
                            throw new Error('Unknown ASTNodeType: ' + child.nodeType);
                    }
                };
                return expression;
            }
        });

        /**
         * A CodeGenerator is used to produce a result from an AST, after parsing.
         *
         * @see http://en.wikipedia.org/wiki/Code_generation_(compiler)
         */
        var CodeGenerator = squishy.createClass(function() {
            // ctor
            this._parser = new Parser();
        },{
            // methods

            hasFailed: function() {
                return this._source.hasFailed();
            },

            _reset: function(source) {
                this._source = source;
                this._result = null;
            },

            getSource: function() {
                return this._source;
            },

            setResult: function(result) {
                this._result = result;
            },

            getResult: function() {
                return this._result;
            },

            getError: function() {
                return this._source.getError();
            },

            /**
             * Set everything up, parse and return AST for code generation.
             */
            parse: function(exprString) {
                // reset
                var source = new Source(exprString);
                this._reset(source);

                // parse
                if (!this._parser.parse(source)) {
                    return null;
                }

                return this._parser.getAST();
            }
        });

        /**
         * Evaluator is a CodeGenerator that evaluates the given expression, using
         * an identifier-evaluator callback.
         */
        var Evaluator = squishy.extendClass(CodeGenerator, function() {
            // ctor
            this._super();
        },{
            // methods

            /**
             * Main function to start code generation for the Evaluator.
             *
             * @param idEvaluator {Function.<String>} Takes an identifier and its modifiers (e.g. negation), 
             *                              and returns its actual value.
             */
            evaluate: function(exprString, idEvaluator) {
                // get AST
                var ast = this.parse(exprString);
                if (!ast) return false;

                // verify and set _idEvaluator
                console.assert(idEvaluator instanceof Function,
                    'Invalid second argument is not a function: ' + idEvaluator);
                this._idEvaluator = idEvaluator;

                // walk AST
                var currentValue = true;
                // var currentConcatenation = ASTNodeType.And;
                for (var i = 0; i < ast.getChildren().length && !this.hasFailed(); ++i) {
                    var node = ast.getChildren()[i];

                    switch (node.nodeType) {
                        case ASTNodeType.And:
                            // currentConcatenation = node.nodeType;
                            break;                        
                        case ASTNodeType.Value:
                            // get value for identifier, negate if necessary
                            this._source.setCursor(node.cursor);
                            var idValue = this._idEvaluator(node.identifier, this._source.errorOut);
                            // if (currentConcatenation == ASTNodeType.And)
                            currentValue = currentValue && (!node.negated && idValue);
                            break;
                    }
                };

                // store result
                this.setResult(currentValue);
                
                // return whether evaluation was able to finish
                return !this.hasFailed();
            },
        });

        /** 
         * Parser parses a given expression and provides an AST for code generation.
         */
        var Parser = squishy.createClass({
            // methods

            /**
             * Reset all state
             */
            _reset: function(source) {
                // scanner state
                this._source = source;
                this._index = 0;

                // parser state
                this._currentToken = null;
                this._currentTokenArgument = null;

                // parser output state (AST)
                this._ast = new ASTNode();
            },


            // ########################################################################################################
            // Public interface
            
            /**
             * Parse the given source and build AST.
             */
            parse: function(source) {
                if (_.isString(source)) {
                    // create Source object from string
                    source = new Source(source);
                }

                // reset parser
                this._reset(source);

                // parse AST from input stream, then return whether parsing has completed successfully
                this._result = this._parseStart();
                return !this._source.hasFailed();
            },

            getError: function() {
                return this._source.getError();
            },

            getAST: function() {
                return this._ast;
            },


            // ########################################################################################################
            // Scanner

            /**
             * End of stream (commonly called "eof" = "end of file").
             */
            _eof: function() {
                return this._index >= this._source.getSourceString().length || this._source.hasFailed();
            },

            /**
             * Return current character.
             */
            _currentCharacter: function() {
                return this._source.charAt(this._index);
            },

            /**
             * Return current character and move cursor to next.
             */
            _moveToNextCharacter: function() {
                return this._source.charAt(this._index++);
            },

            /**
             * Move input stream cursor to before next token and return whether there is a token.
             * Returns false if reached end of stream (eof).
             */
            _moveBeforeNextToken: function() {
                while (!this._eof() && 
                    isWhiteSpace(this._currentCharacter())) {
                    this._moveToNextCharacter();
                }

                // return whether there is a next token
                return !this._eof();
            },

            /**
             * Given, cursor is currently at the start of the next token,
             * this will read the next token and return whether it did so successfully.
             * Sets error state, if no valid token was found.
             */
            _readToken: function() {
                // there are only 3 types of tokens: `Not` (!), `And` (+), `Identifier`
                this._source.setCursor(this._index);

                var token;
                var c = this._moveToNextCharacter();
                if (c === '!') {
                    // Not
                    token = TokenType.Not;
                }
                else if (c === '+') {
                    // And
                    token = TokenType.And;
                }
                else if (idFirstCharacter.test(c)) {
                    // Identifier
                    var iStart = this._index;

                    var id = c;
                    while (!this._eof() && idCharacter.test(c = this._moveToNextCharacter())) {
                        id += c;
                    }

                    // finished reading a simple identifier
                    token = TokenType.Identifier;
                    this._currentTokenArgument = id;
                }
                else {
                    this._errorOut('Not a valid token');

                    // invalid character/token
                    return false;
                }
                this._currentToken = token;
                return true;
            },

            _nextToken: function() {
                var c;
                // move cursor to next token
                if (!this._moveBeforeNextToken()) return false;

                // read token
                return this._readToken();
            },


            // ########################################################################################################
            // Parser

            /**
             * Start recursive-descent parser at start symbol.
             * The parser scans on the fly, and the scanner methods are embedded in this class.
             *
             * @see http://en.wikipedia.org/wiki/Recursive_descent_parser
             */
            _parse: function() {
                this._parseStart();
            },

            /**
             * Start recursive descent parser.
             * Expects either of [<Value>, $].
             */
            _parseStart: function() {
                // check for empty string
                if (!this._moveBeforeNextToken()) return false;

                // get started
                return this._parseValue(false);
            },

            /**
             * Expects either of [Not, Identifier].
             */
            _parseValue: function(negated) {
                // Call to `_nextToken` produces `_currentToken`.
                //      Returns false if it reached end of stream.
                if (!this._nextToken()) {
                    this._errorOut('Expected: Value (`!` or Identifier). Found: End of stream.');
                    return false;
                }
                var token = this._currentToken;

                switch (token) {
                    case TokenType.Not:
                        // toggle negation modifier and keep parsing
                        return this._parseValue(!negated);
                    case TokenType.Identifier:
                        // add identifier, negation and source information
                        this._ast.addChild(ASTNodeType.Value, this._source.getCursor(), {
                            identifier: this._currentTokenArgument,
                            negated: negated
                        });

                        // Parse next token
                        return this._parseConcatenationOrEof();
                }
                this._source._errorOut('Expected: Value (`!` or Identifier). Found: ' + TokenType.getName(token) + '.');
                return false;
            },

            /**
             * Expects either of [And, $].
             * Note: There is currently only one type of concatenation (And).
             */
            _parseConcatenationOrEof: function() {
                if (!this._nextToken()) return true;
                var token = this._currentToken;

                switch (token) {
                    case TokenType.And:
                        this._ast.addChild(ASTNodeType.And, this._source.getCursor());

                        // Parse next token
                        return this._parseValue(false);
                }
                this._source._errorOut('Expected: And (`+`). Found: ' + TokenType.getName(token) + '.');
                return false;
            }
        });


        return {
            __ctor: function() {
            },

            TokenType: TokenType,

            ASTNodeType: ASTNodeType,

            /**
             * Create new parser.
             */
            createParser: function() {
                return new Parser();
            },

            createEvaluator: function() {
                return new Evaluator();
            },

            /**
             * Returns a new CodeGenerator class with the given extensions.
             */
            createCodeGenerator: function(ctor, methods, staticMemembers) {
                return squishy.extendClass(CodeGenerator, ctor, methods, staticMemembers);
            }
        };
    })
});