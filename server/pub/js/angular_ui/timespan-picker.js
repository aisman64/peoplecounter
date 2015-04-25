/**
 * <timespan-picker> is a custom UI element, based on Angular-UI's <timepicker>.
 */
"use strict";

angular.module('timespanPicker', [])

.constant('timespanPickerConfig', {
  dayStep: 1,
  hourStep: 1,
  minuteStep: 30,
  readonlyInput: false,
  mousewheel: true
})

.controller('TimespanPickerController', ['$scope', '$attrs', '$parse', '$log', '$locale', 'timespanPickerConfig', 
    function($scope, $attrs, $parse, $log, $locale, timespanPickerConfig) {
      // create new moment duration
      // see:http://momentjs.com/docs/#/durations/
  var duration = moment.duration(1, 'h'),
      ngModelCtrl = { $setViewValue: angular.noop }; // nullModelCtrl

  this.init = function( ngModelCtrl_, inputs ) {
    ngModelCtrl = ngModelCtrl_;
    ngModelCtrl.$render = this.render;

    var daysInputEl =  inputs.eq(0),
        hoursInputEl = inputs.eq(1),
        minutesInputEl = inputs.eq(2);

    var mousewheel = angular.isDefined($attrs.mousewheel) ? $scope.$parent.$eval($attrs.mousewheel) : timespanPickerConfig.mousewheel;
    if ( mousewheel ) {
      this.setupMousewheelEvents( daysInputEl, hoursInputEl, minutesInputEl );
    }

    $scope.readonlyInput = angular.isDefined($attrs.readonlyInput) ? $scope.$parent.$eval($attrs.readonlyInput) : timespanPickerConfig.readonlyInput;
    this.setupInputEvents( daysInputEl, hoursInputEl, minutesInputEl );
  };

  var dayStep = timespanPickerConfig.dayStep;
  if ($attrs.dayStep) {
    $scope.$parent.$watch($parse($attrs.dayStep), function(value) {
      dayStep = parseInt(value, 10);
    });
  }

  var hourStep = timespanPickerConfig.hourStep;
  if ($attrs.hourStep) {
    $scope.$parent.$watch($parse($attrs.hourStep), function(value) {
      hourStep = parseInt(value, 10);
    });
  }

  var minuteStep = timespanPickerConfig.minuteStep;
  if ($attrs.minuteStep) {
    $scope.$parent.$watch($parse($attrs.minuteStep), function(value) {
      minuteStep = parseInt(value, 10);
    });
  }


  function getDaysFromTemplate ( ) {
    var days = parseInt( $scope.days, 10 );
    days = Math.max(days, 0);   // days have no upper limit
    return days || 0;
  }

  function getHoursFromTemplate ( ) {
    var hours = parseInt( $scope.hours, 10 );
    hours = Math.max(Math.min(hours, 23), 0);
    return hours || 0;
  }

  function getMinutesFromTemplate() {
    var minutes = parseInt($scope.minutes, 10);
    minutes = Math.max(Math.min(minutes, 59), 0);
    return minutes || 0;
  }

  function pad( value ) {
    return ( angular.isDefined(value) && value.toString().length < 2 ) ? '0' + value : value;
  }

  // Respond on mousewheel spin
  this.setupMousewheelEvents = function( daysInputEl, hoursInputEl, minutesInputEl ) {
    var isScrollingUp = function(e) {
      if (e.originalEvent) {
        e = e.originalEvent;
      }
      //pick correct delta variable depending on event
      var delta = (e.wheelDelta) ? e.wheelDelta : -e.deltaY;
      return (e.detail || delta > 0);
    };

    daysInputEl.bind('mousewheel wheel', function(e) {
      $scope.$apply( (isScrollingUp(e)) ? $scope.incrementDays() : $scope.decrementDays() );
      e.preventDefault();
    });

    hoursInputEl.bind('mousewheel wheel', function(e) {
      $scope.$apply( (isScrollingUp(e)) ? $scope.incrementHours() : $scope.decrementHours() );
      e.preventDefault();
    });

    minutesInputEl.bind('mousewheel wheel', function(e) {
      $scope.$apply( (isScrollingUp(e)) ? $scope.incrementMinutes() : $scope.decrementMinutes() );
      e.preventDefault();
    });

  };

  this.setupInputEvents = function( daysInputEl, hoursInputEl, minutesInputEl ) {
    if ( $scope.readonlyInput ) {
      $scope.updateDays = angular.noop;
      $scope.updateHours = angular.noop;
      $scope.updateMinutes = angular.noop;
      return;
    }

    // set days
    $scope.updateDays = function() {
      var days = getDaysFromTemplate();
      duration.subtract(Math.floor(duration.asDays() + .001), 'd').add(days, 'd');
      refresh( 'd' );
    };

    daysInputEl.bind('blur', function(e) {
    });

    // set hours
    $scope.updateHours = function() {
      var hours = getHoursFromTemplate();
      duration.subtract(duration.hours(), 'h').add(hours, 'h');
      refresh( 'h' );
    };

    hoursInputEl.bind('blur', function(e) {
      if ( $scope.hours < 10) {
        // pad
        $scope.$apply( function() {
          $scope.hours = pad( $scope.hours );
        });
      }
    });

    // set minutes
    $scope.updateMinutes = function() {
      var minutes = getMinutesFromTemplate();
      duration.subtract(duration.minutes(), 'm').add(minutes, 'm');
      refresh( 'm' );
    };

    minutesInputEl.bind('blur', function(e) {
      if ($scope.minutes < 10 ) {
        // pad
        $scope.$apply( function() {
          $scope.minutes = pad( $scope.minutes );
        });
      }
    });

  };


  /**
   * Model value was updated from the outside
   */
  this.render = function() {
    var minutes = ngModelCtrl.$modelValue || 0;

    if ( !isNaN(minutes) ) {
        duration = moment.duration(minutes, 'm');
        updateTemplate();
    }
  };

  // update model value
  function refresh( keyboardChange ) {
    ngModelCtrl.$setViewValue( duration.asMinutes() );
    updateTemplate( keyboardChange );
  }

  function updateTemplate( keyboardChange ) {
    var days = Math.floor(duration.asDays() + .001),
        hours = duration.hours(),
        minutes = duration.minutes();

    $scope.days = keyboardChange === 'd' ? days : days;
    $scope.hours = keyboardChange === 'h' ? hours : pad(hours);
    $scope.minutes = keyboardChange === 'm' ? minutes : pad(minutes);
  }

  function addMinutes( minutes ) {
    duration.add(minutes, 'm');
    refresh();
  }

  $scope.incrementDays = function() {
    addMinutes( dayStep * 24 * hourStep * 60 );
  };
  $scope.decrementDays = function() {
    addMinutes( - dayStep * 24 * hourStep * 60 );
  };
  $scope.incrementHours = function() {
    addMinutes( hourStep * 60 );
  };
  $scope.decrementHours = function() {
    addMinutes( - hourStep * 60 );
  };
  $scope.incrementMinutes = function() {
    addMinutes( minuteStep );
  };
  $scope.decrementMinutes = function() {
    addMinutes( - minuteStep );
  };
}])

.directive('timespanPicker', function () {
  return {
    restrict: 'EA',
    require: ['timespanPicker', '?^ngModel'],
    controller:'TimespanPickerController',
    replace: true,
    scope: {},
    templateUrl: 'template/timespanPicker/timespanPicker.html',
    link: function(scope, element, attrs, ctrls) {
      var timespanPickerCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if ( ngModelCtrl ) {
        timespanPickerCtrl.init( ngModelCtrl, element.find('input') );
      }
    }
  };
})

.run(["$templateCache", function($templateCache) {
  $templateCache.put("template/timespanPicker/timespanPicker.html",
    "<table>\n" +
    " <tbody>\n" +
    "   <tr class=\"text-center\">\n" +
    "     <td><a ng-click=\"incrementDays()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-up\"></span></a></td>\n" +
    "     <td style=\"width: 1.3em\"></td>\n" +
    "     <td><a ng-click=\"incrementHours()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-up\"></span></a></td>\n" +
    "     <td style=\"width: 1.3em\"></td>\n" +
    "     <td><a ng-click=\"incrementMinutes()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-up\"></span></a></td>\n" +
    "     <td style=\"width: 1.3em\"></td>\n" +
    "   </tr>\n" +
    "   <tr>\n" +
    "     <td style=\"width:3em;\" class=\"form-group\" ng-class=\"{'has-error': invalidDays}\">\n" +
    "       <input type=\"text\" ng-model=\"days\" ng-change=\"updateDays()\" class=\"form-control text-center\" ng-mousewheel=\"incrementDays()\" ng-readonly=\"readonlyInput\">\n" +
    "     </td>\n" +
    "     <td>&nbsp;d</td>\n" +
    "     <td style=\"width:3em;\" class=\"form-group\" ng-class=\"{'has-error': invalidHours}\">\n" +
    "       <input type=\"text\" ng-model=\"hours\" ng-change=\"updateHours()\" class=\"form-control text-center\" ng-mousewheel=\"incrementHours()\" ng-readonly=\"readonlyInput\" maxlength=\"2\">\n" +
    "     </td>\n" +
    "     <td>&nbsp;h</td>\n" +
    "     <td style=\"width:3em;\" class=\"form-group\" ng-class=\"{'has-error': invalidMinutes}\">\n" +
    "       <input type=\"text\" ng-model=\"minutes\" ng-change=\"updateMinutes()\" class=\"form-control text-center\" ng-readonly=\"readonlyInput\" maxlength=\"2\">\n" +
    "     </td>\n" +
    "     <td>&nbsp;m</td>\n" +
    "   </tr>\n" +
    "   <tr class=\"text-center\">\n" +
    "     <td><a ng-click=\"decrementDays()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-down\"></span></a></td>\n" +
    "     <td>&nbsp;&nbsp;</td>\n" +
    "     <td><a ng-click=\"decrementHours()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-down\"></span></a></td>\n" +
    "     <td>&nbsp;&nbsp;</td>\n" +
    "     <td><a ng-click=\"decrementMinutes()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-down\"></span></a></td>\n" +
    "     <td>&nbsp;&nbsp;</td>\n" +
    "   </tr>\n" +
    " </tbody>\n" +
    "</table>\n");
}]);