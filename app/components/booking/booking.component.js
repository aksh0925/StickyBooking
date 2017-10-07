//Function to be called when dependencies are loaded and the angular application may begin running
let initializeBookingComponent = function(){
    
    //Creating bookingPage component on StickyBooking Module
    angular.module('StickyBooking')
        .component('bookingPage', {
            templateUrl: '/app/components/booking/booking.component.html',
            controller: function($scope, $http, occasionSDKService) {

            //Runs On Init
            this.$onInit = function(){
                //Call function to load data from SDK Service
                $scope.initialDataLoaded = false;
                $scope.staticProductID = 'ahtdt9cutawrxuwieabgyq';
                $scope.loadSDKData();
            }

            $scope.loadSDKData = function(){
                $scope.merchant = null;
                $scope.product = null;
                $scope.timeSlots = null;

                //Initiate several promises at once, wait for all of them to respond before continuing
                Promise.all([
                    occasionSDKService.getMyMerchant(),
                    occasionSDKService.getProductById($scope.staticProductID),
                    occasionSDKService.getProductById($scope.staticProductID)
                        .then( (product) => occasionSDKService.getTimeSlotsForProduct(product) ),
                    occasionSDKService.getProductById($scope.staticProductID)
                        .then( (product) => occasionSDKService.createOrderForProduct(product) )
                ]).then( (values) => {
                    console.log("Promise.All Finished", values);

                    //Populate global variables with returns from promises above
                    $scope.merchant = values[0];
                    $scope.product = values[1];
                    $scope.timeSlots = values[2];
                    $scope.order = values[3];

                    $scope.order.answers().target().map( (answer) => {
                        console.log("Question", answer.question());
                        console.log("Attr", answer.question().attributes());
                        console.log("Options", answer.question().options());
                        console.log("Options Target", answer.question().options().target());
                    });
                    
                    //Find all possible durations
                    $scope.durations = [];
                    $scope.timeSlots.map( (timeSlot) => {
                        if($scope.durations.indexOf(timeSlot.attributes().duration) == -1){
                            $scope.durations.push(timeSlot.attributes().duration);
                        }
                    });

                    //Manually refresh DOM
                    $scope.initialDataLoaded = true;
                    $scope.$apply();

                    //Pass data to child components and initiate their processing
                    $scope.$broadcast('initialDataLoaded', {
                        merchant: $scope.merchant,
                        product: $scope.product,
                        timeSlots: $scope.timeSlots,
                        durations: $scope.durations
                    });
                }).catch( (error) => console.log(error) );
            }

            //When a user clicks get started
            $scope.getStarted = function(){
                $(".pane-calendar").fadeIn();
                $scope.scrollToAnchor('step-1-scroller');
                $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
                $("#booking-process-status .booking-step-2").addClass("booking-step-active");
            }

            //When date is selected from calendar
            $scope.$on('dateSelectedEvent', function(event, data){
                $scope.friendlyDate = data.friendlyDate;
                $scope.selectedDate = data.selectedDate;
                $scope.selectedDateElement = data.selectedDateElement;

                $scope.availableSlots = [];
                $scope.timeSlots.map( (timeSlot) => {
                    if( $scope.sameDay( new Date(timeSlot.startsAt), new Date($scope.selectedDate.stringDate) )){
                        $scope.availableSlots.push(timeSlot);
                    }
                });
                $scope.availableSlots.sort(function(a,b){
                    return new Date(b.startsAt) - new Date(a.startsAt);
                });
                $scope.availableSlots.reverse();
            });

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

            //When users submits order form
            $scope.submitOrder = function() {
                $scope.order.timeSlots().target().push($scope.selectedTimeSlot);
                console.log($scope.order);
            }

            //Scroll to specified anchor tag
            $scope.scrollToAnchor = function(aid){
                var aTag = $("a[name='"+ aid +"']");
                $('html, body').animate( { scrollTop: aTag.offset().top }, 'slow');
            }

            //Check to see if two dates are on the same day
            $scope.sameDay = function(d1, d2) {
                return d1.getFullYear() === d2.getFullYear() &&
                        d1.getMonth() === d2.getMonth() &&
                        d1.getDate() === d2.getDate();
            }

            //Return a readble time portion of a date
            $scope.formatToTime = function(dateString){
                let date = new Date(dateString);

                let hours = date.getHours();
                let minutes = date.getMinutes() < 10 ? '0' + date.getMinutes().toString() : date.getMinutes().toString;
                let meridian = hours <= 10 ? 'am' : 'pm';
                hours = hours <= 12 ? hours : hours - 12;

                return hours.toString() + ':' + minutes + meridian;
            }

            //Determine which time of day section this timeSlot belongs in
            $scope.splitByTimeOfDay = function(date, time) {
                switch(time){
                    case('morning'):
                        return new Date(date).getHours() < 12;
                        break;
                    case('afternoon'):
                        return new Date(date).getHours() >= 12 && new Date(date).getHours() < 18;
                        break;
                    case('evening'):
                        return new Date(date).getHours() >= 18;
                        break;
                }
            }

            $scope.returnAsArray = function(unmapped) {
                let items = [];
                if($scope.initialDataLoaded){
                    unmapped
                        .map( (item) => {
                            items.push(item);
                        });
                }
                return items;
            }

        }  //End Controller

    }); //End Component

}  //End Initialize Function
