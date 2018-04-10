var angular = require('angular');
var $ = require('jquery');

var moment = require('moment');
require('moment-timezone');
var _ = require('underscore');

var templateUrl = require('./booking.component.nghtml');

//Creating bookingPage component on StickyBooking Module
angular.module('StickyBooking')
    .component('bookingPage', {
        templateUrl: templateUrl,
        controller: function BookingController($scope, $http, $filter, $window, occasionSDKService) {

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
              $scope.showNav = false;
              $scope.submitting = false;

              $scope.maxStep = 0;
              $scope.step = 0;

              angular.element($window).bind('scroll', function() {
                if(this.pageYOffset > 100) {
                  $scope.showNav = true;

                  $scope.$apply();
                }
              });

              $scope.loadInitialData();
          };

          // Make initial calls for data and subsequent eager loaded calls
          $scope.loadInitialData = function(){
              $scope.merchant = null;
              $scope.product = null;

              // Initiate several promises at once, wait for all of them to respond before continuing
              Promise.all([
                  occasionSDKService.getMyMerchant(),
                  occasionSDKService.getProductById($scope.staticProductID)
              ]).then((values) => {
                  // Populate global variables with returns from promises above
                  var merchant = values[0];
                  var product = values[1];

                  $scope.merchant = merchant;
                  $scope.product = product;

                  // Set PSP (payment service provider) to merchant's
                  // @example 'cash', 'spreedly', 'square'
                  $scope.psp = merchant.pspName;

                  // Set moment.js time zone to merchant's
                  moment.tz.setDefault(merchant.timeZone);

                  // Flash an alert to the merchant to add time slots if the product does not a first time slot
                  if(_.isNull(product.firstTimeSlotStartsAt)) {
                      alert(
                        'Listing has no timeslots. If you are the merchant who owns this listing, add time slots ' +
                        'so that there are times that can be booked.'
                      );
                  }

                  $scope.$broadcast('initialDataLoaded', { product: product } );
                  $scope.$emit('initialDataLoaded', { merchant: merchant, product: product } );
                  $scope.initialDataLoaded = true;
                  $scope.displayLoading = false;
                  $scope.$apply();

                  // New order for product
                  occasionSDKService.createOrderForProduct(product)
                      .then( (order) => {
                          console.log("Order data loaded");
                          $scope.order = order;
                          $scope.orderLoaded = true;

                          $scope.$emit('orderDataLoaded', { order: order } );

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
          };

          $scope.$on('calendarDataLoaded', function(event, data){
            $scope.calendarDataLoaded = data.calendarDataLoaded;
          });

          $scope.clickGoToStep = function(step) {
            if(step <= $scope.maxStep) $scope.goToStep(step);
          };

          $scope.goToStep = function(step) {
            $scope.step = step;
            $scope.scrollToAnchor('step-' + step + '-scroller');

            if(step > $scope.maxStep) $scope.maxStep = step;
          };

          //When a user clicks get started
          $scope.getStarted = function(){
            $scope.displayLoading = true;

            $scope.$watch('calendarDataLoaded', function(calendarDataLoaded) {
                if(calendarDataLoaded) {
                  $scope.displayLoading = false;

                  $scope.goToStep(1);
                }
            });
          };

          //When date is selected from calendar
          $scope.$on('dateSelectedEvent', function(event, data){
              $scope.selectedDate = data.selectedDate;
              $scope.availableSlots = data.availableTimeSlots;

              $scope.goToStep(2);
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
          $scope.onTimeSlotSelection = function(event, timeSlot){
              event.preventDefault();
              $scope.selectedTimeSlot = timeSlot;

              $scope.order.timeSlots().assign([$scope.selectedTimeSlot]);

              if($scope.orderLoaded){
                  $scope.startOrder();
              }else{
                  $scope.displayLoading = true;
                  $scope.$watch('orderLoaded', function(newValue){
                      if(newValue){
                          $scope.displayLoading = false;
                          $scope.startOrder();
                      }
                  });
              }
          };

          $scope.isActiveTimeSlot = function(timeSlot) {
              let activeTimeSlot = $scope.order.timeSlots().target().first();
              if(_.isUndefined(activeTimeSlot)) return false;

              return activeTimeSlot.startsAt.isSame(timeSlot.startsAt);
          };

          // Returns a number formatted like "($NN.NN)"
          var numToCurrency = function(n) {
              return $filter('currency')(n, $scope.merchant.currency().code);
          };

          // Returns the answer on the order for any of the questions the product asks
          $scope.answerForQuestion = function(question) {
            return $scope.order.answers().target().detect((a) => { return a.question() == question });
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

          // Indicates whether or not the order has a subtotal, meaning the price and redeemable sections are necessary
          $scope.hasSubtotal = function() {
            return !$scope.product.free && parseFloat($scope.order.subtotal) > 0;
          };

          // Indicates whether or not the order requires payment, meaning the payment section is necessary
          $scope.requiresPayment = function() {
              return $scope.hasSubtotal() && parseFloat($scope.order.outstandingBalance) > 0;
          };

          //When Order and Answers must be configured
          $scope.startOrder = function(){
              $scope.optionsHolder = {};

              $scope.goToStep(3);

              //Calculate starting price
              $scope.order.calculatePrice()
                  .then( (order) => {
                      console.log("Order after first calc", $scope.order.attributes());

                      if($scope.psp == "spreedly"){
                          console.log("Use Spreedly");
                          $scope.useSpreedly();
                      }

                      if($scope.psp == "square"){
                          console.log("Use Square");
                          $scope.useSquare();
                      }

                      $scope.$apply();
                  })
                  .catch( (error) => {
                      console.log("Error from calc start price", error);
                  });
          };

          $scope.useSquare = function() {
              // Create and initialize a payment form object
              $scope.paymentForm = new SqPaymentForm({

                  // Initialize the payment form elements
                  applicationId: window.OCCSN.square_key,
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
                              $scope.submitting = false;
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
          };

          $scope.useSpreedly = function(){
              //Init Spreedly card values
              Spreedly.init(window.OCCSN.spreedly_key, {
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
                  $scope.submitting = false;
                  $scope.$apply();
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
          };

          $scope.checkRedeemable = function(){
              $scope.displayLoading = true;

              $scope.redeemableError = null;
              $scope.activeRedeemable = null;
              var code = document.getElementById('redeemableInput').value;

              $scope.product.redeemables().findBy({ code: code })
                  .then((redeemable) => {
                      console.log("Redeemable", redeemable);
                      var type = occasionSDKService.redeemableType(redeemable);
                      $scope.activeRedeemable = redeemable;
                      console.log("Attr", $scope.activeRedeemable.attributes());

                      $scope.displayLoading = false;
                      document.getElementById('redeemableInput').disabled = true;

                      // Apply charge or discount
                      switch(type) {
                          case('card'):
                              var value = parseFloat($scope.activeRedeemable.value);
                              var balance = parseFloat($scope.order.outstandingBalance);
                              if(value > balance) value = balance;

                              $scope.order.charge($scope.activeRedeemable, value);
                              $scope.redeemableStatus = 'Gift Card Applied! - ' + $scope.merchant.currency().code + value + ' Applied';
                              break;
                          case('coupon'):
                              $scope.order.assignCoupon($scope.activeRedeemable);
                              if($scope.activeRedeemable.attributes().discountFixed != null)
                                  $scope.redeemableStatus = 'Coupon Applied! - ' + $scope.merchant.currency().code + $scope.activeRedeemable.discountFixed + ' Off';
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
          };

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
          };

          $scope.submitPaymentForms = function() {
              $scope.submitting = true;
              $scope.orderErrors = null;

              if(!$scope.requiresPayment()) {
                $scope.submitOrder();
              } else {
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
          };

          $scope.submitSquareForm = function() {
              $scope.paymentForm.requestCardNonce();
          };

          $scope.submitSpreedlyForm = function(){
              console.log("Submit payment form");
              var requiredFields = {};

              // Get required, non-sensitive, values from host page
              requiredFields["full_name"] = document.getElementById("full_name").value;
              requiredFields["month"] = document.getElementById("month").value;
              requiredFields["year"] = document.getElementById("year").value;

              Spreedly.tokenizeCreditCard(requiredFields);
          };

          //When users submits order form
          $scope.submitOrder = function() {
              $scope.order.save(() => {
                $scope.submitting = false;

                if($scope.order.persisted()) {
                  $scope.$emit('orderDataLoaded', { order: $scope.order } );
                } else {
                  $scope.orderErrors = $scope.order.errors().toArray();
                  $scope.order.removeCharge($scope.creditCard);
                }
                $scope.$apply();
              });
          };

          //Scroll to specified anchor tag
          $scope.scrollToAnchor = function(aid){
              var aTag = $("a[name='"+ aid +"']");
              $('html, body').animate( { scrollTop: aTag.offset().top }, 'slow');
          };

          //Return a readable time portion of a date
          $scope.formatToTime = function(dateString){
              return moment(dateString).format('LT');
          };

          //Return a readable date portion of a date
          $scope.formatToDate = function(dateString){
            return moment(dateString).format('MMMM DD, YYYY');
          };

          //Return a readable full datetime
          $scope.formatToFullDatetime = function(dateString) {
            return moment(dateString).format('dddd MMMM Do, YYYY h:mm A');
          };

          //Determine which time of day section this timeSlot belongs in
          $scope.splitByTimeOfDay = function(timeSlot, time) {
              switch(time){
                  case('morning'):
                      return timeSlot.startsAt.hour() < 12;
                  case('afternoon'):
                      return timeSlot.startsAt.hour() >= 12 && timeSlot.startsAt.hour() < 18;
                  case('evening'):
                      return timeSlot.startsAt.hour() >= 18;
              }
          };

      } //End Controller
}); //End Component
