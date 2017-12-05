var angular = require('angular');
var moment = require('moment');
var templateUrl = require('ngtemplate-loader!./booking.component.html');

//Creating bookingPage component on StickyBooking Module
angular.module('StickyBooking')
    .component('bookingPage', {
        templateUrl: templateUrl,
        controller: function BookingController($scope, $http, $filter, occasionSDKService) {

          //Runs On Init
          this.$onInit = function(){
              console.log("Booking Component Init");
              //Call function to load data from SDK Service
              $scope.displayLoading = true;
              $scope.initialDataLoaded = false;
              $scope.calendarDataLoaded = false;
              $scope.orderLoaded = false;
              $scope.staticProductID = window.OCCSN.product_id;
              $scope.orderErrors = null;
              $scope.activeRedeemable = null;
              $scope.redeemableError = null;
              $scope.redeemableStatus = null;
              $scope.submitting = false;
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
                  occasionSDKService.getTimeSlotsByMonth($scope.product, moment())
                      .then( (timeSlots) => {
                          if(timeSlots.empty()) {
                              alert(
                                'Listing has no timeslots. If you are the merchant who owns this listing, add time slots ' +
                                'so that there are times that can be booked.'
                              );
                          }

                          $scope.timeSlots = timeSlots;

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
                      });

                  //Eager load Order resource
                  console.log("Order data loading");
                  occasionSDKService.createOrderForProduct($scope.product)
                      .then( (order) => {
                          console.log("Order data loaded");
                          $scope.order = order;
                          $scope.orderLoaded = true;
                      });

              }).catch( (errors) => {
                  console.log(errors);
                  $scope.displayLoading = false;
                  $scope.$apply();

                  if(errors instanceof TypeError){
                      alert("There was an error retrieving the listing you're looking for. Please try again later.");
                  }else{
                      errors.map(error => {
                          alert(error.details);
                      });
                  }
              });
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
          };

          // Returns a number formatted like "($NN.NN)"
          var numToCurrency = function(n) {
              return $filter('currency')(n, $scope.merchant.currency().code);
          };

          // Formats the title for checkbox questions, which have following permutations:
          // formControl == 'checkbox'
          //   category == 'info': TITLE
          //   category == 'price'
          //     operation == 'add': TITLE ($99.99)
          //     operation == 'multiply': TITLE (99.99% extra)
          //   category == 'price'
          //     operation == 'subtract': TITLE ($99.99 off)
          //     operation == 'divide': TITLE (99.99% off)
          // formControl == 'waiver': TITLE
          $scope.titleForCheckbox = function(checkbox) {
              switch(checkbox.formControl) {
                  case 'checkbox':
                      switch(checkbox.category) {
                          case 'price':
                              switch(checkbox.operation) {
                                  case 'add':
                                      return checkbox.title + ' (' + numToCurrency(checkbox.price) + ')';
                                  case 'multiply':
                                      return checkbox.title + ' (' + checkbox.percentage + '% extra)';
                              }
                              break;
                          case 'discount':
                              switch(checkbox.operation) {
                                  case 'subtract':
                                      return checkbox.title + ' (' + numToCurrency(checkbox.price) + ' off)';
                                  case 'divide':
                                      return checkbox.title + ' (' + checkbox.percentage + '% off)';
                              }
                              break;
                          default:
                              return checkbox.title;
                      }
                      break;
                  case 'waiver':
                      return checkbox.title;
              }
          };

          // Formats the title for options of dropdowns/option lists to include price if the option has a price
          $scope.titleForOption = function(option) {
              var title = option.title;

              if(option.price) title += ' (' + numToCurrency(option.price) + ')';

              return title;
          };

          // Formats the title for spin buttons that change based on the value of the spin button
          $scope.titleForSpinButton = function(answer) {
              var title = answer.question().title;

              if(answer.question().price) {
                  title += ' ' + answer.value + ' x ' + numToCurrency(answer.question().price) + ' = ';
                  title += numToCurrency(parseFloat(answer.question().price) * answer.value);
              }

              if(answer.question().max) {
                  title += ' (Max of ' + answer.question().max + ')';
              }

              return title;
          };

          // Returns the default option from a question's options
          $scope.defaultOptionFor = function(question) {
              return question.options().target().detect(function(o) { return o.default; });
          };

          //When the value of a drop down selector or radio selector changes
          $scope.optionableQuestionChanged = function(answer, option){
              answer.assignOption(option);
              $scope.answerChanged(answer);
          };

          // Update price on answer change if price calculating question
          //   On init
          //   When a question value changes
          $scope.answerChanged = function(answer){
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
          };

          //When Order and Answers must be configured
          $scope.startOrder = function(){
              $scope.optionsHolder = {};

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

              // Create and initialize a payment form object
              $scope.paymentForm = new SqPaymentForm({

                  // Initialize the payment form elements
                  applicationId: applicationId,
                  inputClass: 'form-control',

                  // Customize the CSS for SqPaymentForm iframe elements
                  inputStyles: [{
                      fontSize: '19px'
                  }],

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
                      cardNonceResponseReceived: function(errors, nonce, cardData) {
                          if (errors) {
                              //Fill orderErrors array which displays under credit card form
                              $scope.orderErrors = errors;
                              $scope.$apply();

                              //Log full errors for console
                              console.log("Encountered errors:");
                              errors.forEach(function(error) {
                                  console.log(error);
                              });
                          }else{
                              $scope.creditCard = occasionSDKService.buildCard(nonce);
                              console.log("CARD", $scope.creditCard);
                              $scope.order.charge( $scope.creditCard, $scope.order.outstandingBalance );

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
                                  console.log("Error class added");
                              break;
                              case 'errorClassRemoved':
                                  /* HANDLE AS DESIRED */
                                  console.log("Error class removed");
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

          $scope.useSpreedly = function(){
              //Init Spreedly card values
              Spreedly.init("UnQhm0g7l3nOIz2hmAoV3eqm26k", {
                  "numberEl": "spreedly-number",
                  "cvvEl": "spreedly-cvv"
              });

              Spreedly.on("ready", function () {
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
                  console.log("Spreedly On Errors", errors);
                  $scope.orderErrors = errors;
              });

              Spreedly.on('paymentMethod', function(token, pmData) {
                  $scope.creditCard = occasionSDKService.buildCard(token);
                  $scope.order.charge( $scope.creditCard, $scope.order.outstandingBalance );

                  $scope.order.calculatePrice()
                      .then( (order) => {
                          $scope.submitOrder();
                      })
                      .catch( (error) => {
                          console.log("Errors with final calc price", error);
                      });
              });
          }

          $scope.checkRedeemable = function(){
              $scope.displayLoading = true;

              $scope.redeemableError = null;
              $scope.activeRedeemable = null;
              var code = document.getElementById('redeemableInput').value;

              $scope.product.redeemables().findBy({ code: code })
                  .then( (redeemable) => {
                      console.log("Redeemable", redeemable);
                      var type = occasionSDKService.redeemableType(redeemable);
                      $scope.activeRedeemable = redeemable;
                      console.log("Attr", $scope.activeRedeemable.attributes());

                      $scope.displayLoading = false;
                      document.getElementById('redeemableInput').disabled = true;

                      //Apply charge or discount
                      switch(type){
                          case('card'):
                              $scope.order.charge($scope.activeRedeemable, $scope.activeRedeemable.value);
                              $scope.redeemableStatus = 'Gift Card Applied! - ' + $scope.merchant.currency().code + $scope.activeRedeemable.attributes().value + ' Applied';
                              break;
                          case('coupon'):
                              $scope.order.assignCoupon($scope.activeRedeemable);
                              if($scope.activeRedeemable.attributes().discountFixed != null)
                                  $scope.redeemableStatus = 'Coupon Applied! - ' + $scope.merchant.currency().code + $scope.activeRedeemable.attributes().discountFixed + ' Off';
                              if($scope.activeRedeemable.attributes().discountPercentage != null)
                                  $scope.redeemableStatus = 'Coupon Applied! - ' + $scope.activeRedeemable.attributes().discountPercentage + '% Off';
                              break;
                      }

                      //Recalc price
                      $scope.order.calculatePrice()
                          .then( order => {
                              console.log("Order after calc after redeem", order);
                              $scope.$apply();
                          }).catch( error => {
                              console.log("Error after calc after redeem", error);
                          });
                  })
                  .catch( (errors) => {
                      $scope.displayLoading = false;
                      errors.map( error => {
                          $scope.redeemableStatus = null;
                          $scope.redeemableError = error.details;
                      });
                      document.getElementById('redeemableInput').value = null;
                      $scope.$apply();
                  });
          }

          $scope.removeRedeemable = function(){
              $scope.displayLoading = true;

              switch(occasionSDKService.redeemableType($scope.activeRedeemable)){
                  case('card'):
                      $scope.order.removeCharge($scope.activeRedeemable);
                      break;
                  case('coupon'):
                      $scope.order.assignCoupon(null);
                      break;
              }
              $scope.activeRedeemable = null;
              $scope.redeemableStatus = null;
              $scope.redeemableError = null;
              document.getElementById('redeemableInput').value = null;
              document.getElementById('redeemableInput').disabled = false;

              //Recalc price
              $scope.order.calculatePrice()
                  .then( order => {
                      console.log("Order after calc after remove redeem", order);
                      $scope.displayLoading = false;
                      $scope.$apply();
                  }).catch( error => {
                      console.log("Error after calc after remove redeem", error);
                      $scope.displayLoading = false;
                  });
          }

          $scope.submitPaymentForms = function(event){
              event.preventDefault();
              $scope.orderErrors = null;
              switch($scope.psp){
                  case('cash'):
                      $scope.submitOrder();
                      break;
                  case('square'):
                      $scope.submitSquareForm();
                      break;
                  case('spreedly'):
                      $scope.submitSpreedlyForm();
                      break;
              }
          }

          $scope.submitSquareForm = function() {
              $scope.paymentForm.requestCardNonce();
          }

          $scope.submitSpreedlyForm = function(){
              console.log("Submit payment form");
              var requiredFields = {};

              // Get required, non-sensitive, values from host page
              requiredFields["full_name"] = document.getElementById("full_name").value;
              requiredFields["month"] = document.getElementById("month").value;
              requiredFields["year"] = document.getElementById("year").value;

              Spreedly.tokenizeCreditCard(requiredFields);
          }

          //When users submits order form
          $scope.submitOrder = function() {
              console.log("Order Submit", $scope.order);

              $scope.submitting = true;

              $scope.order.save(() => {
                $scope.submitting = false;

                if($scope.order.persisted()) {
                  console.log("Order save was success");
                } else {
                  console.log("Order save was not a success");
                  console.log("ORDER ERRORS", $scope.order.errors().toArray());
                  $scope.orderErrors = $scope.order.errors().toArray();
                  $scope.order.removeCharge($scope.creditCard);
                }
                $scope.$apply();
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
              return moment(dateString).format('LT');
          }

          $scope.formatToFullDatetime = function(dateString) {
            return moment(dateString).format('dddd MMMM Do, YYYY h:mm A');
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

      } //End Controller
}); //End Component