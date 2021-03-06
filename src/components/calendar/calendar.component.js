var angular = require('angular');
var $ = require('jquery');

var moment = require('moment');
var { extendMoment } = require('moment-range');
var _ = require('underscore');

var templateUrl = require('./calendar.component.nghtml');

// add moment-range
moment = extendMoment(moment);

//Creating bookingCalendar component on the StickyBooking Module
angular.module('StickyBooking')
    .component('bookingCalendar', {
        templateUrl: templateUrl,
        controller: function($scope, occasionSDKService){
            $scope.setTimeSlotsForMonth = function(month, timeSlots) {
                if(_.isUndefined(month)) return;

                $scope.timeSlotsByMonth[month.format('MM-YYYY')] = timeSlots;
            };

            $scope.getTimeSlotsForMonth = function(month) {
                if(_.isUndefined(month)) return;

                return $scope.timeSlotsByMonth[month.format('MM-YYYY')];
            };

            $scope.$on('initialDataLoaded', function(event, data) {
                $scope.product = data.product;

                var firstDay = $scope.product.firstTimeSlotStartsAt;

                // Set starting month and year for the calendar to display
                $scope.activeCalendarMonth = firstDay.startOf('month');

                // Get all time slots for the month, starting at the current moment (i.e. day)
                occasionSDKService.getTimeSlotsByMonth($scope.product, firstDay)
                .then((timeSlots) => {
                    $scope.setTimeSlotsForMonth($scope.activeCalendarMonth, timeSlots);

                    $scope.$emit('calendarDataLoaded', {
                        calendarDataLoaded: true,
                        duration: moment.duration(timeSlots.first().duration, 'minutes')
                    });

                    $scope.$apply();
                });
            });

            this.$onInit = function(){
                $scope.calendarWeeks = {};
                $scope.timeSlotsByMonth = {};
            };

            // Constructs rows of weeks starting on Sunday and ending on Saturday, for display as a calendar
            // Each cell of the calendar is a Moment.js date corresponding to that day
            $scope.getCalendarWeeksForMonth = function(month) {
                if(!$scope.calendarWeeks[month.format('MM-YYYY')]) {
                  let startDate = moment(month).startOf('month').startOf('week');
                  let endDate = moment(month).endOf('month').endOf('week');

                  var weeks = [];
                  var currentWeek = 0;
                  _.each(Array.from(moment.range(startDate, endDate).by('days')), function(moment) {
                    if(moment.day() == 0) {
                      weeks[currentWeek] = [moment];
                    } else {
                      weeks[currentWeek].push(moment);
                    }

                    if(moment.day() == 6) {
                      currentWeek++;
                    }
                  });

                  $scope.calendarWeeks[month.format('MM-YYYY')] = weeks;
                }

              return $scope.calendarWeeks[month.format('MM-YYYY')];
            };

            //Moves the activeCalendar month forward to display the next month
            $scope.moveMonthAhead = function() {
                var nextMonth = moment($scope.activeCalendarMonth).add(1, 'month');

                if(!_.has($scope.timeSlotsByMonth, nextMonth.format('MM-YYYY'))) {
                    $scope.getNewTimeSlots(nextMonth)
                        .then(() => {
                            $scope.activeCalendarMonth = nextMonth;
                            $scope.$apply();
                        });
                } else {
                    $scope.activeCalendarMonth = nextMonth;
                }
            };

            //Moves the activeCalendar month back to display the previous month
            $scope.moveMonthBack = function(){
                $scope.activeCalendarMonth.subtract(1, 'month');
            };

            $scope.canMoveMonthBack = function() {
                return $scope.activeCalendarMonth.isAfter(moment(), 'month');
            };

            //Gets new month of time slots on month change
            $scope.getNewTimeSlots = function(month){
                $scope.$emit('startLoading');

                return occasionSDKService.getTimeSlotsByMonth($scope.product, month)
                    .then((newTimeSlots) => {
                        console.log("Time slots by month", newTimeSlots);
                        $scope.setTimeSlotsForMonth(month, newTimeSlots);
                        $scope.$emit('stopLoading');
                    })
                    .catch( (error) => console.log("Error", error) );
            };

            //Evaluates what classes should be applied to the date to distinguish availability
            $scope.getDisplayClassForDay = function(day){
                if(day.isBefore($scope.activeCalendarMonth) || day.isAfter(moment($scope.activeCalendarMonth).endOf('month'))) {
                    return 'empty-date';
                } else if(day.isBefore(moment(), 'day')) {
                    return 'unavailable-day';
                } else {
                    var timeSlotForDay = $scope.getTimeSlotsForMonth($scope.activeCalendarMonth).detect(function(timeSlot) {
                        return day.isSame(timeSlot.startsAt, 'day');
                    });

                    if(!_.isUndefined(timeSlotForDay)) {
                        var str = 'available-time-slot';
                        if($scope.selectedDate && $scope.selectedDate.isSame(day, 'day')) {
                            str += ' selected-date';
                        }

                        return str;
                    } else {
                        return 'unavailable-day';
                    }
                }
            };

            //When date is selected from calendar
            $scope.onDateSelection = function(day){
                if($scope.getDisplayClassForDay(day) == 'available-time-slot'){
                    $scope.selectedDate = day;

                    var availableTimeSlotsForDay =
                        $scope.getTimeSlotsForMonth($scope.activeCalendarMonth).select(function(timeSlot) {
                            return timeSlot.startsAt.isSame(day, 'day');
                        });

                    $scope.$emit('dateSelectedEvent', {
                        selectedDate: $scope.selectedDate,
                        availableTimeSlots: availableTimeSlotsForDay
                    });
                }
            };

            //Scroll to specified anchor tag
            $scope.scrollToAnchor = function(aid){
                var aTag = $("a[name='"+ aid +"']");
                $('html, body').animate( { scrollTop: aTag.offset().top }, 'slow');
            };

        } //End Controller

    }); //End Component
