let initializeAngular = function(){

    //Create angular module attached to the element with attribute ng-app = StickyBooking
    let app = angular.module('StickyBooking', []);

    //Create angular controller attached to the element with attribute ng-controller = BookingController
    app.controller('BookingController', function($scope, $http) {

        //OnInit
        this.$onInit = function(){
            //Create Connection to Occasion SDK using Merchant API Key
            $scope.occasionClient = new Occasion.Client('463436b5ebf74b42873aaa544801f91a');

            //Create important HTML element references
            $scope.paneCalendar = document.getElementsByClassName("pane-calendar")
            $scope.paneTimeSlots = document.getElementsByClassName("available-times");
            $scope.paneCustomerInformation = document.getElementsByClassName("pane-customer-information");

            //Hide certain panes
            $scope.paneCalendar[0].style.display = 'none';
            $scope.paneTimeSlots[0].style.display = 'none';
            $scope.paneCustomerInformation[0].style.display = 'none';

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

            //Build calendar object array based on startDate and endDate from above
            $scope.buildCalendarObjectArray(startDate, endDate, function(){
                console.log("Calendar Array Configured", $scope.allDates);
            });
            
            /*
            $scope.occasionClient.Merchant.first()
                .then((merchant) => {
                    $scope.Merchant = merchant;
                    console.log("Merchant", $scope.Merchant);

                    $scope.Merchant.venues().all()
                        .then((venues) => {
                            $scope.Venues = venues
                            console.log("Venues", $scope.Venues);
                        });

                    $scope.Merchant.products().all()
                        .then((products) => {
                            $scope.Products = products;
                            console.log("Products", $scope.Products);
                        });

                    $scope.Merchant.products().first()
                        .then((product) => {
                            $scope.mainProduct = product;
                            console.log("Main Product", $scope.mainProduct);

                            $scope.mainProduct.timeSlots().where({ status: 'bookable' }).perPage(10).all()
                                .then((timeslots) => {
                                    console.log("time slots", timeslots);
                                });
                           

                            $scope.occasionClient.Product.includes('merchant', 'venue')
                                .find($scope.mainProduct.id)
                                .then((product) => {
                                    $scope.productWithIncludes = product;
                                    console.log("With Includes", $scope.productWithIncludes);
                                    console.log("OUTPUT", $scope.productWithIncludes.attributes());
                                    console.log("Status", $scope.productWithIncludes.attributes().status);

                                    $scope.occasionClient.Order.construct({ product: $scope.productWithIncludes })
                                        .then((order) => {
                                            console.log("Order created", order);

                                            console.log("Customer attr", order.customer().attributes());
                                        });
                                });
                        });

                });
            */
        }

        //Function takes in the first and last date of booking availability and 
        //generates an object array representing the dates that must be printed
        //in the calendar on the page
        $scope.buildCalendarObjectArray = function(startDate, endDate, callbackFromBuild){
            $scope.calendarObjectArray = [];
            $scope.allDates = [];

            let iterationMonth = null;
            let iterationYear = null;
            let monthCount = 0;
            let yearCount = 0;
            let monthNames = ["January", "February", "March", "April", "May", "June",
                                 "July", "August", "September", "October", "November", "December"
                                ];

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
                    $scope.allDates[yearCount].months.push( { month: new Date(currentDate).getMonth(), monthName: monthNames[new Date(currentDate).getMonth()], days: [] } );
                }else{
                    if(newYear){
                        $scope.allDates.push( { year: new Date(currentDate).getFullYear(), months: [] } );
                        yearCount++;
                        monthCount = 0;
                        if(newMonth){
                            $scope.allDates[yearCount].months.push( { month: new Date(currentDate).getMonth(), monthName: monthNames[new Date(currentDate).getMonth()], days: [] } )
                        }
                    }else{
                        if(newMonth){
                            $scope.allDates[yearCount].months.push( { month: new Date(currentDate).getMonth(), monthName: monthNames[new Date(currentDate).getMonth()], days: [] } )
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
            //Create paginated weeks inside the allDates array
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

        //Returns a collection of a given length
        //For use in the calendar in ng-repeat
        $scope.returnRange = function(n) {
            var range = [];
            for(var i = 0; i < n; i++){
                range.push(i);
            }
            return range;
        };

        //Evaluates what classes should be applied to the date to distinguish availability
        $scope.getDisplayClasses = function(passDay){
            let day = passDay.thisDay;
            let dayOfWeek = day.dayOfWeek;
            let classString = 'available-time-slot';

            //Set weekends to be unavailable
            if( dayOfWeek == '0' || dayOfWeek == '6' ){
                classString = "unavailable-day";
            }

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
            let clickable = true;

            //Set weekends to be unavailable
            if( dayOfWeek == '0' || dayOfWeek == '6' ){
                clickable = false;
            }

            //Set days before today as unavailable
            if( new Date(day.stringDate) < new Date() ){
                clickable = false;
            }

            //Return the clickable status
            return clickable;
        }

        //Scroll to specified anchor tag
        $scope.scrollToAnchor = function(aid){
            var aTag = $("a[name='"+ aid +"']");
            $('html,body').animate({scrollTop: aTag.offset().top},'slow');
        }

        //Format date to be legible and friendly
        $scope.formatDate = function(date) {
            var monthNames = [
                "January", "February", "March",
                "April", "May", "June", "July",
                "August", "September", "October",
                "November", "December"
            ];

            var date = new Date(date);
            var day = date.getDate();
            var monthIndex = date.getMonth();
            var year = date.getFullYear();

            return monthNames[monthIndex] + ' ' + day + ' ' + year;
        }

        //When a user clicks get started
        $scope.getStarted = function(){
            $(".pane-calendar").fadeIn();
            $scope.scrollToAnchor('step-1-scroller');
            $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
            $("#booking-process-status .booking-step-2").addClass("booking-step-active");
        }

        //When date is selected from calendar
        $scope.onDateSelection = function(event, passDay){
            let day = passDay.thisDay;
            if( $scope.getClickableStatus(passDay) ){
                if( $scope.selectedDateElement != null ){
                    $scope.selectedDateElement.className = "available-time-slot";
                }

                $scope.selectedDate = day;
                $scope.selectedDateElement = event.currentTarget;

                $scope.selectedDateElement.className += " selected-date";

                $('.available-times').fadeIn();
                $scope.scrollToAnchor('time-slot-scroll');
                $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
                $("#booking-process-status .booking-step-2").addClass("booking-step-active");
                $("#booking-process-status .booking-step-2").addClass("booking-step-complete").removeClass("booking-step-active");
                $("#booking-process-status .booking-step-3").addClass("booking-step-active");
            }
        }

        //When time slot is selected
        $scope.onTimeSlotSelection = function(event, passTime){
            event.preventDefault();

            let time = passTime;

            $scope.selectedTimeSlot = time;
            $scope.selectedTimeSlotElement = event.currentTarget;

            $(".time-slot-buttons button").removeClass("time-slot-active");
            $scope.selectedTimeSlotElement.className += " time-slot-active";

            $('.pane-customer-information').addClass("step-visible");

            $scope.scrollToAnchor('customer-info-pane-scroller');

            $("#booking-process-status .booking-step-3").addClass("booking-step-complete").removeClass("booking-step-active");
            $("#booking-process-status .booking-step-4").addClass("booking-step-active");
        }

    });

}
