let initializeAngular = function(){

    //Added function to Date object to allow adjusting a date by a number of date part units
    Date.prototype.adjust = function(part, amount){
        part = part.toLowerCase();
        
        var map = { 
                    years: 'FullYear', months: 'Month', weeks: 'Hours', days: 'Hours', hours: 'Hours', 
                    minutes: 'Minutes', seconds: 'Seconds', milliseconds: 'Milliseconds',
                    utcyears: 'UTCFullYear', utcmonths: 'UTCMonth', weeks: 'UTCHours', utcdays: 'UTCHours', 
                    utchours: 'UTCHours', utcminutes: 'UTCMinutes', utcseconds: 'UTCSeconds', utcmilliseconds: 'UTCMilliseconds'
                },
            mapPart = map[part];

        if(part == 'weeks' || part == 'utcweeks')
            amount *= 168;
        if(part == 'days' || part == 'utcdays')
            amount *= 24;
        
        this['set'+ mapPart]( this['get'+ mapPart]() + amount );

        return this;
    }
    
    //Added function to Date object to allow iterating between two dates
    Date.prototype.each = function(endDate, part, step, fn, bind){
        let fromDate = new Date(this.getTime());
        let toDate = new Date(endDate.getTime());
        let pm = fromDate <= toDate? 1:-1;
        let i = 0;
        
        while( (pm === 1 && fromDate <= toDate) || (pm === -1 && fromDate >= toDate) ){
            if(fn.call(bind, fromDate, i, this) === false) break;
            i += step;
            fromDate.adjust(part, step*pm);
        }

        return this;
    }

    //Create angular module attached to the element with attribute ng-app = StickyBooking
    let app = angular.module('StickyBooking', []);

    //Create angular controller attached to the element with attribute ng-controller = BookingController
    app.controller('BookingController', function($scope, $http) {

        //OnInit
        this.$onInit = function(){
            //Create Connection to Occasion SDK
            $scope.occasionClient = new Occasion.Client('463436b5ebf74b42873aaa544801f91a');

            //Create element references
            $scope.paneTimeSlots = document.getElementsByClassName("available-times");
            $scope.paneCustomerInformation = document.getElementsByClassName("pane-customer-information");

            //Hide certain panes
            $scope.paneTimeSlots[0].style.display = 'none';
            $scope.paneCustomerInformation[0].style.display = 'none';


            //Find the first and last booking dates available
            let startDate = new Date('October 1 2017');
            let endDate = new Date('December 10 2018');

            //Set starting month and year for the calendar to display
            $scope.activeCalendarMonth = new Date().getMonth();
            $scope.activeCalendarYear = new Date().getFullYear();

            //Set max and min range for the calendar in terms of month and year
            $scope.minCalendarMonth = startDate.getMonth();
            $scope.minCalendarYear = startDate.getFullYear();
            $scope.maxCalendarMonth = endDate.getMonth();
            $scope.maxCalendarYear = endDate.getFullYear();

            //Build calendar object array based on the first and last day of booking availability
            $scope.buildCalendarObjectArray(startDate, endDate, function(){
                console.log("allDates Array Configured", $scope.allDates);
            });
            
            /*$scope.occasionClient.Merchant.first()
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

                });*/
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
            if($scope.activeCalendarMonth < 11){
                if( (($scope.activeCalendarMonth + 1) <= $scope.maxCalendarMonth) && ($scope.activeCalendarYear <= $scope.maxCalendarYear) ){
                    $scope.activeCalendarMonth++;
                }else{
                    console.log("out of bounds forward case 1");
                }
            }else{
                if( (0 <= $scope.maxCalendarMonth) && (($scope.activeCalendarYear + 1) <= $scope.maxCalendarYear) ){
                    $scope.activeCalendarMonth = 0;
                    $scope.activeCalendarYear++;
                }else{
                    console.log("out of bounds forward case 2");
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
                    }else if( ($scope.activeCalendarMonth - 1) < $scope.minCalendarMonth ){
                        console.log("out of bounds backward case 1");
                    }
                }
            }else if( $scope.activeCalendarMonth == 0 ){
                if( (11 >= $scope.minCalendarMonth) && ( ($scope.activeCalendarYear - 1) >= $scope.minCalendarYear) ){
                    $scope.activeCalendarMonth = 11;
                    $scope.activeCalendarYear--;
                }else{
                    console.log("out of bounds backward case 2");
                }
            }
        }

        //Returns a collection of a given length
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

            return classString;
        }

        //Evaluates if the date should be clickable
        $scope.getClickableStatus = function(passDay){
            let day = passDay.thisDay;
            let dayOfWeek = day.dayOfWeek;
            let clickable = null;

            //Set weekends to be unavailable
            if( dayOfWeek == '0' || dayOfWeek == '6' ){
                clickable = false;
            }else{
                clickable = true;
            }

            //Set days before today as unavailable
            if( new Date(day.stringDate) >= new Date() ){
                clickable = true;
            }else{
                clickable = false;
            }

            //Return the clickable status
            return clickable;
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

    });

}
