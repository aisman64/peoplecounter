
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
 * This file contains basic utilities to validate some user input.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Namespace: 'bjt',

    /**
     * Base is available in both, host and client.
     */
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	var TitleMinLength = 1;		// note: In some languages, a single character name or title actually makes sense
    	var TitleMaxLength = 50;


        return {
        	/**
        	 * Verifies if the given name or title is `sensible` according to certain parameters.
        	 * Note that the default encoding in HTML5 is UTF-8 (which is also what we are using).
        	 * @see http://utf8-chartable.de/
        	 */
            validateNameOrTitle: function(title) {
                if (!title) return false;

                title = this.trimNameOrTitle(title);

            	// check length
            	if (title.length < TitleMinLength || title.length > TitleMaxLength) return false;

            	// check characters against UTF-8 table
            	var valid = true;
            	//var hex = '';
            	for (var i = 0; i < title.length; ++i) {
            		var c = title.charCodeAt(i);
            		//hex += '0x' + c.toString(16) + ' ';
            		if (c < 0x20) { valid = false; break; }						// control characters
            		if (c == 0x2f) { valid = false; break; }					// slash
            		if (c == 0x5c) { valid = false; break; }			        // backslash
            		if (c > 0x7a && c < 0x80) { valid = false; break; }			// special characters
            		if (c >= 0xC280 && c <= 0xC2A0) { valid = false; break; }	// mostly control characters
            	}
            	//console.log(hex);

                return valid ? title : false;
            },

            /**
             *
             */
            trimNameOrTitle: function(title) {
                return title.trim();
            }
        };
    }),

    /**
     * Everything defined in Host will live in the host context (here).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        return {
            Private: {
            },
            
            /**
             * Public commands can be directly called by the client
             */
            Public: {
            }
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client.
     *
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
    	return {

            /**
             * This is called by the UIMgr during setup, and we can use it to register our custom directive.
             */
            setupUI: function(UIMgr, app) {
                var This = this;

                // validated-text-input directive
                // for an example of a similar directive,
                //   see: http://stackoverflow.com/questions/16546771/how-do-i-pass-multiple-attributes-into-an-angular-js-attribute-directive
                app.lazyDirective('validatedTextInput', ['$compile', function($compile) { return {
                    /**
                     * It can only be used as an Element
                     */
                    restrict: 'E',
                    require: 'ngModel',
                    replace: true,

                    /**
                     * Declare an isolated scope.
                     * @see http://onehungrymind.com/angularjs-sticky-notes-pt-2-isolated-scope/
                     * @see http://stackoverflow.com/questions/14115701/angularjs-create-a-directive-that-uses-ng-model
                     */
                    scope: {
                        validateModel: '=',
                        validateError: '=',
                        validateResultInvalid: '&',
                        validationFunction: '='
                    },
                    template: '<input type="text" ng-model="validateModel" />',
                    link: function($scope, $elem, $attrs) {
                        var revalidate = function() {
                            // validate input
                            var validationFunction = $scope.validationFunction || This.validateNameOrTitle.bind(This);
                            var isValid = !!validationFunction($scope.validateModel);
                            $scope.validateError = (isValid ? false : 
                                ($scope.validateResultInvalid ? $scope.$eval($scope.validateResultInvalid) : false));
                        };

                        $scope.$watch('validateModel', revalidate);

                        setTimeout(revalidate);
                    }

                };}]);
            },

            /**
             * Client commands can be directly called by the host
             */
            Public: {
            }
        };
    })
});
