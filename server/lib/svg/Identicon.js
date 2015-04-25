/**
 * Very simple Github-style identicons.
 *
 * @see http://jsfiddle.net/Qh9X5/4107/
 * @see http://en.wikipedia.org/wiki/Identicon
 */
"use strict";

var SVGUtil = require('./SVGUtil');

var HtmlColors = require('../HtmlColors');


var getRandomBool = function() {
	return Math.random() < .5;
};

var Identicon = {
	generate: function(nWidth, color1, color2) {
		return SVGUtil.createSvg()
		.then(function(svg) {
		    // ensure correct parameters
		    nWidth = nWidth || 5;
		    color1 = color1 || HtmlColors.getRandomColorHex();
			color2 = color2 || '#fffff2';

			// set SVG attributes
			svg
             .attr("width", nWidth)
             .attr("height", nWidth)
             .attr('shape-rendering', 'crispEdges');

			var isOdd = nWidth & 1;
			var nHalfWidth = Math.floor(nWidth/2);

			var drawPixel = function(x, y, hex) {
				svg.append("rect")
			     .attr("width", 1)
			     .attr("height", 1)
			     .attr("x", x)
			     .attr("y", y)
			     .attr("fill", hex);
			};

			var drawColumn = function(x, mirror) {
				for (var y = 0; y < nWidth; ++y) {
					var enable = getRandomBool();
					var hex;
					if (!enable) {
						hex = color1;
					}
					else {
						hex = color2;
					}

					// draw left-half pixel
					drawPixel(x, y, hex);

					if (mirror) {
						// mirror the half image on the right
						drawPixel(nWidth - x - 1, y, hex);
					}
				}
			}

			// Draw all pixels
			for (var x = 0; x < nHalfWidth; ++x) {
				// draw left-half pixel
				drawColumn(x, true);

			}

			if (isOdd) {
				// draw center column
				drawColumn(nHalfWidth);
			}

			return svg;
		});
	}
};

module.exports = Identicon;