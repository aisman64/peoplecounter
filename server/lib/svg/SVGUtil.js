/**
 * Very simple Github-style identicons.
 * @see http://en.wikipedia.org/wiki/Identicon
 */
"use strict";

var D3fix = require('../d3/d3-fix');

var fs = Promise.promisifyAll(require('fs'));
var xmldom = require('xmldom');

module.exports = {
	createSvg: function() {
		return new Promise(function(resolve, reject) {
			D3fix(function(d3) {
			    resolve(d3.select("body").append("svg"));
			});
		});
	},

	writeSvg: function(fileName, svg) {
		// write SVG file
		// see: http://robballou.com/2013/creating-an-svg-file-with-d3-and-node-js/
		var svgXml = svg.attr('xmlns', 'http://www.w3.org/2000/svg');
		var svgString = (new xmldom.XMLSerializer()).serializeToString(svgXml[0][0]).toLowerCase();
		return fs.writeFileAsync(fileName, svgString);
	}
};