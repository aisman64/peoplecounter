/**
 * Very simple cookie management utility.
 * Basically ignores all cookie hints, and does not accurately track cookie status.
 * However, it works for anything short-lived.
 */
"use strict";

var fs = require('fs');
var path = require('path');

module.exports = squishy.createClass(
	function CookieJar() {
		this.cookies = {};

		// define private object so it won't be enumerable (better than nothing)
		Object.defineProperty(this, 'private', {
			writable: true,
			value: {
				cookieString: '',
				dirty: true
			}
		});
	},{
		isEmpty: function() {
			return this.buildCookieString().length == 0;
		},

		clear: function() {
			this.cookies = {};
			this.private.dirty = true;
		},

		/**
		 * Update cookies, according to response sent by server.
		 */
		updateCookiesFromRes: function(res) {
	        var newCookies = res.headers['set-cookie'];
	        if (newCookies) {
				var cookies = this.cookies;
	            newCookies.forEach(function(cookie) {
	            	// parse cookie
	                var str = cookie.split(';', 1)[0];
	                var pair = str.split('=', 2);
	                var name = pair[0];
	                var value = pair.length >= 2 && pair[1] ? pair[1] : "";
	                if (value === 'deleted') {
	                    // unset cookie
	                    delete cookies[name];
	                }
	                else {
	                    // set cookie
	                    cookies[name] = value;
	                }
	            });

	            // rebuild the cookie header string
	            this.private.dirty = true;
	        }
		},

		/**
		 * Add cookies to header of the given request object.
		 */
		attachCookiesToHeaders: function(headers) {
	        headers.Cookie = this.buildCookieString();
		},

		/**
		 * @see http://en.wikipedia.org/wiki/HTTP_cookie#Setting_a_cookie
		 */
		buildCookieString: function() {
			if (this.private.dirty) {
	            var cookieString = '';

	            var written = false;
	            for (var key in this.cookies) {
	            	cookieString += key + '=' + this.cookies[key] + '; ';
	            	written = true;
	            }

	            if (written) {
	            	cookieString = cookieString.substring(0, cookieString.length-2);
	            }

	            this.private.cookieString = cookieString;
	            this.private.dirty = false;
			}
			return this.private.cookieString;
		},
	});