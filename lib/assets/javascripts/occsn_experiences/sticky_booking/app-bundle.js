webpackJsonp([0],{

/***/ 116:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(117);


/***/ }),

/***/ 117:
/***/ (function(module, exports, __webpack_require__) {

var angular = __webpack_require__(3);
__webpack_require__(118);

var ActiveResource = __webpack_require__(6);

ActiveResource.Interfaces.JsonApi.contentType = 'application/json';

angular.module('StickyBooking', [])
  .controller('AppController', function($scope){

    //Runs On Init
    this.$onInit = function(){
      console.log("App Module Init");
    }

    $scope.$on('initialDataLoaded', function(event, data){
      document.title = data.product.title;
    });

  });

__webpack_require__(119);
__webpack_require__(121);
__webpack_require__(123);

/***/ }),

/***/ 118:
/***/ (function(module, exports) {


//Added function to Date object to allow adjusting a date by a number of date part units
Date.prototype.adjust = function(part, amount){
    part = part.toLowerCase();
    
    var map = { 
                years: 'FullYear', months: 'Month', weeks: 'Hours', days: 'Hours', hours: 'Hours', 
                minutes: 'Minutes', seconds: 'Seconds', milliseconds: 'Milliseconds',
                utcyears: 'UTCFullYear', utcmonths: 'UTCMonth', weeks: 'UTCHours', utcdays: 'UTCHours', 
                utchours: 'UTCHours', utcminutes: 'UTCMinutes', utcseconds: 'UTCSeconds', utcmilliseconds: 'UTCMilliseconds'
            };
    var mapPart = map[part];

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

//Format date to be legible and friendly
Date.prototype.formatDate = function(){
    var date = this;
    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return this.getMonthName() + ' ' + day + ', ' + year;
}

//Return the full name of the month
Date.prototype.getMonthName = function(){
    let monthNames = [
        "January", "February", "March", 
        "April", "May", "June", "July", 
        "August", "September", "October", 
        "November", "December"
    ];

    return monthNames[ this.getMonth() ];
}

/***/ }),

/***/ 119:
/***/ (function(module, exports, __webpack_require__) {

var angular = __webpack_require__(3);
var templateUrl = __webpack_require__(120);

//Creating bookingPage component on StickyBooking Module
angular.module('StickyBooking')
    .component('bookingPage', {
        templateUrl: templateUrl,
        controller: function BookingController($scope, $http, occasionSDKService) {

          //Runs On Init
          this.$onInit = function(){
            console.log("Booking Component Init");
            //Call function to load data from SDK Service
            $scope.displayLoading = true;
            $scope.initialDataLoaded = false;
            $scope.calendarDataLoaded = false;
            $scope.orderLoaded = false;
            $scope.staticProductID = window.OCCSN.product_id;
            //Test purchase details
            $scope.card = {
              number: null,
              month: null,
              year: null,
              verification: null
            }
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

            if($scope.psp == "spreedly"){
              console.log("Use Spreedly");
              $scope.useSpreedly();
            }

            if($scope.psp == "square"){
              console.log("Use Square");
              $scope.useSquare();
            }
          })
          .catch( (error) => {
              console.log("Error from calc start price", error);
          });
          }

          $scope.useSquare = function() {
            // Set the application ID
            //var applicationId = "sandbox-sq0idp-uLNY74KK3HbAKyORsoR3_g"; //Marc's Sandbox Key
            var applicationId = "sq0idp-kKdgouNdlT2lj08V0tSJ3g"; //OCCASION's Key

            // Set the location ID
            var locationId = "CBASEPCUENvvoTglXMqmVTIUaUwgAQ";

            // Create and initialize a payment form object
            $scope.paymentForm = new SqPaymentForm({

              // Initialize the payment form elements
              applicationId: applicationId,
              locationId: locationId,
              inputClass: 'form-control',

              applePay: false,
              masterpass: false,

              // Customize the CSS for SqPaymentForm iframe elements
              inputStyles: [{
                fontSize: '19px'
              }],

              // Initialize Apple Pay placeholder ID
              applePay: {
                elementId: 'sq-apple-pay'
              },

              // Initialize Masterpass placeholder ID
              masterpass: {
                elementId: 'sq-masterpass'
              },

              // Initialize the credit card placeholders
              cardNumber: {
                elementId: 'sq-card-number',
                placeholder: '•••• •••• •••• ••••'
              },
              cvv: {
                elementId: 'sq-cvv',
                placeholder: 'CVV'
              },
              expirationDate: {
                elementId: 'sq-expiration-date',
                placeholder: 'MM/YY'
              },
              postalCode: {
                elementId: 'sq-postal-code',
                placeholder: '#####'
              },

              // SqPaymentForm callback functions
              callbacks: {
                methodsSupported: function (methods) {
                  var applePayBtn = document.getElementById('sq-apple-pay');
                  var applePayLabel = document.getElementById('sq-apple-pay-label');
                  var masterpassBtn = document.getElementById('sq-masterpass');
                  var masterpassLabel = document.getElementById('sq-masterpass-label');

                  applePayBtn.style.display = 'none';
                  applePayLabel.style.display = 'none';
                  masterpassBtn.style.display = 'none';
                  masterpassLabel.style.display = 'none';
                  // Only show the button if Apple Pay for Web is enabled
                  // Otherwise, display the wallet not enabled message.
                  /*if (methods.applePay === true) {
                      applePayBtn.style.display = 'inline-block';
                      applePayLabel.style.display = 'none' ;
                  }
                  // Only show the button if Masterpass is enabled
                  // Otherwise, display the wallet not enabled message.
                  if (methods.masterpass === true) {
                      masterpassBtn.style.display = 'inline-block';
                      masterpassLabel.style.display = 'none';
                  }*/
                },
                createPaymentRequest: function () {
                  var paymentRequestJson ;
                  return paymentRequestJson ;
                },
                cardNonceResponseReceived: function(errors, nonce, cardData) {
                  if (errors) {
                    console.log("Encountered errors:");
                    errors.forEach(function(error) {
                      console.log('  ' + error.message);
                    });
                  }else{
                    console.log('Nonce received: ', nonce);

                    var creditCard = occasionSDKService.buildCard({ id: nonce});

                    console.log("Credit Card", creditCard);

                    $scope.order.charge( creditCard, $scope.order.outstandingBalance );

                    $scope.order.calculatePrice()
                    .then( (order) => {
                      $scope.submitOrder();
                  })
                  .catch( (error) => {
                      console.log("Errors with final calc price", error);
                  });
                  }
                },
                unsupportedBrowserDetected: function() {},
                inputEventReceived: function(inputEvent) {
                  switch (inputEvent.eventType) {
                    case 'focusClassAdded':
                      /* HANDLE AS DESIRED */
                      break;
                    case 'focusClassRemoved':
                      /* HANDLE AS DESIRED */
                      break;
                    case 'errorClassAdded':
                      /* HANDLE AS DESIRED */
                      break;
                    case 'errorClassRemoved':
                      /* HANDLE AS DESIRED */
                      break;
                    case 'cardBrandChanged':
                      /* HANDLE AS DESIRED */
                      break;
                    case 'postalCodeChanged':
                      /* HANDLE AS DESIRED */
                      break;
                  }
                },
                paymentFormLoaded: function() {
                  console.log("Form loaded");
                }
              }
            });
            $scope.paymentForm.build();
          }

          $scope.requestCardNonce = function(event) {
            event.preventDefault();
            $scope.paymentForm.requestCardNonce();
          }

          $scope.useSpreedly = function(){
            //Init Spreedly card values
            Spreedly.init("UnQhm0g7l3nOIz2hmAoV3eqm26k", {
              "numberEl": "spreedly-number",
              "cvvEl": "spreedly-cvv"
            });

            Spreedly.on("ready", function () {
              var submitButton = document.getElementById('submit-button');
              submitButton.disabled = false;
              Spreedly.setFieldType("number", "text");
              Spreedly.setNumberFormat("prettyFormat");
              Spreedly.setPlaceholder("number", "Card Number");
              Spreedly.setPlaceholder("cvv", "CVV");
              Spreedly.setStyle("number", 'display: block; width: 95%; height: 36px; padding: 6px 12px; font-size: 16px; line-height: 1.428571429; color: #7b829a; background-color: #fff; background-image: none; border: 1px solid #ccc; -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075); box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075); -webkit-transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s; -o-transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s; transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s;');
              Spreedly.setStyle("cvv", 'display: block; width: 60px; height: 36px; padding: 6px 12px; font-size: 16px; line-height: 1.428571429; color: #7b829a; background-color: #fff; background-image: none; border: 1px solid #ccc; -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075); box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075); -webkit-transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s; -o-transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s; transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s;');
            });

            Spreedly.on('fieldEvent', function(name, type, activeEl, inputProperties) {
              if(type == 'focus'){
                Spreedly.setStyle(name,'border-color: #66afe9; outline: 0; -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(102, 175, 233, 0.6); box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(102, 175, 233, 0.6)');
              }
              if(type == 'blur'){
                Spreedly.setStyle(name, 'border: 1px solid #ccc; -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075); box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075); -webkit-transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s; -o-transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s; transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s;');
              }
            });

            Spreedly.on('errors', function(errors) {
              for (var i=0; i < errors.length; i++) {
                var error = errors[i];
                console.log(error);
              };
            });

            Spreedly.on('paymentMethod', function(token, pmData) {
              console.log("Card Token", token);
              console.log("pmData", pmData);

              var creditCard = occasionSDKService.buildCard(token);

              console.log("Credit Card", creditCard);

              console.log("outstanding before charge", $scope.order.outstandingBalance);

              $scope.order.charge( creditCard, $scope.order.outstandingBalance );

              console.log("outstanding after charge but before calc price", $scope.order.outstandingBalance);

              $scope.order.calculatePrice()
              .then( (order) => {
                console.log("Order attributes after charge", $scope.order.attributes());
              console.log("Order outstanding after charge", $scope.order.outstandingBalance)
              $scope.submitOrder();
            })
            .catch( (error) => {
                console.log("Errors with final calc price", error);
            });
            });
          }

          $scope.submitPaymentForm = function(){
            console.log("Submit payment form");
            var requiredFields = {};

            // Get required, non-sensitive, values from host page
            requiredFields["full_name"] = document.getElementById("full_name").value;
            requiredFields["month"] = document.getElementById("month").value;
            requiredFields["year"] = document.getElementById("year").value;

            Spreedly.tokenizeCreditCard(requiredFields);
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
            })
            .catch( (error) => {
                console.log("Error with recalc", error);
            });
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
      ,
}); //End Component

/***/ }),

/***/ 120:
/***/ (function(module, exports) {

var path = '/Users/nicklandgrebe/dev/StickyBooking/src/components/booking/booking.component.html';
var html = "<main class=\"booking-page-container\">\n\n    <div class=\"loadingAnimation\" ng-if=\"displayLoading\">\n        <img src=\"xxxHTMLLINKxxx0.076966168588111340.5189186618431672xxx\" />\n    </div>\n\n    <div class=\"booking-sidebar\">\n        <h3 class=\"booking-page-photographer-name animated slideInLeft\" ng-if=\"initialDataLoaded\">{{ merchant.name }}</h3>\n        <div class=\"booking-page-welcome-message animated slideInLeft\" ng-if=\"initialDataLoaded\">\n            <p>Welcome to the online booking tool. This platform will allow you to schedule, book, &amp; pay for your session.</p>\n        </div>\n        <ol class=\"booking-process animated slideInLeft\" id=\"booking-process-status\" ng-if=\"initialDataLoaded\">\n            <li class=\"booking-step-1 booking-step\">Get Started</li>\n            <li class=\"booking-step-2 booking-step\">Select a Date</li>\n            <li class=\"booking-step-3 booking-step\">Select a Time</li>\n            <li class=\"booking-step-4 booking-step\">Your Information</li>\n        </ol>\n    </div>\n\n    <div class=\"booking-content\">\n    \n        <!--Get Started section -->\n        <div class=\"booking-page-hero\" style=\"background-image: url('{{ product.image.url }}');\">\n            <div class=\"booking-page-hero-content animated slideInRight\" ng-if=\"initialDataLoaded\">\n                <h6 class=\"get-started-title\">Get Started</h6>\n                <h1 class=\"page-title\">{{ product.title }}</h1>\n                <!--<h6 class=\"session-length\" ng-if=\"durations.length == 1\">Session Length: {{ durations[0] }} minutes</h6>\n                <h6 class=\"session-length\" ng-if=\"durations.length > 1\">Session Lengths: {{ document.write(durations.join(\", \")) }} minutes</h6>-->\n                <button class=\"get-started animated tada infinite\" ng-click=\"getStarted()\">{{ product.orderButtonText }}</button>\n            </div>\n        </div>\n\n        <!-- Calendar pane -->\n        <a name=\"step-1-scroller\"></a>\n        <div class=\"pane-calendar\" id=\"step-2\" style=\"display:none;\">\n            <div class=\"row\">\n                <div class=\"col-md-6\">\n                    <h6>Availability</h6>\n                    <h3>Select a date on the calendar below to view availability:</h3>\n                </div>\n                <!--<div class=\"col-md-6\">\n                    <div class=\"session-duration text-right\">\n                        <h4 class=\"duration-count\">{{ durations[0] }} minutes</h4>\n                        <h6>Session Duration</h6>\n                    </div>\n                </div>-->\n            </div>\n            <hr />\n            \n            <booking-calendar></booking-calendar>\n        </div>\n\n        <!-- available times-->\n        <a name=\"time-slot-scroll\"></a>\n        <div class=\"available-times\" style=\"display:none;\">\n            <div class=\"col-md-12\">\n                <h6>Available Time Slots</h6>\n                <h3>Select a time slot on {{ friendlyDate }} to continue booking:</h3>\n                <hr />\n            </div>\n            <div class=\"col-md-4 time-slot-buttons\">\n                <h6>Morning</h6>\n                <button class=\"btn btn-primary time-slot\" ng-repeat=\"(slotIndex, slotValue) in availableSlots\" ng-if=\"splitByTimeOfDay(slotValue.startsAt, 'morning')\" ng-click=\"onTimeSlotSelection($event, slotValue)\">{{ formatToTime(slotValue.startsAt) }}</button>\n            </div>\n            <div class=\"col-md-4 time-slot-buttons\">\n                <h6>Afternoon</h6>\n                <button class=\"btn btn-primary time-slot\" ng-repeat=\"(slotIndex, slotValue) in availableSlots\" ng-if=\"splitByTimeOfDay(slotValue.startsAt, 'afternoon')\" ng-click=\"onTimeSlotSelection($event, slotValue)\">{{ formatToTime(slotValue.startsAt) }}</button>\n            </div>\n            <div class=\"col-md-4 time-slot-buttons\">\n                <h6>Evening</h6>\n                <button class=\"btn btn-primary time-slot\" ng-repeat=\"(slotIndex, slotValue) in availableSlots\" ng-if=\"splitByTimeOfDay(slotValue.startsAt, 'evening')\" ng-click=\"onTimeSlotSelection($event, slotValue)\">{{ formatToTime(slotValue.startsAt) }}</button>\n            </div>\n        </div>\n\n        <!--Customer information pane -->\n        <a name=\"customer-info-pane-scroller\"></a>\n        <div class=\"pane-customer-information\" style=\"display:none;\" ng-if=\"orderLoaded\">\n            <h6>Your Info</h6>\n            <h3>We need to collect some information from you to confirm booking:</h3>\n            <hr />\n            <!-- Static Questions, Always Required -->\n            <div class=\"form-group\">\n                <label class=\"control-label\" for=\"order_customer_email\">First Name*</label>\n                <input id=\"lastName\" placeholder=\"First Name\" required=\"required\" type=\"text\" ng-model=\"order.customer().firstName\" name=\"firstName\" class=\"form-control\" autofocus><span class=\"message\"></span>\n            </div>\n            <div class=\"form-group\">\n                <label class=\"control-label\" for=\"order_customer_email\">Last Name*</label>\n                <input id=\"firstName\" placeholder=\"Last Name\" required=\"required\" type=\"text\" ng-model=\"order.customer().lastName\" name=\"lastName\" class=\"form-control\"><span class=\"message\"></span>\n            </div>\n            <div class=\"form-group\">\n                <label class=\"control-label\" for=\"order_customer_email\">Your E-mail Address*</label>\n                <input id=\"email\" placeholder=\"E-mail\" required=\"required\" type=\"email\" ng-model=\"order.customer().email\" name=\"email\" class=\"form-control\"><span class=\"message\"></span>\n            </div>\n            <div class=\"form-group\">\n                <label class=\"control-label\" for=\"order_customer_email\">Your Zip Code*</label>\n                <input id=\"zip\" placeholder=\"Zip Code\" required=\"required\" type=\"number\" ng-model=\"order.customer().zip\" name=\"zip\" class=\"form-control\"><span class=\"message\"></span>\n            </div>\n\n            <!-- Dynamic Questions, Set by Merchant -->\n            <div ng-repeat=\"(index, answer) in returnAsArray(order.answers().target())\">\n                <div class=\"form-group\" ng-if=\"answer.question().formControl != 'separator'\">\n                    <label ng-if=\"answer.question().formControl != 'checkbox' && answer.question().formControl != 'text_output' && answer.question().formControl != 'waiver'\">\n                        {{ answer.question().attributes().title }}<span ng-if='answer.question().required || answer.question().priceCalculating'>*</span>\n                    </label>\n                    <!-- Render different from control based on answer.question.formControl type -->\n                    <!-- Text Input -->\n                        <input class=\"form-control\" type=\"text\" ng-model=\"answer.value\" ng-if=\"answer.question().formControl == 'text_input'\" placeholder=\"{{ answer.question().attributes().title }}\" />\n                    <!-- Text Area -->\n                        <textarea class=\"form-control\" rows=\"4\" ng-model=\"answer.value\" ng-if=\"answer.question().formControl == 'text_area'\" placeholder=\"Your Response\"></textarea>\n                    <!-- Option List -->\n                        <div ng-if=\"answer.question().formControl == 'option_list'\">\n                            <label ng-repeat=\"option in returnAsArray(answer.question().options().target())\" class=\"clickable-label\">\n                                <input class=\"question-radio\" type=\"radio\" ng-value=\"option.title\" name=\"{{answer.question().id}}\" ng-model=\"optionsHolder[answer.question().id]\" ng-change=\"radioChanged(answer, option)\" /> {{option.title}} \n                            </label>\n                        </div>\n                    <!-- Drop Down -->\n                        <select class=\"form-control\" ng-if=\"answer.question().formControl == 'drop_down'\" ng-model=\"optionsHolder[answer.question().id]\" ng-change=\"selectChanged(answer)\">\n                            <option ng-repeat=\"(optionIndex, option) in returnAsArray(answer.question().options().target())\" value=\"{{option.id}}\">{{option.title}}</option>\n                        </select>\n                    <!-- Checkbox -->\n                        <div ng-if=\"answer.question().formControl == 'checkbox'\" >\n                            <label class=\"clickable-label\">\n                                <input class=\"question-checkbox\" type=\"checkbox\" ng-model=\"answer.value\" ng-change=\"questionValueChanged(answer)\"/>{{ answer.question().attributes().title }}<span ng-if='answer.question().mustBeChecked'>*</span>\n                            </label>\n                        </div>\n                    <!-- Spin Button -->\n                        <ul class=\"spinner-input list-inline\" ng-if=\"answer.question().formControl == 'spin_button'\">\n                            <li>\n                                <input class=\"form-control value-input\" ng-model=\"answer.value\" readonly=\"\" type=\"text\" ng-init=\"answer.value = 1\">\n                            </li>\n                            <li>\n                                <div class=\"btn-group btn-group-lg\">\n                                    <button class=\"btn btn-info update-price stepper-minus\" ng-click=\"answer.value = answer.value - 1; questionValueChanged(answer)\" ng-disabled=\"answer.value === 1\" type=\"button\" disabled=\"disabled\">-</button>\n                                    <button class=\"btn btn-info update-price stepper-plus\" ng-click=\"answer.value = answer.value + 1; questionValueChanged(answer)\" ng-disabled=\"answer.value >= answer.question().max\" type=\"button\">+</button>\n                                </div>\n                            </li>\n                        </ul>\n                    <!-- Waiver -->\n                        <div ng-if=\"answer.question().formControl == 'waiver'\">\n                            <div class=\"well well-sm waiver\">{{ answer.question().waiverText }}</div>\n                            <label class=\"clickable-label\">\n                                <input class=\"question-checkbox\" type=\"checkbox\" ng-model=\"answer.value\" />{{ answer.question().attributes().title }}*\n                            </label>\n                        </div>\n                    <!-- Text Output -->\n                        <p ng-if=\"answer.question().formControl == 'text_output' && !answer.question().displayAsTitle\" class=\"question-text-output\">{{ answer.question().title }}</p>\n                        <h3 ng-if=\"answer.question().formControl == 'text_output' && answer.question().displayAsTitle\" class=\"question-text-output\">{{ answer.question().title }}</h3>\n                </div>\n                <hr ng-if=\"answer.question().formControl == 'separator'\">\n            </div>\n            <!-- End of Questions -->\n\n            <div class=\"alert alert-success priceTable\" ng-if=\"psp != 'cash'\">\n                <table>\n                    <tr>\n                        <td>Subtotal:</td>\n                        <td>{{ order.attributes().subtotal }}</td>\n                    </tr>\n                    <tr>\n                        <td>Tax:</td>\n                        <td>{{ order.attributes().tax }}</td>\n                    </tr>\n                    <tr style=\"border-top:2px solid #666\">\n                        <td><strong>Total:</strong></td>\n                        <td>{{ order.attributes().total }}</td>\n                    </tr>\n                </table>\n            </div>\n\n            \n            <div class=\"alert alert-warning priceTable\" ng-if=\"psp == 'cash'\">\n                <strong>No payment required now. Payment will be collected at the venue.</strong>\n                <br><br>\n                <table>\n                    <tr>\n                        <td>Subtotal:</td>\n                        <td>{{ order.attributes().subtotal }}</td>\n                    </tr>\n                    <tr>\n                        <td>Tax:</td>\n                        <td>{{ order.attributes().tax }}</td>\n                    </tr>\n                    <tr style=\"border-top:2px solid #666\">\n                        <td><strong>Total:</strong></td>\n                        <td>{{ order.attributes().total }}</td>\n                    </tr>\n                </table>\n\n                <div class=\"form-submit\">\n                    <a class=\"btn-primary btn animated pulse infinite\" ng-click=\"submitOrder()\">{{ product.orderButtonText }}</a>\n                </div>\n            </div>\n\n\n            <!-- Spreedly Checkout Form -->\n            <form id=\"payment-form\" class=\"ccForm\" ng-if=\"psp == 'cash'\">\n                <input type=\"hidden\"  name=\"payment_method_token\" id=\"payment_method_token\">\n\n                <div class=\"form-group\">\n                    <label class=\"control-label\" for=\"full_name\">Name On Card</label>\n                    <input type=\"text\" id=\"full_name\" name=\"full_name\" class=\"form-control\" placeholder=\"Name On Card\">\n                </div>\n\n                <div class=\"form-group\">\n                    <label class=\"control-label\">Credit Card Number</label>\n                    <div id=\"spreedly-number\" class=\"spreedly-input\"></div>\n                </div>\n\n                <div class=\"form-group\">\n                    <label class=\"control-label\" for=\"spreedly-exp-month\">Expiration Date</label>\n                    <input type=\"text\" id=\"month\" name=\"month\" maxlength=\"2\" class=\"form-control\" placeholder=\"MM\">\n                    <input type=\"text\" id=\"year\" name=\"year\" maxlength=\"4\" class=\"form-control\" placeholder=\"YYYY\">\n                </div>\n\n                <div class=\"form-group\">\n                    <label class=\"control-label\">CVV</label>\n                    <div id=\"spreedly-cvv\" class=\"spreedly-input\"></div>\n                </div>\n\n                <div class=\"form-submit\">\n                    <input type=\"button\" class=\"btn-primary btn animated pulse infinite finishButton\" id=\"submit-button\" ng-click=\"submitPaymentForm()\" value='{{ product.orderButtonText }}' disabled />\n                </div>\n            </form>\n\n\n            <!-- Square Checkout Form -->\n            <div id=\"sq-ccbox\" ng-if=\"psp == 'square'\">\n                <form id=\"nonce-form\" novalidate>\n\n                    <div class=\"form-group\">\n                        <label class=\"control-label\">Card Number:</label>\n                        <div id=\"sq-card-number\"></div>\n                    </div>\n\n                    <div class=\"form-group\">\n                        <label class=\"control-label\">CVV:</label>\n                        <div id=\"sq-cvv\"></div>\n                    </div>\n                    \n                    <div class=\"form-group\">\n                        <label class=\"control-label\">Expiration Date:</label>\n                        <div id=\"sq-expiration-date\"></div>\n                    </div>\n                    \n                    <div class=\"form-group\">\n                        <label class=\"control-label\">Postal Code:</label>\n                        <div id=\"sq-postal-code\"></div>\n                    </div>\n\n                    <div class=\"form-submit\">\n                        <input type=\"button\" class=\"btn-primary btn animated pulse infinite finishButton\" id=\"sq-creditcard\" ng-click=\"requestCardNonce($event)\" value='{{ product.orderButtonText }}' />\n                    </div>\n\n                    <input type=\"hidden\" id=\"card-nonce\" name=\"nonce\">\n                </form>\n            </div>\n\n            <div id=\"sq-walletbox\" ng-if=\"psp == 'square'\">\n                <div id=\"sq-apple-pay-label\" class=\"wallet-not-enabled\">Apple Pay for Web not enabled</div>\n                <!-- Placholder for Apple Pay for Web button -->\n                <button id=\"sq-apple-pay\" class=\"button-apple-pay\"></button>\n\n                <div id=\"sq-masterpass-label\" class=\"wallet-not-enabled\">Masterpass not enabled</div>\n                <!-- Placholder for Masterpass button -->\n                <button id=\"sq-masterpass\" class=\"button-masterpass\"></button>\n            </div>\n        \n    </div>\n\n</main>";
window.angular.module('ng').run(['$templateCache', function(c) { c.put(path, html) }]);
module.exports = path;

/***/ }),

/***/ 121:
/***/ (function(module, exports, __webpack_require__) {

var angular = __webpack_require__(3);
var templateUrl = __webpack_require__(122);

//Creating bookingCalendar component on the StickyBooking Module
angular.module('StickyBooking')
    .component('bookingCalendar', {
        templateUrl: templateUrl,
        controller: function($scope, occasionSDKService){

            this.$onInit = function(){
                console.log("Calendar Component Init");
                //Configure calendar to display up to 6 months from today
                let startDate = new Date ( (1 + new Date().getMonth()) + '/01/' + new Date().getFullYear() );
                let endDate = new Date(startDate);
                endDate.adjust('months', 6);
                endDate.adjust('days', -1);

                //Set starting month and year for the calendar to display
                $scope.activeCalendarMonth = new Date().getMonth();
                $scope.activeCalendarYear = new Date().getFullYear();
                $scope.highestMonthLoaded = $scope.activeCalendarMonth;
                $scope.highestYearLoaded = $scope.activeCalendarYear;

                //Set max and min range for the calendar in terms of month and year
                $scope.minCalendarMonth = startDate.getMonth();
                $scope.minCalendarYear = startDate.getFullYear();
                $scope.maxCalendarMonth = endDate.getMonth();
                $scope.maxCalendarYear = endDate.getFullYear();

                $scope.$on('timeSlotDataLoaded', function(event, data){
                    $scope.merchant = data.merchant;
                    $scope.product = data.product;
                    $scope.timeSlots = data.timeSlots;
                    $scope.durations = data.durations;
                    //$scope.timeSlotsByMonthArray = data.timeSlotsByMonthArray;

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
                        $scope.getNewTimeSlots();
                    }else if( $scope.activeCalendarYear == $scope.maxCalendarYear ){
                        if( ($scope.activeCalendarMonth + 1) <= $scope.maxCalendarMonth ){
                            $scope.activeCalendarMonth++;
                            $scope.getNewTimeSlots();
                        }
                    }
                }else{
                    if( (0 <= $scope.maxCalendarMonth) && (($scope.activeCalendarYear + 1) <= $scope.maxCalendarYear) ){
                        $scope.activeCalendarMonth = 0;
                        $scope.activeCalendarYear++;
                        $scope.getNewTimeSlots();
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

            //Gets new month of time slots on month change
            $scope.getNewTimeSlots = function(){
                if( ($scope.activeCalendarMonth > $scope.highestMonthLoaded && $scope.activeCalendarYear == $scope.highestYearLoaded) || $scope.activeCalendarYear > $scope.highestYearLoaded){
                    $scope.$emit('startLoading');
                    occasionSDKService.getTimeSlotsByMonth($scope.timeSlots, $scope.activeCalendarMonth, $scope.activeCalendarYear)
                        .then( (newTimeSlots) => {
                            console.log("Time slots by month", newTimeSlots);
                            $scope.timeSlots = newTimeSlots;
                            $scope.highestMonthLoaded = $scope.activeCalendarMonth;
                            $scope.highestYearLoaded = $scope.activeCalendarYear;
                            $scope.$emit('timeSlotsUpdated', { timeSlots: $scope.timeSlots});
                            $scope.$apply();
                        })
                        .catch( (error) => console.log("Error", error) );
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

/***/ }),

/***/ 122:
/***/ (function(module, exports) {

var path = '/Users/nicklandgrebe/dev/StickyBooking/src/components/calendar/calendar.component.html';
var html = "<div ng-repeat=\"(yearIndex, year) in allDates\" ng-if=\"year.year == activeCalendarYear\">\n    <div ng-repeat=\"(monthIndex, month) in year.months\" ng-if=\"month.month == activeCalendarMonth\">\n    <div class=\"row month-navigator\">\n        <div class=\"col-xs-3\">\n        <a class=\"btn btn-defult\" ng-click=\"moveMonthBack()\"><i class=\"fa fa-arrow-left\" aria-hidden=\"true\"></i></a>\n        </div>\n        <div class=\"col-xs-6 text-center\">\n        <h6>{{ month.monthName }} {{ year.year }}</h6>\n        </div>\n        <div class=\"col-xs-3 text-right\">\n        <a class=\"btn btn-defult\" ng-click=\"moveMonthAhead()\"><i class=\"fa fa-arrow-right\" aria-hidden=\"true\"></i></a>\n        </div>\n    </div>\n\n    <table class=\"calendar-table\">\n        <thead>\n        <tr>\n            <td>S</td>\n            <td>M</td>\n            <td>T</td>\n            <td>W</td>\n            <td>T</td>\n            <td>F</td>\n            <td>S</td>\n        </tr>\n        </thead>\n        <tr></tr>\n        <tr class=\"calendar-dates\" ng-repeat=\"(weekIndex, week) in month.weeks\">\n        \n        <!-- Empty space at the begining of the month -->\n        <!-- If it is the first week of the month, and the first day of the month is not on a Sunday, print as many empty blocks as there are missing days at the start of the week -->\n        <td ng-if=\"weekIndex == 0 && week[0].thisDay.dayOfWeek != 0\" ng-repeat=\"times in returnRange( (week[0].thisDay.dayOfWeek + 1) - week[0].thisDay.date )\" class=\"empty-date\"></td>  \n        \n        <!-- If the starting calendar date is not the first day of the week or month -->\n        <td ng-if=\"monthIndex == 0 && weekIndex == 0 && week[0].thisDay.date != 1\" ng-repeat=\"(timeIndex, time) in returnRange(week[0].thisDay.date - 1)\" class=\"unavailable-day\">Un{{ timeIndex + 1 }}</td>\n\n        <!-- All days within the month -->\n        <!-- Classes that distinguish availability are added by the getDisplayClasses function-->\n        <td ng-repeat=\"(dayIndex, day) in week\" class=\"{{ getDisplayClasses(day) }}\" ng-click=\"onDateSelection($event, day)\">{{ day.thisDay.date }}</td>\n        \n        <!-- Empty space at the end of the month -->\n        <!-- If it is the last week of the month, and the last day of the month is not on a Saturday, print as many empty blocks as there are missing days at the end of the week -->\n        <td ng-if=\"weekIndex == (month.weeks.length - 1)\"  ng-repeat=\"times in returnRange( 6 - (week[week.length - 1].thisDay.dayOfWeek) )\" class=\"empty-date\"></td>  \n        \n        </tr>\n    </table>\n    </div>\n</div>";
window.angular.module('ng').run(['$templateCache', function(c) { c.put(path, html) }]);
module.exports = path;

/***/ }),

/***/ 123:
/***/ (function(module, exports, __webpack_require__) {

var angular = __webpack_require__(3);
var Occasion = __webpack_require__(41);

angular.module('StickyBooking')
    .factory('occasionSDKService', () => {
        console.log("SDK Service Init");

        //Private Variables
        this.occsnKey = window.OCCSN.api_key;
        this.myMerchant;

        //Create Connection to Occasion SDK using Merchant API Key
        this.occsn = new Occasion.Client({ baseUrl: 'http://occasion.lvh.me:3000/api/v1/', token: this.occsnKey });

        //Private Promises
        this.queryMyMerchant = new Promise( (resolve, reject) => {
            this.occsn.Merchant.first()
                .then( (merchant) => {
                    resolve(merchant); 
                })
                .catch( (error) => reject(error) );
        });

        this.queryMyVenues = new Promise( (resolve, reject) => {
            this.myMerchant.venues().all()
                .then( (venues) => resolve(venues) )
                .catch( (error) =>  reject(error) );
        });

        this.queryMyProducts = new Promise( (resolve, reject) => {
            this.myMerchant.products().all()
                .then( (products) => resolve(products) )
                .catch( (error) =>  reject(error) );
        });

        //Private Functions
        this.queryTimeSlotsByMonth = (allTimeSlots, month) => {
            return new Promise( (resolve, reject) => {

                this.queryNextTimeSlotsPage(allTimeSlots)
                    .then( (newTimeSlots) => {

                        if( new Date(newTimeSlots.__collection[newTimeSlots.__collection.length - 1].startsAt).getMonth() == month ){
                            newTimeSlots.__collection.unshift( ...allTimeSlots.__collection );
                            this.queryTimeSlotsByMonth(newTimeSlots, month)
                                .then( (finalTimeSlots) => {
                                    resolve(finalTimeSlots);
                                })
                                .catch( (error) => reject(error) );
                        }else{
                            if( new Date(newTimeSlots.__collection[0].startsAt).getMonth() == month ){
                                newTimeSlots.__collection.unshift( ...allTimeSlots.__collection );
                                this.queryTimeSlotsByMonth(newTimeSlots, month)
                                    .then( (finalTimeSlots) => {
                                        resolve(finalTimeSlots);
                                    })
                                    .catch( (error) => reject(error) );
                            }else{
                                resolve(allTimeSlots);
                            }
                        }

                    })
                    .catch( (data) => {
                        if(data.hasNextPage == false){
                            resolve(allTimeSlots);
                        }else{
                            reject(error);
                        }
                    });
                    
            });
        }

        this.queryTimeSlotsForProduct = (product) => {
            return new Promise( (resolve, reject) => {
                this.queryMyMerchant
                    .then( (merchant) => {
                        merchant.products().find(product.id)
                        .then( (product) => {
                            product.timeSlots().where({ status: 'bookable' }).perPage(100).all()
                            .then( (timeSlots) => resolve(timeSlots) )
                            .catch( (error) => reject(error) );
                        })
                    });
            });
        }

        this.queryNextTimeSlotsPage = (timeSlots) => {
            return new Promise( (resolve, reject) => {
                if( timeSlots.hasNextPage() ){
                    timeSlots.nextPage()
                        .then( (nextTimeSlotsPage) => resolve(nextTimeSlotsPage) )
                        .catch( (error) => reject({ error: error, hasNextPage: true }) );
                }else{
                    reject({
                        hasNextPage: false
                    });
                }
            });
        }

        this.queryProductById = (id) => {
            return new Promise( (resolve, reject) => {
                this.queryMyMerchant
                    .then( (merchant) => {
                        merchant.products().find(id)
                            .then( (product) => resolve(product) )
                            .catch( (error) => reject(error) );
                    })
            });
        }

        this.queryToCreateOrderForProduct = (product) => {
            return new Promise( (resolve, reject) => {
                this.occsn.Order.construct({ product: product })
                    .then( (order) => resolve(order) )
                    .catch( (error) => reject(error) );
            });
        }

        this.queryBuildCard = (token) =>{
            return occsn.CreditCard.build({ id: token });
        }


        //Set merchant variable locally
        this.queryMyMerchant
            .then( (merchant) => this.myMerchant = merchant );


        //Return Public Member Variables and Functions
        return {
            getMyMerchant: () => {
                return this.queryMyMerchant;
            },
            getMyVenues: () => {
                return this.queryMyVenues;
            },
            getMyProducts: () => {
                return this.queryMyProducts;
            },
            getProductById: (id) => {
                return this.queryProductById(id);
            },
            getTimeSlotsByMonth: (timeSlots, month) => {
                return this.queryTimeSlotsByMonth(timeSlots, month);
            },
            getTimeSlotsForProduct: (product) => {
                return this.queryTimeSlotsForProduct(product);
            },
            getNextTimeSlotsPage: (timeSlots) => {
                return this.queryNextTimeSlotsPage(timeSlots);
            },
            createOrderForProduct: (product) => {
                return this.queryToCreateOrderForProduct(product);
            },
            buildCard: (token) => {
                return this.queryBuildCard(token);
            }
        }

    });


/***/ })

},[116]);