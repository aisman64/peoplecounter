/**
 * Some general utilities for a DOM-enabled environment.
 */
"use strict";

/**
 * Builds the complete form Url, including the query string encoded in its `input` fields.
 *
 * @see http://jsfiddle.net/Q63w6/
 */
squishy.getGlobalContext().getFullFormUrl = function($form) {
	var url = $form.attr('action');
    if (($form.attr('method') || 'get').toLowerCase() === 'get') {
		url += "?";
		var urlElements = [];

		// build query string from `input` fields
		$form.find('input').each(function(){
			var child = $(this);
			var name = child.attr("name");
			if (name) {
			    urlElements.push(name + "=" + child.attr("value") || '');
			}
		});
		urlElements = urlElements.join("&");
		url += urlElements;
	}

	return url;
};


/**
 * @see http://stackoverflow.com/questions/6677035/jquery-scroll-to-element
 */
squishy.getGlobalContext().scrollToElement = function($element, delta) {
	console.assert($element.length, 'Invalid $element - must be a jQuery wrapper (e.g. `$(someHTMLElement)`).');

    $('html, body').animate({ 
        scrollTop: $element.offset().top - (delta || 20)
    }, 100);
};

squishy.getGlobalContext().getOrCreateScreenDimmer = function(css) {
	var ThisFunction = squishy.getGlobalContext().getOrCreateScreenDimmer;
	var $body;
	var _dimmed = false;

	if (!ThisFunction.dimElement) {
		$body = $(document.body);

		/**
		 * Dim/darken the entire page.
		 * @see http://stackoverflow.com/questions/14913788/jquery-dim-entire-page-and-fade-up-one-div-element
		 */
		var dimPageCss = css || {
		    position: 'fixed',
		    width: '100%',
		    height: '100%',
		    'background-color': '#000',
		    opacity: '.75',
		    'z-index': '9999',
		    top: '0',
		    left: '0'
		};
		ThisFunction.dimElement = $('<div />').css(dimPageCss);
	}

	return {
		/**
		 * If dimmed is set, fade-in the dim element and place it on top of everything else.
		 * Else, remove the dim element.
		 */
		setDimmed: function(dimmed) {
			if (dimmed == _dimmed) return;

			_dimmed = dimmed;
			if (dimmed) {
				// dim
				$body.append(ThisFunction.dimElement);
				ThisFunction.dimElement.fadeIn('fast');
			}
			else {
				// undim
				ThisFunction.dimElement.fadeOut('fast', ThisFunction.dimElement.remove.bind(ThisFunction.dimElement));
			}
		},

		getDimElement: function() {
			return ThisFunction.dimElement;
		},

		/**
		 *
		 */
		isScreenDimmed: function() {
			// check if screen is currently dimmed by `dimElement`
			return _dimmed;
		}
	};
};

/**
 * Dims the entire page and highlights the given element.
 * You must make sure the element is actually visible which can be arbitrarily difficult.
 * Will automatically stop dimming after `timeout` milliseconds.
 */
squishy.getGlobalContext().dimAllAndHighlightOne = function($element, timeout) {
	var ThisFunction = squishy.getGlobalContext().dimAllAndHighlightOne;

	var dimmer = getOrCreateScreenDimmer();

	// check arguments
	console.assert($element);
	timeout = timeout || 3000;

	// reset function to set everything back to normal
	function resetScreen() {
		ThisFunction.timer = null;
		$element.css('z-index', ThisFunction.zIndex);

		// fade out and remove cover
		dimmer.setDimmed(false);
	}

	dimmer.setDimmed(true);

	// check timer
	if (ThisFunction.timer) {
		// remove old timer and reset everything
		clearTimeout(ThisFunction.timer);
		resetScreen();
	}

	// highlight new element
	ThisFunction.zIndex = $element.css('z-index');
	$(document.body).append(cover);
	$element.css('z-index', 10000);

	// start new timer
	ThisFunction.timer = setTimeout(function() {
		// reset everything
		resetScreen();
	}, timeout);
};


/**
 * Manages and allows to observe the application window's active + focus status.
 *
 * @see http://jsfiddle.net/cAG5N/59/
 */
squishy.getGlobalContext().getApplicationActiveWatch = (function() {
	// static/global parameters
	var visibilityState = null;
	var visibilityChangeProperty = null;
	var hiddenProperty = null;
	var lastIsActive = false;
	var applicationActiveChangedEvt = squishy.createEvent();	

    var backgroundCheckTimer;
    var updateIntervalMillis = 200;

    var watch = {
		/**
		 * This event is fired when application has turned from active to inactive, or from inactive to active
		 */
		applicationActiveChanged: applicationActiveChangedEvt,

		/**
		 * Whether this application's window is currently active and focused.
		 */
		isApplicationActive: function() {
		    return document[visibilityState] && document.hasFocus();
		}
	};


	function onFocusChanged(isActive) {
		applicationActiveChangedEvt.fire(isActive);
	}

	function checkFocus() {
	    var isActive = watch.isApplicationActive();
	    if (isActive === lastIsActive) return;

	    onFocusChanged(isActive);
	    lastIsActive = isActive;
	}

	// this is the actual "get" function
	return function() {
		if (!hiddenProperty) {
			$(document).ready(function _initActiveStatus() {
			    if (typeof document.hidden !== "undefined") {
			        hiddenProperty = "hidden", visibilityChangeProperty = "visibilitychange", visibilityState = "visibilityState";
			    }
			    else if (typeof document.mozHidden !== "undefined") {
			        hiddenProperty = "mozHidden", visibilityChangeProperty = "mozvisibilitychange", visibilityState = "mozVisibilityState";
			    }
			    else if (typeof document.msHidden !== "undefined") {
			        hiddenProperty = "msHidden", visibilityChangeProperty = "msvisibilitychange", visibilityState = "msVisibilityState";
			    }
			    else if (typeof document.webkitHidden !== "undefined") {
			        hiddenProperty = "webkitHidden", visibilityChangeProperty = "webkitvisibilitychange", visibilityState = "webkitVisibilityState";
			    }
			    else {
			    	throw new Error('Application activity watch is not supported');
			    }
			    
			    //lastIsActive = watch.isApplicationActive();

			    // add event handler through visibility change API
			    document.addEventListener(visibilityChangeProperty, checkFocus);

			    // check regularly
			    backgroundCheckTimer = setInterval(checkFocus, updateIntervalMillis);
			});
		}


		return watch;
	};
})();


/**
 * This needs a lot more work.
 * @see http://stackoverflow.com/a/29057922/2228771
 */
squishy.getGlobalContext().getEnvironmentInfo = function() {
	return {
		platform: navigator.platform,
		userAgent: navigator.userAgent
	};
};