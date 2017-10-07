//Function to be called when dependencies are loaded and the angular application may begin running
let initializeCalendarComponent = function(){

    //Creating bookingCalendar component on the StickyBooking Module
    angular.module('StickyBooking')
        .component('bookingCalendar', {
            templateUrl: '/app/components/calendar/calendar.component.html',
            controller: function($scope, occasionSDKService){

                this.$onInit = function(){
                    //Configure calendar to display up to 6 months from today
                    let startDate = new Date ( (1 + new Date().getMonth()) + '/01/' + new Date().getFullYear() );
                    let endDate = new Date(startDate);
                    endDate.adjust('months', 6);
                    endDate.adjust('days', -1);

                    //Set starting month and year for the calendar to display
                    $scope.activeCalendarMonth = new Date().getMonth();
                    $scope.activeCalendarYear = new Date().getFullYear();

                    //Set max and min range for the calendar in terms of month and year
                    $scope.minCalendarMonth = startDate.getMonth();
                    $scope.minCalendarYear = startDate.getFullYear();
                    $scope.maxCalendarMonth = endDate.getMonth();
                    $scope.maxCalendarYear = endDate.getFullYear();

                    $scope.$on('initialDataLoaded', function(event, data){
                        $scope.merchant = data.merchant;
                        $scope.product = data.product;
                        $scope.timeSlots = data.timeSlots;
                        $scope.durations = data.durations;

                        //Build calendar object array based on startDate and endDate from above
                        $scope.allDatesArrayLoaded = false;
                        $scope.buildAllDatesArray(startDate, endDate, function(){
                            console.log("All Dates Array Configured", $scope.allDates);
                            $scope.allDatesArrayLoaded = true;
                            $scope.$apply();
                        });

                    });

                }

                //Function takes in the first and last date of booking availability and 
                //generates an object array representing the dates that must be printed
                //in the calendar on the page
                $scope.buildAllDatesArray = function(startDate, endDate, callbackFromBuild){
                    $scope.allDates = [];

                    let iterationMonth = null;
                    let iterationYear = null;
                    let monthCount = 0;
                    let yearCount = 0;

                    //For the range between startDate and endDate, with an interval of days, stepping 1 day at a time
                    startDate.each(endDate, 'days', 1, function(currentDate, currentStep, thisDate){
                        let newMonth = false;
                        let newYear = false;
                        let startDate = false;

                        //Conditionally detect if this date is the start of a month or year
                        if(iterationMonth == null){
                            startDate = true;
                            iterationMonth = new Date(thisDate).getMonth();
                            iterationYear = new Date(thisDate).getFullYear();
                            if(new Date(thisDate).getDate() == 1){
                                newMonth = true;
                                if(new Date(thisDate).getMonth() == 0){
                                    newYear = true;
                                }
                            }
                        }else{
                            if(iterationMonth < new Date(currentDate).getMonth()){
                                iterationMonth++;
                                newMonth = true;
                            }
                            if(iterationMonth > new Date(currentDate).getMonth()){
                                iterationMonth = 0;
                                newYear = true;
                                newMonth = true;
                            }
                        }
                        if(startDate){
                            $scope.allDates.push( { year: new Date(currentDate).getFullYear(), months: [] } );
                            $scope.allDates[yearCount].months.push( { month: new Date(currentDate).getMonth(), monthName: new Date(currentDate).getMonthName(), days: [] } );
                        }else{
                            if(newYear){
                                $scope.allDates.push( { year: new Date(currentDate).getFullYear(), months: [] } );
                                yearCount++;
                                monthCount = 0;
                                if(newMonth){
                                    $scope.allDates[yearCount].months.push( { month: new Date(currentDate).getMonth(), monthName: new Date(currentDate).getMonthName(), days: [] } )
                                }
                            }else{
                                if(newMonth){
                                    $scope.allDates[yearCount].months.push( { month: new Date(currentDate).getMonth(), monthName: new Date(currentDate).getMonthName(), days: [] } )
                                    monthCount++;
                                }
                            }
                        }
                        $scope.allDates[yearCount].months[monthCount].days.push({ 
                            stringDate: currentDate.toString(), 
                            dayOfWeek: new Date(currentDate).getDay(), 
                            date: new Date(currentDate).getDate()
                        });
                    });
                    //Create paginated weeks array inside the allDates array
                    $scope.paginateWeeks(() => {
                        //Run the callback from build function
                        callbackFromBuild();
                    });
                }

                //Adds an object of paginated weeks to the allDates array under a month object
                $scope.paginateWeeks = function(callback){
                    let weekPages = [];
                    let week = [];

                    //Loop through each year
                    for(var y = 0; y < $scope.allDates.length; y++){
                        //Loop through each month
                        for(var m = 0; m < $scope.allDates[y].months.length; m++){
                            //Loop through each day
                            for(var d = 0; d < $scope.allDates[y].months[m].days.length; d++){
                                let thisDay = $scope.allDates[y].months[m].days[d];
                                week.push( { thisDay } );
                                //If this is the last day of the week but not of the month
                                if( thisDay.dayOfWeek == 6 && thisDay.date < $scope.allDates[y].months[m].days[$scope.allDates[y].months[m].days.length - 1].date ){
                                    weekPages.push( week );
                                    week = [];
                                }
                                //If this is the last day of the month
                                if(d == $scope.allDates[y].months[m].days.length - 1){
                                    weekPages.push( week );
                                    $scope.allDates[y].months[m].weeks = weekPages;
                                    weekPages = [];
                                    week = [];
                                }
                            }
                        }
                    }
                    //Run callback function
                    callback();
                }

                //Moves the activeCalendar month forward to display the next month
                $scope.moveMonthAhead = function(){
                    if( $scope.activeCalendarMonth < 11 ){
                        if( $scope.activeCalendarYear < $scope.maxCalendarYear ){
                            $scope.activeCalendarMonth++;
                        }else if( $scope.activeCalendarYear == $scope.maxCalendarYear ){
                            if( ($scope.activeCalendarMonth + 1) <= $scope.maxCalendarMonth ){
                                $scope.activeCalendarMonth++;
                            }
                        }
                    }else{
                        if( (0 <= $scope.maxCalendarMonth) && (($scope.activeCalendarYear + 1) <= $scope.maxCalendarYear) ){
                            $scope.activeCalendarMonth = 0;
                            $scope.activeCalendarYear++;
                        }
                    }
                }

                //Moves the activeCalendar month back to display the previous month
                $scope.moveMonthBack = function(){
                    if($scope.activeCalendarMonth > 0){
                        if( $scope.activeCalendarYear > $scope.minCalendarYear ){
                            $scope.activeCalendarMonth--;
                        }else if( $scope.activeCalendarYear == $scope.minCalendarYear ){
                            if( ($scope.activeCalendarMonth - 1) >= $scope.minCalendarMonth){
                                $scope.activeCalendarMonth--;
                            }
                        }
                    }else if( $scope.activeCalendarMonth == 0 ){
                        if( (11 >= $scope.minCalendarMonth) && ( ($scope.activeCalendarYear - 1) >= $scope.minCalendarYear) ){
                            $scope.activeCalendarMonth = 11;
                            $scope.activeCalendarYear--;
                        }
                    }
                }

                //Evaluates what classes should be applied to the date to distinguish availability
                $scope.getDisplayClasses = function(passDay){
                    let day = passDay.thisDay;
                    let dayOfWeek = day.dayOfWeek;
                    let classString = 'unavailable-day';

                    //Set class depending on if there is a session that day
                    $scope.timeSlots.map( (timeSlot) => {
                        if( $scope.sameDay( new Date(timeSlot.startsAt), new Date(day.stringDate) )){
                            classString = 'available-time-slot';
                        }
                    });

                    //Set days before today to be unavailable
                    if( new Date(day.stringDate) < new Date() ){
                        classString = "unavailable-day";
                    }

                    //Return the class to be applied to the element
                    return classString;
                }

                //Evaluates if the date should be clickable
                $scope.getClickableStatus = function(passDay){
                    let day = passDay.thisDay;
                    let dayOfWeek = day.dayOfWeek;
                    let clickable = false;

                    //Set day as clickable if there is a session that day
                    $scope.timeSlots.map( (timeSlot) => {
                        if( $scope.sameDay( new Date(timeSlot.startsAt), new Date(day.stringDate) )){
                            clickable = true;
                        }
                    });

                    //Set days before today as unavailable
                    if( new Date(day.stringDate) < new Date() ){
                        clickable = false;
                    }

                    //Return the clickable status
                    return clickable;
                }

                //Check to see if two dates are on the same day
                $scope.sameDay = function(d1, d2) {
                    return d1.getUTCFullYear() === d2.getUTCFullYear() &&
                           d1.getUTCMonth() === d2.getUTCMonth() &&
                           d1.getUTCDate() === d2.getUTCDate();
                }

                //Returns a collection of a given length
                $scope.returnRange = function(n) {
                    var range = [];
                    for(var i = 0; i < n; i++){
                        range.push(i);
                    }
                    return range;
                }
                
                //When date is selected from calendar
                $scope.onDateSelection = function(event, passDay){
                    let day = passDay.thisDay;
                    if( $scope.getClickableStatus(passDay) ){
                        if( $scope.selectedDateElement != null ){
                            $scope.selectedDateElement.className = "available-time-slot";
                        }

                        $scope.friendlyDate = new Date(day.stringDate).formatDate();
                        $scope.selectedDate = day;
                        $scope.selectedDateElement = event.currentTarget;
                        $scope.selectedDateElement.className += " selected-date";

                        $(".time-slot-buttons button").removeClass("time-slot-active");
                        $('.available-times').fadeIn();
                        $scope.scrollToAnchor('time-slot-scroll');
                        $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
                        $("#booking-process-status .booking-step-2").addClass("booking-step-active");
                        $("#booking-process-status .booking-step-2").addClass("booking-step-complete").removeClass("booking-step-active");
                        $("#booking-process-status .booking-step-3").addClass("booking-step-active");

                        $scope.$emit('dateSelectedEvent', {
                            friendlyDate: $scope.friendlyDate,
                            selectedDate: $scope.selectedDate,
                            selectedDateElement: $scope.selectedDateElement,
                        });
                    }
                }

                //Scroll to specified anchor tag
                $scope.scrollToAnchor = function(aid){
                    var aTag = $("a[name='"+ aid +"']");
                    $('html, body').animate( { scrollTop: aTag.offset().top }, 'slow');
                }

            } //End Controller

        }); //End Component

} //End Init Function