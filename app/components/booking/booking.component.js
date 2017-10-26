//Function to be called when dependencies are loaded and the angular application may begin running
let initializeBookingComponent = function(){
    
    //Creating bookingPage component on StickyBooking Module
    angular.module('StickyBooking')
        .component('bookingPage', {
            controller: BookingController,
            templateUrl: '/app/components/booking/booking.component.html',
    }); //End Component


    //Creating Controller Function Separately
    function BookingController($scope, $http, occasionSDKService) {

        //Runs On Init
        this.$onInit = function(){
            //Call function to load data from SDK Service
            $scope.displayLoading = true;
            $scope.initialDataLoaded = false;
            $scope.calendarDataLoaded = false;
            $scope.orderLoaded = false;
            $scope.staticProductID = window.OCCSN.product_id;
            $scope.loadSDKData();
        }

        //Make initial calls for data and subsequent eager loaded calls
        $scope.loadSDKData = function(){
            $scope.merchant = null;
            $scope.product = null;

            //Initiate several promises at once, wait for all of them to respond before continuing
            Promise.all([
                occasionSDKService.getMyMerchant(),
                occasionSDKService.getProductById($scope.staticProductID)
            ]).then( (values) => {
                console.log("Promise.All Finished", values);

                //Populate global variables with returns from promises above
                $scope.merchant = values[0];
                $scope.product = values[1];

                $scope.psp = $scope.merchant.pspName;
                console.log("PSP:", $scope.psp);

                //Manually refresh DOM
                $scope.$emit('initialDataLoaded', { product: $scope.product } );
                $scope.initialDataLoaded = true;
                $scope.displayLoading = false;
                $scope.$apply();

                //Eager load calendar data
                console.log("Calendar data loading");
                occasionSDKService.getTimeSlotsForProduct($scope.product)
                    .then( (timeSlots) => {
                        $scope.timeSlots = timeSlots;

                        occasionSDKService.getTimeSlotsByMonth( $scope.timeSlots, new Date($scope.timeSlots.__collection[0].startsAt).getMonth() )
                            .then( (timeSlotsByMonth) => {
                                $scope.timeSlots = timeSlotsByMonth;

                                //Find all possible durations
                                $scope.durations = [];
                                $scope.timeSlots.map( (timeSlot) => {
                                    if($scope.durations.indexOf(timeSlot.attributes().duration) == -1){
                                        $scope.durations.push(timeSlot.attributes().duration);
                                    }
                                });

                                //Manually refresh DOM
                                console.log("Calendar data loaded");
                                $scope.calendarDataLoaded = true;
                                $scope.$apply();

                                //Pass data to child components and initiate their processing
                                $scope.$broadcast('timeSlotDataLoaded', {
                                    merchant: $scope.merchant,
                                    product: $scope.product,
                                    timeSlots: $scope.timeSlots,
                                    durations: $scope.durations
                                });
                            })
                            .catch( (error) => console.log(error) );
                    });

                //Eager load Order resource
                console.log("Order data loading");
                occasionSDKService.createOrderForProduct($scope.product)
                    .then( (order) => {
                        console.log("Order data loaded");
                        $scope.order = order;
                        $scope.orderLoaded = true;
                    });

            }).catch( (error) => console.log(error) );
        }

        //When a user clicks get started
        $scope.getStarted = function(){
            if($scope.calendarDataLoaded){
                //Scroll Calendar into view
                $(".pane-calendar").fadeIn();
                $scope.scrollToAnchor('step-1-scroller');
                $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
                $("#booking-process-status .booking-step-2").addClass("booking-step-active");
            }else{
                $scope.displayLoading = true;
                $scope.$watch('calendarDataLoaded', function(newValue, oldValue, scope){
                    if(newValue == true){
                        $scope.displayLoading = false;
                        //Scroll Calendar into view
                        $(".pane-calendar").fadeIn();
                        $scope.scrollToAnchor('step-1-scroller');
                        $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
                        $("#booking-process-status .booking-step-2").addClass("booking-step-active");
                    }
                });
            }
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

        //When new time slots are loaded
        $scope.$on('timeSlotsUpdated', function(event, data){
            $scope.timeSlots = data.timeSlots;
            $scope.displayLoading = false;
            $scope.$apply();
        });

        //When loading animation is started from sub component
        $scope.$on("startLoading", function(event){
            $scope.displayLoading = true;
        });

        //When loading animation is stopped from sub component
        $scope.$on("stopLoading", function(event){
            $scope.displayLoading = false;
        });

        //When time slot is selected
        $scope.onTimeSlotSelection = function(event, passTime){
            event.preventDefault();
            let time = passTime;
            $scope.selectedTimeSlot = time;
            $scope.selectedTimeSlotElement = event.currentTarget;
            $(".time-slot-buttons button").removeClass("time-slot-active");
            $scope.selectedTimeSlotElement.className += " time-slot-active";

            $scope.order.timeSlots().target().push($scope.selectedTimeSlot);

            if($scope.orderLoaded){
                $scope.startOrder();
            }else{
                $scope.displayLoading = true;
                $scope.$watch('orderLoaded', function(newValue, oldValue, scope){
                    if(newValue){
                        $scope.displayLoading = false;
                        $scope.startOrder();
                    }
                });
            }
        }

        //When Order and Answers must be configured
        $scope.startOrder = function(){
            $scope.optionsHolder = {};
            
            //Set default values
            $scope.order.answers().target().map( (answer) => {
                
                var formControl = answer.question().formControl;
                var optionCount = 0;
                var firstOption = null;
                var defaultFound = false;
                answer.question().options().target().map( (option) => {

                    if(optionCount == 0){
                        firstOption = option;
                    }
                    
                    if(formControl == 'drop_down' || formControl == 'option_list'){
                        if(option.default){
                            if(formControl == 'drop_down')
                                $scope.optionsHolder[answer.question().id] = option.id;
                            if(formControl == 'option_list')
                                $scope.optionsHolder[answer.question().id] = option.title;
                            defaultFound = true;
                            answer.assignOption(option);
                        }
                    }

                    optionCount++;
                });

                if( (formControl == 'drop_down' || formControl == 'option_list') && !defaultFound){
                    if(formControl == 'drop_down')
                        $scope.optionsHolder[answer.question().id] = firstOption.id;
                    if(formControl == 'option_list')
                        $scope.optionsHolder[answer.question().id] = firstOption.title;
                    answer.assignOption(firstOption);
                }

                if(formControl == 'checkbox'){
                    answer.value = false;
                }
            });

            //Scroll into customer info pane and hide the animation spinner
            $('.pane-customer-information').addClass("step-visible");
            $("#booking-process-status .booking-step-3").addClass("booking-step-complete").removeClass("booking-step-active");
            $("#booking-process-status .booking-step-4").addClass("booking-step-active");
            $scope.scrollToAnchor('customer-info-pane-scroller');

            //Calculate starting price
            $scope.order.calculatePrice()
                .then( (order) => {
                    console.log("Order after first calc", $scope.order.attributes());
                    $scope.$apply();
                });
        }

        //When the value of a radio selector changes
        $scope.radioChanged = function(answer, option){
            $scope.order.answers().target().map( (answerAtI) => {
                if(answerAtI.questionId == answer.questionId){
                    answerAtI.assignOption(option);
                    $scope.questionValueChanged(answer);
                }
            });
        }

        //When the value of a drop down selector changes
        $scope.selectChanged = function(answer){
            $scope.order.answers().target().map( (answerAtI) => {
                if(answerAtI.questionId == answer.questionId){
                    answerAtI.question().options().target().map( (option) => {
                        if($scope.optionsHolder[answer.questionId] == option.id){
                            answerAtI.assignOption(option);
                            $scope.questionValueChanged(answer);
                        }
                    });
                }
            });
        }

        //When a question value changes
        $scope.questionValueChanged = function(answer){
            if(answer.question().priceCalculating){
                $scope.order.calculatePrice()
                    .then( (order) => {
                        console.log("Order after calc", $scope.order.attributes());
                        $scope.$apply();
                    });
            }
        }

        //Submit credit card data to Spreedly
        $scope.submitCardData = function(){
            if($scope.psp == 'cash'){
                $scope.submitOrder();
            }

            if($scope.psp == 'spreedly'){
                var url = "https://core.spreedly.com/v1/payment_methods.json?environment_key=CYJy65Wq5dmc2dGFVQOp6eci1Ka";

                //Test purchase details
                $scope.order.customer().firstName = "Joe";
                $scope.order.customer().lastName = "Jones";
                $scope.order.customer().email = "joey@example.com";
                $scope.card = {
                    number: '4111111111111111',
                    month: '3',
                    year: '2032',
                    verification: '423'
                }

                var card = {
                    "payment_method":{
                        "credit_card":{
                            "first_name": $scope.order.customer().firstName,
                            "last_name": $scope.order.customer().lastName,
                            "number": $scope.card.number,
                            "verification_value": $scope.card.verification,
                            "month": $scope.card.month,
                            "year": $scope.card.year,
                            "email": $scope.order.customer().email
                        },
                        "data":{
                            "zip_code": $scope.order.customer().zip
                        }
                    }
                } 

                $http.post(url, card)
                    .then( (data) => {
                        $scope.cardToken = data.data;
                        console.log("Card Token", $scope.cardToken);
                        console.log("Token", $scope.cardToken.transaction.payment_method.token);

                        var creditCard = occasionSDKService.buildCard($scope.cardToken.transaction.payment_method.token);

                        console.log("Credit Card", creditCard);

                        console.log("outstanding before charge", $scope.order.outstandingBalance);

                        $scope.order.charge( creditCard, $scope.order.outstandingBalance );

                        console.log("outstanding after charge", $scope.order.outstandingBalance);
                        $scope.submitOrder();
                      
                    })
                    .catch( (error) => {
                        console.log("Fail", error);
                        return alert("There was an error processing your credit card information. Please try again.");
                    });
            }

            if($scope.psp == 'square'){

            }
        }

        //When users submits order form
        $scope.submitOrder = function() {
            console.log("Order Submit", $scope.order);

            $scope.order.save( () => {
                if($scope.order.persisted()){
                    console.log("Order save was success");
                    alert($scope.product.postTransactionalMessage);
                }else{
                    console.log("Order save was not success");
                    console.log($scope.order.errors().toArray());
                }
            });
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

        //Return an object collection as an array
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

    } //End Controller

}  //End Initialize Function
