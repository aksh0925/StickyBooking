webpackJsonp([0],{

/***/ 241:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(242);


/***/ }),

/***/ 242:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var angular = __webpack_require__(5);

angular.module('StickyBooking', ['angularSpinner', 'ngSanitize']).controller('AppController', ['$scope', function ($scope) {

  //Runs On Init
  this.$onInit = function () {
    console.log("App Module Init");
  };

  $scope.$on('initialDataLoaded', function (event, data) {
    document.title = data.product.title;
  });
}]);

__webpack_require__(243);
__webpack_require__(245);
__webpack_require__(247);

/***/ }),

/***/ 243:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var angular = __webpack_require__(5);
var moment = __webpack_require__(0);
var _ = __webpack_require__(4);
var templateUrl = __webpack_require__(244);

//Creating bookingPage component on StickyBooking Module
angular.module('StickyBooking').component('bookingPage', {
    templateUrl: templateUrl,
    controller: ['$scope', '$http', '$filter', 'occasionSDKService', function BookingController($scope, $http, $filter, occasionSDKService) {

        //Runs On Init
        this.$onInit = function () {
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
            };

            $scope.loadSDKData();
        };

        //Make initial calls for data and subsequent eager loaded calls
        $scope.loadSDKData = function () {
            $scope.merchant = null;
            $scope.product = null;

            //Initiate several promises at once, wait for all of them to respond before continuing
            Promise.all([occasionSDKService.getMyMerchant(), occasionSDKService.getProductById($scope.staticProductID)]).then(function (values) {
                console.log("Promise.All Finished", values);

                //Populate global variables with returns from promises above
                $scope.merchant = values[0];
                $scope.product = values[1];

                $scope.psp = $scope.merchant.pspName;
                console.log("PSP:", $scope.psp);

                //Manually refresh DOM
                $scope.$emit('initialDataLoaded', { product: $scope.product });
                $scope.initialDataLoaded = true;
                $scope.displayLoading = false;
                $scope.$apply();

                //Eager load calendar data
                console.log("Calendar data loading");
                occasionSDKService.getTimeSlotsByMonth($scope.product, moment()).then(function (timeSlots) {
                    if (timeSlots.empty()) {
                        alert('Listing has no timeslots. If you are the merchant who owns this listing, add time slots ' + 'so that there are times that can be booked.');
                    }

                    $scope.timeSlots = timeSlots;

                    //Manually refresh DOM
                    console.log("Calendar data loaded");
                    $scope.calendarDataLoaded = true;
                    $scope.$apply();

                    //Pass data to child components and initiate their processing
                    $scope.$broadcast('timeSlotDataLoaded', {
                        merchant: $scope.merchant,
                        product: $scope.product,
                        timeSlots: $scope.timeSlots
                    });
                });

                //Eager load Order resource
                console.log("Order data loading");
                occasionSDKService.createOrderForProduct($scope.product).then(function (order) {
                    console.log("Order data loaded");
                    $scope.order = order;
                    $scope.orderLoaded = true;
                });
            }).catch(function (errors) {
                console.log(errors);
                $scope.displayLoading = false;
                $scope.$apply();

                if (errors instanceof TypeError) {
                    alert("There was an error retrieving the listing you're looking for. Please try again later.");
                } else {
                    errors.map(function (error) {
                        alert(error.details);
                    });
                }
            });
        };

        //When a user clicks get started
        $scope.getStarted = function () {
            if ($scope.calendarDataLoaded) {
                //Scroll Calendar into view
                $(".pane-calendar").fadeIn();
                $scope.scrollToAnchor('step-1-scroller');
                $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
                $("#booking-process-status .booking-step-2").addClass("booking-step-active");
            } else {
                $scope.displayLoading = true;
                $scope.$watch('calendarDataLoaded', function (newValue, oldValue, scope) {
                    if (newValue == true) {
                        $scope.displayLoading = false;
                        //Scroll Calendar into view
                        $(".pane-calendar").fadeIn();
                        $scope.scrollToAnchor('step-1-scroller');
                        $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
                        $("#booking-process-status .booking-step-2").addClass("booking-step-active");
                    }
                });
            }
        };

        //When date is selected from calendar
        $scope.$on('dateSelectedEvent', function (event, data) {
            $scope.selectedDate = data.selectedDate;
            $scope.availableSlots = data.availableTimeSlots;
        });

        //When loading animation is started from sub component
        $scope.$on("startLoading", function (event) {
            $scope.displayLoading = true;
        });

        //When loading animation is stopped from sub component
        $scope.$on("stopLoading", function (event) {
            $scope.displayLoading = false;
        });

        //When time slot is selected
        $scope.onTimeSlotSelection = function (event, timeSlot) {
            event.preventDefault();
            $scope.selectedTimeSlot = timeSlot;

            $scope.order.timeSlots().assign([$scope.selectedTimeSlot]);

            if ($scope.orderLoaded) {
                $scope.startOrder();
            } else {
                $scope.displayLoading = true;
                $scope.$watch('orderLoaded', function (newValue) {
                    if (newValue) {
                        $scope.displayLoading = false;
                        $scope.startOrder();
                    }
                });
            }
        };

        $scope.isActiveTimeSlot = function (timeSlot) {
            var activeTimeSlot = $scope.order.timeSlots().target().first();
            if (_.isUndefined(activeTimeSlot)) return false;

            return activeTimeSlot.startsAt.isSame(timeSlot.startsAt);
        };

        // Returns a number formatted like "($NN.NN)"
        var numToCurrency = function numToCurrency(n) {
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
        $scope.titleForCheckbox = function (checkbox) {
            switch (checkbox.formControl) {
                case 'checkbox':
                    switch (checkbox.category) {
                        case 'price':
                            switch (checkbox.operation) {
                                case 'add':
                                    return checkbox.title + ' (' + numToCurrency(checkbox.price) + ')';
                                case 'multiply':
                                    return checkbox.title + ' (' + checkbox.percentage + '% extra)';
                            }
                            break;
                        case 'discount':
                            switch (checkbox.operation) {
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
        $scope.titleForOption = function (option) {
            var title = option.title;

            if (option.price) title += ' (' + numToCurrency(option.price) + ')';

            return title;
        };

        // Formats the title for spin buttons that change based on the value of the spin button
        $scope.titleForSpinButton = function (answer) {
            var title = answer.question().title;

            if (answer.question().price) {
                title += ' ' + answer.value + ' x ' + numToCurrency(answer.question().price) + ' = ';
                title += numToCurrency(parseFloat(answer.question().price) * answer.value);
            }

            if (answer.question().max) {
                title += ' (Max of ' + answer.question().max + ')';
            }

            return title;
        };

        // Returns the default option from a question's options
        $scope.defaultOptionFor = function (question) {
            return question.options().target().detect(function (o) {
                return o.default;
            });
        };

        //When the value of a drop down selector or radio selector changes
        $scope.optionableQuestionChanged = function (answer, option) {
            answer.assignOption(option);
            $scope.answerChanged(answer);
        };

        // Update price on answer change if price calculating question
        //   On init
        //   When a question value changes
        $scope.answerChanged = function (answer) {
            if (answer.question().priceCalculating) {
                $scope.order.calculatePrice().then(function (order) {
                    console.log("Order after calc", $scope.order.attributes());
                    $scope.$apply();
                }).catch(function (error) {
                    console.log("Error with recalc", error);
                });
            }
        };

        // Indicates whether or not the payment, price, and redeemable sections are necessary
        // @note This is false if the product is free or the order's outstanding balance is not zero
        $scope.requiresPaymentForms = function () {
            return !$scope.product.free && parseFloat($scope.order.outstandingBalance) > 0;
        };

        //When Order and Answers must be configured
        $scope.startOrder = function () {
            $scope.optionsHolder = {};

            //Scroll into customer info pane and hide the animation spinner
            $('.pane-customer-information').addClass("step-visible");
            $("#booking-process-status .booking-step-3").addClass("booking-step-complete").removeClass("booking-step-active");
            $("#booking-process-status .booking-step-4").addClass("booking-step-active");
            $scope.scrollToAnchor('customer-info-pane-scroller');

            //Calculate starting price
            $scope.order.calculatePrice().then(function (order) {
                console.log("Order after first calc", $scope.order.attributes());
                $scope.$apply();

                if ($scope.psp == "spreedly") {
                    console.log("Use Spreedly");
                    $scope.useSpreedly();
                }

                if ($scope.psp == "square") {
                    console.log("Use Square");
                    $scope.useSquare();
                }
            }).catch(function (error) {
                console.log("Error from calc start price", error);
            });
        };

        $scope.useSquare = function () {
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
                    methodsSupported: function methodsSupported(methods) {
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
                    cardNonceResponseReceived: function cardNonceResponseReceived(errors, nonce, cardData) {
                        if (errors) {
                            //Fill orderErrors array which displays under credit card form
                            $scope.orderErrors = errors;
                            $scope.$apply();

                            //Log full errors for console
                            console.log("Encountered errors:");
                            errors.forEach(function (error) {
                                console.log(error);
                            });
                        } else {
                            $scope.creditCard = occasionSDKService.buildCard(nonce);
                            console.log("CARD", $scope.creditCard);
                            $scope.order.charge($scope.creditCard, $scope.order.outstandingBalance);

                            $scope.order.calculatePrice().then(function (order) {
                                $scope.submitOrder();
                            }).catch(function (error) {
                                console.log("Errors with final calc price", error);
                            });
                        }
                    },
                    unsupportedBrowserDetected: function unsupportedBrowserDetected() {},
                    inputEventReceived: function inputEventReceived(inputEvent) {
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
                    paymentFormLoaded: function paymentFormLoaded() {
                        console.log("Form loaded");
                    }
                }
            });
            $scope.paymentForm.build();
        };

        $scope.useSpreedly = function () {
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

            Spreedly.on('fieldEvent', function (name, type, activeEl, inputProperties) {
                if (type == 'focus') {
                    Spreedly.setStyle(name, 'border-color: #66afe9; outline: 0; -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(102, 175, 233, 0.6); box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(102, 175, 233, 0.6)');
                }
                if (type == 'blur') {
                    Spreedly.setStyle(name, 'border: 1px solid #ccc; -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075); box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075); -webkit-transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s; -o-transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s; transition: border-color ease-in-out 0.15s, box-shadow ease-in-out 0.15s;');
                }
            });

            Spreedly.on('errors', function (errors) {
                console.log("Spreedly On Errors", errors);
                $scope.orderErrors = errors;
            });

            Spreedly.on('paymentMethod', function (token, pmData) {
                $scope.creditCard = occasionSDKService.buildCard(token);
                $scope.order.charge($scope.creditCard, $scope.order.outstandingBalance);

                $scope.order.calculatePrice().then(function (order) {
                    $scope.submitOrder();
                }).catch(function (error) {
                    console.log("Errors with final calc price", error);
                });
            });
        };

        $scope.checkRedeemable = function () {
            $scope.displayLoading = true;

            $scope.redeemableError = null;
            $scope.activeRedeemable = null;
            var code = document.getElementById('redeemableInput').value;

            $scope.product.redeemables().findBy({ code: code }).then(function (redeemable) {
                console.log("Redeemable", redeemable);
                var type = occasionSDKService.redeemableType(redeemable);
                $scope.activeRedeemable = redeemable;
                console.log("Attr", $scope.activeRedeemable.attributes());

                $scope.displayLoading = false;
                document.getElementById('redeemableInput').disabled = true;

                //Apply charge or discount
                switch (type) {
                    case 'card':
                        $scope.order.charge($scope.activeRedeemable, $scope.activeRedeemable.value);
                        $scope.redeemableStatus = 'Gift Card Applied! - ' + $scope.merchant.currency().code + $scope.activeRedeemable.attributes().value + ' Applied';
                        break;
                    case 'coupon':
                        $scope.order.assignCoupon($scope.activeRedeemable);
                        if ($scope.activeRedeemable.attributes().discountFixed != null) $scope.redeemableStatus = 'Coupon Applied! - ' + $scope.merchant.currency().code + $scope.activeRedeemable.attributes().discountFixed + ' Off';
                        if ($scope.activeRedeemable.attributes().discountPercentage != null) $scope.redeemableStatus = 'Coupon Applied! - ' + $scope.activeRedeemable.attributes().discountPercentage + '% Off';
                        break;
                }

                //Recalc price
                $scope.order.calculatePrice().then(function (order) {
                    console.log("Order after calc after redeem", order);
                    $scope.$apply();
                }).catch(function (error) {
                    console.log("Error after calc after redeem", error);
                });
            }).catch(function (errors) {
                $scope.displayLoading = false;
                errors.map(function (error) {
                    $scope.redeemableStatus = null;
                    $scope.redeemableError = error.details;
                });
                document.getElementById('redeemableInput').value = null;
                $scope.$apply();
            });
        };

        $scope.removeRedeemable = function () {
            $scope.displayLoading = true;

            switch (occasionSDKService.redeemableType($scope.activeRedeemable)) {
                case 'card':
                    $scope.order.removeCharge($scope.activeRedeemable);
                    break;
                case 'coupon':
                    $scope.order.assignCoupon(null);
                    break;
            }
            $scope.activeRedeemable = null;
            $scope.redeemableStatus = null;
            $scope.redeemableError = null;
            document.getElementById('redeemableInput').value = null;
            document.getElementById('redeemableInput').disabled = false;

            //Recalc price
            $scope.order.calculatePrice().then(function (order) {
                console.log("Order after calc after remove redeem", order);
                $scope.displayLoading = false;
                $scope.$apply();
            }).catch(function (error) {
                console.log("Error after calc after remove redeem", error);
                $scope.displayLoading = false;
            });
        };

        $scope.submitPaymentForms = function (event) {
            event.preventDefault();
            $scope.orderErrors = null;
            switch ($scope.psp) {
                case 'cash':
                    $scope.submitOrder();
                    break;
                case 'square':
                    $scope.submitSquareForm();
                    break;
                case 'spreedly':
                    $scope.submitSpreedlyForm();
                    break;
            }
        };

        $scope.submitSquareForm = function () {
            $scope.paymentForm.requestCardNonce();
        };

        $scope.submitSpreedlyForm = function () {
            console.log("Submit payment form");
            var requiredFields = {};

            // Get required, non-sensitive, values from host page
            requiredFields["full_name"] = document.getElementById("full_name").value;
            requiredFields["month"] = document.getElementById("month").value;
            requiredFields["year"] = document.getElementById("year").value;

            Spreedly.tokenizeCreditCard(requiredFields);
        };

        //When users submits order form
        $scope.submitOrder = function () {
            console.log("Order Submit", $scope.order);

            $scope.submitting = true;

            $scope.order.save(function () {
                $scope.submitting = false;

                if ($scope.order.persisted()) {
                    console.log("Order save was success");
                } else {
                    console.log("Order save was not a success");
                    console.log("ORDER ERRORS", $scope.order.errors().toArray());
                    $scope.orderErrors = $scope.order.errors().toArray();
                    $scope.order.removeCharge($scope.creditCard);
                }
                $scope.$apply();
            });
        };

        //Scroll to specified anchor tag
        $scope.scrollToAnchor = function (aid) {
            var aTag = $("a[name='" + aid + "']");
            $('html, body').animate({ scrollTop: aTag.offset().top }, 'slow');
        };

        //Return a readable time portion of a date
        $scope.formatToTime = function (dateString) {
            return moment(dateString).format('LT');
        };

        //Return a readable date portion of a date
        $scope.formatToDate = function (dateString) {
            return moment(dateString).format('MMMM DD, YYYY');
        };

        //Return a readable full datetime
        $scope.formatToFullDatetime = function (dateString) {
            return moment(dateString).format('dddd MMMM Do, YYYY h:mm A');
        };

        //Determine which time of day section this timeSlot belongs in
        $scope.splitByTimeOfDay = function (timeSlot, time) {
            switch (time) {
                case 'morning':
                    return timeSlot.startsAt.hour() < 12;
                case 'afternoon':
                    return timeSlot.startsAt.hour() >= 12 && timeSlot.startsAt.hour() < 18;
                case 'evening':
                    return timeSlot.startsAt.hour() >= 18;
            }
        };
    }] //End Controller
}); //End Component

/***/ }),

/***/ 244:
/***/ (function(module, exports) {

var path = '/Users/nicklandgrebe/dev/StickyBooking/src/components/booking/booking.component.html';
var html = "<main class=\"booking-page-container\">\n\n    <div class=\"loadingAnimation\" ng-if=\"displayLoading\">\n        <span us-spinner=\"{ color: '#fff' }\"></span>\n    </div>\n\n    <div class=\"booking-sidebar\">\n        <h3 class=\"booking-page-photographer-name animated slideInLeft\" ng-if=\"initialDataLoaded\">{{ merchant.name }}</h3>\n        <div ng-if=\"order.persisted()\">\n            <div class=\"booking-page-welcome-message animated slideInUp\">\n                <p>Hello {{ order.customer().firstName }}, thanks for your purchase!</p>\n                <p ng-if=\"product.postTransactionalMessage\"><br/>{{ product.postTransactionalMessage }}</p>\n            </div>\n            <ol class=\"booking-process animated slideInUp\" id=\"booking-process-status\">\n                <li class=\"booking-step booking-step-green booking-step-complete\">Order Complete</li>\n            </ol>\n        </div>\n        <div ng-if=\"!order.persisted()\">\n            <div class=\"booking-page-welcome-message animated slideInLeft\" ng-if=\"initialDataLoaded\">\n                <ng-bind-html ng-bind-html=\"product.description\"></ng-bind-html>\n            </div>\n            <ol class=\"booking-process animated slideInLeft\" id=\"booking-process-status\" ng-if=\"initialDataLoaded\">\n                <li class=\"booking-step-1 booking-step\">Get Started</li>\n                <li class=\"booking-step-2 booking-step\">Select a Date</li>\n                <li class=\"booking-step-3 booking-step\">Select a Time</li>\n                <li class=\"booking-step-4 booking-step\">Your Information</li>\n            </ol>\n        </div>\n    </div>\n  \n    <div class=\"booking-content\">\n        <div ng-if=\"order.persisted()\" class=\"pane-order-complete animated fadeInUp\">\n            <h3>Order #{{ order.verificationCode }}</h3>\n            <hr>\n            <h4>{{ formatToFullDatetime(order.timeSlots().target().first().startsAt) }}</h4>\n            <p>An order confirmation email with receipt has been sent to {{ order.customer().email }}.</p>\n            <br/>\n            <div class=\"alert priceTable\" ng-if='!product.free' ng-class=\"{ 'alert-warning': psp == 'cash', 'alert-success': psp != 'cash' }\">\n                <div ng-if=\"psp == 'cash'\">\n                    <strong>No payment required now. Payment will be collected at the venue.</strong>\n                    <br><br>\n                </div>\n                <table>\n                    <tr ng-if=\"order.subtotal != order.total\">\n                        <td>Subtotal:</td>\n                        <td>{{ order.subtotal | currency:merchant.currency().code }}</td>\n                    </tr>\n                    <tr ng-if=\"order.tax != 0 && order.tax != null\">\n                        <td>Tax:</td>\n                        <td>{{ order.tax | currency:merchant.currency().code }}</td>\n                    </tr>\n                    <tr ng-if=\"order.couponAmount != null\">\n                        <td>Discount:</td>\n                        <td>-{{ order.couponAmount | currency:merchant.currency().code }}</td>\n                    </tr>\n                    <tr ng-class=\"{ 'borderTop': order.subtotal != order.total }\">\n                        <td><strong>Total:</strong></td>\n                        <td>{{ order.total | currency:merchant.currency().code }}</td>\n                    </tr>\n                    <tr ng-if=\"order.outstandingBalance != order.total\">\n                        <td>Balance due:</td>\n                        <td>{{ order.outstandingBalance | currency:merchant.currency().code }}</td>\n                    </tr>\n                </table>\n            </div>\n        </div>\n        <div ng-if=\"!order.persisted()\">\n            <!--Get Started section -->\n            <div class=\"booking-page-hero\" style=\"background-image: url('{{ product.image.url }}');\">\n                <div class=\"booking-page-hero-content animated slideInRight\" ng-if=\"initialDataLoaded\">\n                    <h6 class=\"get-started-title\">Get Started</h6>\n                    <h1 class=\"page-title\">{{ product.title }}</h1>\n                    <button class=\"get-started animated tada infinite\" ng-click=\"getStarted()\">{{ product.orderButtonText }}</button>\n                </div>\n            </div>\n\n            <!-- Calendar pane -->\n            <a name=\"step-1-scroller\"></a>\n            <div class=\"pane-calendar\" id=\"step-2\" style=\"display:none;\">\n                <div class=\"row\">\n                    <div class=\"col-md-6\">\n                        <h6>Availability</h6>\n                        <h3>Select a date on the calendar below to view availability:</h3>\n                    </div>\n                </div>\n                <hr />\n\n                <booking-calendar></booking-calendar>\n            </div>\n\n            <!-- available times-->\n            <a name=\"time-slot-scroll\"></a>\n            <div class=\"available-times clearfix\" style=\"display:none;\">\n                <div class=\"col-md-12\">\n                    <h6>Available Time Slots</h6>\n                    <h3>Select a time slot on {{ formatToDate(selectedDate) }} to continue booking:</h3>\n                    <hr />\n                </div>\n                <div class=\"col-md-4 time-slot-buttons\">\n                    <h6>Morning</h6>\n                    <button class=\"btn btn-primary time-slot\"\n                            ng-repeat=\"timeSlot in availableSlots.toArray()\"\n                            ng-if=\"splitByTimeOfDay(timeSlot, 'morning')\"\n                            ng-click=\"onTimeSlotSelection($event, timeSlot)\"\n                            ng-class='{ \"time-slot-active\": isActiveTimeSlot(timeSlot) }'>\n\n                        {{ formatToTime(timeSlot.startsAt) }}\n                    </button>\n                </div>\n                <div class=\"col-md-4 time-slot-buttons\">\n                    <h6>Afternoon</h6>\n                    <button class=\"btn btn-primary time-slot\"\n                            ng-repeat=\"timeSlot in availableSlots.toArray()\"\n                            ng-if=\"splitByTimeOfDay(timeSlot, 'afternoon')\"\n                            ng-click=\"onTimeSlotSelection($event, timeSlot)\"\n                            ng-class='{ \"time-slot-active\": isActiveTimeSlot(timeSlot) }'>\n\n                        {{ formatToTime(timeSlot.startsAt) }}\n                    </button>\n                </div>\n                <div class=\"col-md-4 time-slot-buttons\">\n                    <h6>Evening</h6>\n                    <button class=\"btn btn-primary time-slot\"\n                            ng-repeat=\"timeSlot in availableSlots.toArray()\"\n                            ng-if=\"splitByTimeOfDay(timeSlot, 'evening')\"\n                            ng-click=\"onTimeSlotSelection($event, timeSlot)\"\n                            ng-class='{ \"time-slot-active\": isActiveTimeSlot(timeSlot) }'>\n\n                        {{ formatToTime(timeSlot.startsAt) }}\n                    </button>\n                </div>\n            </div>\n\n            <!--Customer information pane -->\n            <a name=\"customer-info-pane-scroller\"></a>\n            <div class=\"pane-customer-information\" style=\"display:none;\" ng-if=\"orderLoaded\">\n                <h6>Your Info</h6>\n                <h3>We need to collect some information from you to confirm booking:</h3>\n                <hr />\n\n                <!-- Question Form -->\n                <form id=\"questionForm\" ng-submit=\"submitPaymentForms($event)\">\n                    <!-- Static Questions, Always Required -->\n                    <div class=\"form-group\">\n                        <label class=\"control-label\" for=\"order_customer_email\">First Name*</label>\n                        <input id=\"lastName\" placeholder=\"First Name\" required=\"required\" type=\"text\" ng-model=\"order.customer().firstName\" name=\"firstName\"\n                            class=\"form-control\" autofocus><span class=\"message\"></span>\n                    </div>\n                    <div class=\"form-group\">\n                        <label class=\"control-label\" for=\"order_customer_email\">Last Name*</label>\n                        <input id=\"firstName\" placeholder=\"Last Name\" required=\"required\" type=\"text\" ng-model=\"order.customer().lastName\" name=\"lastName\"\n                            class=\"form-control\"><span class=\"message\"></span>\n                    </div>\n                    <div class=\"form-group\">\n                        <label class=\"control-label\" for=\"order_customer_email\">E-mail Address*</label>\n                        <input id=\"email\" placeholder=\"E-mail\" required=\"required\" type=\"email\" ng-model=\"order.customer().email\" name=\"email\" class=\"form-control\">\n                        <span class=\"message\"></span>\n                    </div>\n                    <div class=\"form-group\">\n                        <label class=\"control-label\" for=\"order_customer_email\">Zip Code*</label>\n                        <input id=\"zip\" placeholder=\"Zip Code\" required=\"required\" type=\"text\" ng-model=\"order.customer().zip\" name=\"zip\" class=\"form-control\">\n                        <span class=\"message\"></span>\n                    </div>\n                    <!-- End of Static Questions -->\n\n                    <!-- Dynamic Questions, Set by Merchant -->\n                    <div ng-repeat=\"(index, answer) in order.answers().target().toArray()\">\n                        <div class=\"form-group\" ng-if=\"answer.question().formControl != 'separator'\">\n                            <label ng-if=\"answer.question().formControl == 'text_input' || answer.question().formControl == 'text_area' || answer.question().formControl == 'option_list' || answer.question().formControl == 'drop_down'\">\n                                {{ answer.question().title }}<span ng-if='answer.question().required'>*</span>\n                            </label>\n                            <!-- Render different from control based on answer.question.formControl type -->\n                            <!-- Text Input -->\n                            <input class=\"form-control\"\n                                   ng-if=\"answer.question().formControl == 'text_input'\"\n                                   ng-model=\"answer.value\"\n                                   ng-required=\"answer.question().required\"\n                                   placeholder=\"{{ answer.question().title }}\"\n                            />\n                            <!-- Text Area -->\n                            <textarea class=\"form-control\" rows=\"4\"\n                                      ng-if=\"answer.question().formControl == 'text_area'\"\n                                      ng-model=\"answer.value\"\n                                      ng-required=\"answer.question().required\"\n                                      placeholder=\"Your Response\">\n                            </textarea>\n                            <!-- Option List -->\n                            <div ng-if=\"answer.question().formControl == 'option_list'\">\n                                <span class=\"invisible\"\n                                      ng-init=\"optionsHolder[answer.question().id] = defaultOptionFor(answer.question()); optionableQuestionChanged(answer, optionsHolder[answer.question().id])\">\n                                </span>\n                                <label class=\"clickable-label\"\n                                       ng-repeat=\"option in answer.question().options().target().toArray()\">\n                                    <input class=\"question-radio\" type=\"radio\"\n                                           name=\"{{answer.question().id}}\"\n                                           ng-value=\"option\"\n                                           ng-model=\"optionsHolder[answer.question().id]\"\n                                           ng-change=\"optionableQuestionChanged(answer, optionsHolder[answer.question().id])\" />\n\n                                    {{ titleForOption(option) }}\n                                </label>\n                            </div>\n                            <!-- Drop Down -->\n                            <select class=\"form-control\"\n                                    ng-if=\"answer.question().formControl == 'drop_down'\"\n                                    ng-model=\"optionsHolder[answer.question().id]\"\n                                    ng-change=\"optionableQuestionChanged(answer, optionsHolder[answer.question().id])\"\n                                    ng-options=\"option as titleForOption(option) for option in answer.question().options().target().toArray()\"\n                                    ng-init=\"optionsHolder[answer.question().id] = defaultOptionFor(answer.question()); optionableQuestionChanged(answer, optionsHolder[answer.question().id])\">\n\n                                <option value=\"\">-- Please select --</option>\n                            </select>\n                            <!-- Spin Button -->\n                            <div ng-if=\"answer.question().formControl == 'spin_button'\">\n                                <label>\n                                    <span>{{ titleForSpinButton(answer) }}</span>\n                                    <span ng-if='answer.question().required'>*</span>\n                                </label>\n                                <ul class=\"spinner-input list-inline\">\n                                    <li>\n                                        <input class=\"form-control value-input\" readonly=\"\"\n                                               ng-model=\"answer.value\"\n                                               ng-init=\"answer.value = answer.question().min\" />\n                                    </li>\n                                    <li>\n                                        <div class=\"btn-group btn-group-lg\">\n                                            <button type=\"button\" class=\"btn btn-info update-price stepper-minus\"\n                                                    ng-click=\"answer.value = answer.value - 1; answerChanged(answer)\"\n                                                    ng-disabled=\"answer.value == answer.question().min\">\n                                                -\n                                            </button>\n                                            <button type=\"button\" class=\"btn btn-info update-price stepper-plus\"\n                                                    ng-click=\"answer.value = answer.value + 1; answerChanged(answer)\"\n                                                    ng-disabled=\"answer.value >= answer.question().max\">\n                                                +\n                                            </button>\n                                        </div>\n                                    </li>\n                                </ul>\n                            </div>\n                            <!-- Checkbox && Waiver -->\n                            <div ng-if=\"answer.question().formControl == 'checkbox' || answer.question().formControl == 'waiver'\">\n                                <div class=\"well well-sm waiver\" ng-if=\"answer.question().formControl == 'waiver'\">\n                                    <ng-bind-html ng-bind-html=\"answer.question().waiverText\">\n                                    </ng-bind-html>\n                                </div>\n\n                                <label class=\"clickable-label\">\n                                    <input class=\"question-checkbox\" type=\"checkbox\"\n                                           ng-model=\"answer.value\"\n                                           ng-change=\"answerChanged(answer)\"\n                                           ng-required=\"answer.question().required || answer.question().formControl == 'waiver'\"\n                                           ng-init=\"answer.value = false\" />\n\n                                    <span>{{ titleForCheckbox(answer.question()) }}</span>\n                                    <span ng-if=\"answer.question().required || answer.question().formControl == 'waiver'\">*</span>\n                                </label>\n                            </div>\n                            <!-- Text Output -->\n                            <h3 class=\"question-text-output\" ng-if=\"answer.question().formControl == 'text_output' && answer.question().displayAsTitle\">{{ answer.question().title }}</h3>\n                            <p  class=\"question-text-output\" ng-if=\"answer.question().formControl == 'text_output' && !answer.question().displayAsTitle\">{{ answer.question().title }}</p>\n                        </div>\n                        <hr ng-if=\"answer.question().formControl == 'separator'\">\n                    </div>\n                    <!-- End of Dynamic Questions -->\n\n\n                    <!-- Price Table -->\n                    <div class=\"alert priceTable\" ng-if='requiresPaymentForms()' ng-class=\"{ 'alert-warning': psp == 'cash', 'alert-success': psp != 'cash' }\">\n                        <div ng-if=\"psp == 'cash'\">\n                            <strong>No payment required now. Payment will be collected at the venue.</strong>\n                            <br><br>\n                        </div>\n                        <table>\n                            <tr ng-if=\"order.subtotal != order.total\">\n                                <td>Subtotal:</td>\n                                <td>{{ order.subtotal | currency:merchant.currency().code }}</td>\n                            </tr>\n                            <tr ng-if=\"order.tax != 0 && order.tax != null\">\n                                <td>Tax:</td>\n                                <td>{{ order.tax | currency:merchant.currency().code }}</td>\n                            </tr>\n                            <tr ng-if=\"order.couponAmount != null\">\n                                <td>Discount:</td>\n                                <td>-{{ order.couponAmount | currency:merchant.currency().code }}</td>\n                            </tr>\n                            <tr ng-class=\"{ 'borderTop': order.subtotal != order.total }\">\n                                <td><strong>Total:</strong></td>\n                                <td>{{ order.total | currency:merchant.currency().code }}</td>\n                            </tr>\n                            <tr ng-if=\"order.outstandingBalance != order.total\">\n                                <td>Balance due:</td>\n                                <td>{{ order.outstandingBalance | currency:merchant.currency().code }}</td>\n                            </tr>\n                        </table>\n                    </div>\n                    <!-- End Price Table -->\n                    <!-- Redeemables Section -->\n                    <div id=\"redeemables\" ng-if=\"product.hasRedeemables && requiresPaymentForms()\">\n                        <br><br>\n                        <h3>Gift Cards & Coupons</h3>\n                        <hr>\n\n                        <div class=\"form-group hasButton\">\n                            <label class=\"control-label\" for=\"redeemableInput\">Gift Card Number or Coupon Code</label>\n                            <input type=\"text\" id=\"redeemableInput\" name=\"redeemableInput\" class=\"form-control\" placeholder=\"Gift Card Number or Coupon Code\" ng-model=\"redeemableInput\" />\n                            <input type=\"button\" class=\"btn-primary btn\" ng-if=\"activeRedeemable == null\" value=\"Check\" ng-click=\"checkRedeemable()\" />\n                            <input type=\"button\" class=\"btn-danger btn\" ng-if=\"activeRedeemable != null\" value=\"Remove\" ng-click=\"removeRedeemable()\" />\n                            <p class=\"appliedStatus\" ng-if=\"redeemableStatus != null\">{{ redeemableStatus }}</p>\n                            <p class=\"appliedError\" ng-if=\"redeemableError != null\">{{ redeemableError }}</p>\n                        </div>\n                    </div>\n                    <!-- End Redeemables Section -->\n\n                    <!-- Checkout Forms -->\n                    <div ng-if='requiresPaymentForms()'>\n\n                        <!-- Spreedly Checkout Form -->\n                        <div id=\"payment-form\" class=\"ccForm\" ng-if=\"psp == 'spreedly'\">\n                            <h3>Pay with Card</h3>\n                            <hr>\n\n                            <input type=\"hidden\" name=\"payment_method_token\" id=\"payment_method_token\">\n\n                            <div class=\"form-group\">\n                                <label class=\"control-label\" for=\"full_name\">Name On Card</label>\n                                <input type=\"text\" id=\"full_name\" name=\"full_name\" class=\"form-control\" placeholder=\"Name On Card\">\n                            </div>\n\n                            <div class=\"form-group\">\n                                <label class=\"control-label\">Credit Card Number</label>\n                                <div id=\"spreedly-number\" class=\"spreedly-input\"></div>\n                            </div>\n\n                            <div class=\"form-group\">\n                                <label class=\"control-label\" for=\"spreedly-exp-month\">Expiration Date</label>\n                                <input type=\"text\" id=\"month\" name=\"month\" maxlength=\"2\" class=\"form-control\" placeholder=\"MM\">\n                                <input type=\"text\" id=\"year\" name=\"year\" maxlength=\"4\" class=\"form-control\" placeholder=\"YYYY\">\n                            </div>\n\n                            <div class=\"form-group\">\n                                <label class=\"control-label\">CVV</label>\n                                <div id=\"spreedly-cvv\" class=\"spreedly-input\"></div>\n                            </div>\n                        </div>\n                        <!-- End Spreedly Checkout Form -->\n\n                        <!-- Square Checkout Form -->\n                        <div id=\"sq-ccbox\" ng-if=\"psp == 'square'\">\n                            <h3>Pay with Card</h3>\n                            <hr>\n\n                            <div class=\"form-group\">\n                                <label class=\"control-label\">Card Number:</label>\n                                <div id=\"sq-card-number\"></div>\n                            </div>\n\n                            <div class=\"form-group\">\n                                <label class=\"control-label\">CVV:</label>\n                                <div id=\"sq-cvv\"></div>\n                            </div>\n\n                            <div class=\"form-group\">\n                                <label class=\"control-label\">Expiration Date:</label>\n                                <div id=\"sq-expiration-date\"></div>\n                            </div>\n\n                            <div class=\"form-group\">\n                                <label class=\"control-label\">Postal Code:</label>\n                                <div id=\"sq-postal-code\"></div>\n                            </div>\n\n                            <input type=\"hidden\" id=\"card-nonce\" name=\"nonce\">\n                        </div>\n                        <div id=\"sq-walletbox\" ng-if=\"psp == 'square'\">\n                            <div id=\"sq-apple-pay-label\" class=\"wallet-not-enabled\">Apple Pay for Web not enabled</div>\n                            <!-- Placholder for Apple Pay for Web button -->\n                            <button id=\"sq-apple-pay\" class=\"button-apple-pay\"></button>\n\n                            <div id=\"sq-masterpass-label\" class=\"wallet-not-enabled\">Masterpass not enabled</div>\n                            <!-- Placholder for Masterpass button -->\n                            <button id=\"sq-masterpass\" class=\"button-masterpass\"></button>\n                        </div>\n                        <!-- End Square Checkout Form -->\n                    </div>\n                    <!-- End Checkout Forms -->\n\n                    <!-- Errors Section -->\n                    <div class=\"alert alert-danger\" ng-if=\"orderErrors != null && orderErrors.length > 0\">\n                        <h4>There were issues with your order:</h4>\n                        <ul>\n                            <li ng-repeat=\"(errorIndex, errorValue) in orderErrors\">{{ errorValue.message }}</li>\n                        </ul>\n                    </div>\n                    <!-- End Errors Section -->\n\n                    <!-- Order Submit -->\n                    <div class=\"form-submit\">\n                        <button type=\"submit\" ng-disabled='submitting' class=\"btn-primary btn animated pulse infinite finishButton\">\n                            <span ng-if=\"!submitting\">{{product.orderButtonText}}</span>\n                            <span ng-if=\"submitting\" style=\"width: 30px; height: 30px;\" us-spinner=\"{ color: '#8e93a8' }\"></span>\n                        </button>\n                    </div>\n                    <!-- End Order Submit -->\n\n                </form>\n                <!-- End Question Form -->\n        </div>\n    </div>\n</main>";
window.angular.module('ng').run(['$templateCache', function(c) { c.put(path, html) }]);
module.exports = path;

/***/ }),

/***/ 245:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var angular = __webpack_require__(5);
var moment = __webpack_require__(0);

var _require = __webpack_require__(160),
    extendMoment = _require.extendMoment;

var _ = __webpack_require__(4);
var templateUrl = __webpack_require__(246);

// add moment-range
moment = extendMoment(moment);

//Creating bookingCalendar component on the StickyBooking Module
angular.module('StickyBooking').component('bookingCalendar', {
    templateUrl: templateUrl,
    controller: ['$scope', 'occasionSDKService', function controller($scope, occasionSDKService) {
        $scope.setTimeSlotsForMonth = function (month, timeSlots) {
            $scope.timeSlotsByMonth[month.format('MM-YYYY')] = timeSlots;
        };

        $scope.getTimeSlotsForMonth = function (month) {
            return $scope.timeSlotsByMonth[month.format('MM-YYYY')];
        };

        this.$onInit = function () {
            console.log("Calendar Component Init");
            $scope.calendarWeeks = {};
            $scope.timeSlotsByMonth = {};

            //Set starting month and year for the calendar to display
            $scope.activeCalendarMonth = moment().startOf('month');

            $scope.$on('timeSlotDataLoaded', function (event, data) {
                $scope.merchant = data.merchant;
                $scope.product = data.product;
                $scope.setTimeSlotsForMonth($scope.activeCalendarMonth, data.timeSlots);
            });
        };

        // Constructs rows of weeks starting on Sunday and ending on Saturday, for display as a calendar
        // Each cell of the calendar is a Moment.js date corresponding to that day
        $scope.getCalendarWeeksForMonth = function (month) {
            if (!$scope.calendarWeeks[month.format('MM-YYYY')]) {
                var startDate = moment(month).startOf('month').startOf('week');
                var endDate = moment(month).endOf('month').endOf('week');

                var weeks = [];
                var currentWeek = 0;
                _.each(Array.from(moment.range(startDate, endDate).by('days')), function (moment) {
                    if (moment.day() == 0) {
                        weeks[currentWeek] = [moment];
                    } else {
                        weeks[currentWeek].push(moment);
                    }

                    if (moment.day() == 6) {
                        currentWeek++;
                    }
                });

                $scope.calendarWeeks[month.format('MM-YYYY')] = weeks;
            }

            return $scope.calendarWeeks[month.format('MM-YYYY')];
        };

        //Moves the activeCalendar month forward to display the next month
        $scope.moveMonthAhead = function () {
            var nextMonth = moment($scope.activeCalendarMonth).add(1, 'month');

            if (!_.has($scope.timeSlotsByMonth, nextMonth.format('MM-YYYY'))) {
                $scope.getNewTimeSlots(nextMonth).then(function () {
                    $scope.activeCalendarMonth = nextMonth;
                    $scope.$apply();
                });
            } else {
                $scope.activeCalendarMonth = nextMonth;
            }
        };

        //Moves the activeCalendar month back to display the previous month
        $scope.moveMonthBack = function () {
            $scope.activeCalendarMonth.subtract(1, 'month');
        };

        //Gets new month of time slots on month change
        $scope.getNewTimeSlots = function (month) {
            $scope.$emit('startLoading');

            return occasionSDKService.getTimeSlotsByMonth($scope.product, month).then(function (newTimeSlots) {
                console.log("Time slots by month", newTimeSlots);
                $scope.setTimeSlotsForMonth(month, newTimeSlots);
                $scope.$emit('stopLoading');
            }).catch(function (error) {
                return console.log("Error", error);
            });
        };

        //Evaluates what classes should be applied to the date to distinguish availability
        $scope.getDisplayClassForDay = function (day) {
            if (day.isBefore($scope.activeCalendarMonth) || day.isAfter(moment($scope.activeCalendarMonth).endOf('month'))) {
                return 'empty-date';
            } else if (day.isBefore(moment(), 'day')) {
                return 'unavailable-day';
            } else {
                var timeSlotForDay = $scope.getTimeSlotsForMonth($scope.activeCalendarMonth).detect(function (timeSlot) {
                    return day.isSame(timeSlot.startsAt, 'day');
                });

                if (!_.isUndefined(timeSlotForDay)) {
                    var str = 'available-time-slot';
                    if ($scope.selectedDate && $scope.selectedDate.isSame(day, 'day')) {
                        str += ' selected-date';
                    }

                    return str;
                } else {
                    return 'unavailable-day';
                }
            }
        };

        //When date is selected from calendar
        $scope.onDateSelection = function (day) {
            if ($scope.getDisplayClassForDay(day) == 'available-time-slot') {
                $scope.selectedDate = day;

                $('.available-times').fadeIn();
                $scope.scrollToAnchor('time-slot-scroll');
                $("#booking-process-status .booking-step-1").addClass("booking-step-complete").removeClass("booking-step-active");
                $("#booking-process-status .booking-step-2").addClass("booking-step-active");
                $("#booking-process-status .booking-step-2").addClass("booking-step-complete").removeClass("booking-step-active");
                $("#booking-process-status .booking-step-3").addClass("booking-step-active");

                var availableTimeSlotsForDay = $scope.getTimeSlotsForMonth($scope.activeCalendarMonth).select(function (timeSlot) {
                    return timeSlot.startsAt.isSame(day, 'day');
                });

                $scope.$emit('dateSelectedEvent', {
                    selectedDate: $scope.selectedDate,
                    availableTimeSlots: availableTimeSlotsForDay
                });
            }
        };

        //Scroll to specified anchor tag
        $scope.scrollToAnchor = function (aid) {
            var aTag = $("a[name='" + aid + "']");
            $('html, body').animate({ scrollTop: aTag.offset().top }, 'slow');
        };
    }] //End Controller

}); //End Component

/***/ }),

/***/ 246:
/***/ (function(module, exports) {

var path = '/Users/nicklandgrebe/dev/StickyBooking/src/components/calendar/calendar.component.html';
var html = "<div ng-if='getTimeSlotsForMonth(activeCalendarMonth)'>\n    <div class=\"row month-navigator\">\n        <div class=\"col-xs-3\">\n            <a class=\"btn btn-default\" ng-click=\"moveMonthBack()\"><i class=\"fa fa-arrow-left\" aria-hidden=\"true\"></i></a>\n        </div>\n        <div class=\"col-xs-6 text-center\">\n            <h6>{{ activeCalendarMonth.format('MMMM YYYY') }}</h6>\n        </div>\n        <div class=\"col-xs-3 text-right\">\n            <a class=\"btn btn-default\" ng-click=\"moveMonthAhead()\"><i class=\"fa fa-arrow-right\" aria-hidden=\"true\"></i></a>\n        </div>\n    </div>\n    <table class=\"calendar-table\">\n        <thead>\n        <tr>\n            <td>S</td>\n            <td>M</td>\n            <td>T</td>\n            <td>W</td>\n            <td>T</td>\n            <td>F</td>\n            <td>S</td>\n        </tr>\n        </thead>\n        <tr></tr>\n        <tr class=\"calendar-dates\" ng-repeat=\"(weekIndex, week) in getCalendarWeeksForMonth(activeCalendarMonth)\">\n            <td ng-repeat=\"day in week\" class=\"{{ getDisplayClassForDay(day) }}\" ng-click=\"onDateSelection(day)\">\n                <span class=\"date\">\n                    {{ day.date() }}\n                </span>\n            </td>\n        </tr>\n    </table>\n</div>";
window.angular.module('ng').run(['$templateCache', function(c) { c.put(path, html) }]);
module.exports = path;

/***/ }),

/***/ 247:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var ActiveResource = __webpack_require__(7);
var angular = __webpack_require__(5);
var moment = __webpack_require__(0);
var Occasion = __webpack_require__(161);

angular.module('StickyBooking').factory('occasionSDKService', function () {
    var _this = this;

    console.log("SDK Service Init");

    //Private Variables
    this.occsnKey = window.OCCSN.api_key;
    this.myMerchant;

    var options = { token: this.occsnKey };

    var url = window.OCCSN.host_url;
    if (url != undefined) {
        options.baseUrl = ActiveResource.prototype.Links.__constructLink(url, 'api', 'v1');
    }

    //Create Connection to Occasion SDK using Merchant API Key
    this.occsn = new Occasion.Client(options);

    this.occsn.TimeSlot.afterRequest(function () {
        this.startsAt = moment(this.startsAt);
    });

    //Private Promises
    this.queryMyMerchant = new Promise(function (resolve, reject) {
        _this.occsn.Merchant.includes('currency').first().then(function (merchant) {
            resolve(merchant);
        }).catch(function (error) {
            return reject(error);
        });
    });

    this.queryMyVenues = new Promise(function (resolve, reject) {
        _this.myMerchant.venues().all().then(function (venues) {
            return resolve(venues);
        }).catch(function (error) {
            return reject(error);
        });
    });

    this.queryMyProducts = new Promise(function (resolve, reject) {
        _this.myMerchant.products().all().then(function (products) {
            return resolve(products);
        }).catch(function (error) {
            return reject(error);
        });
    });

    //Private Functions
    this.queryTimeSlotsByMonth = function (product, month) {
        var today = moment();
        var lowerRange = month.isSame(today, 'month') ? today : month;
        var upperRange = lowerRange.clone().endOf('month');

        // make between 1-4 parallel requests (about 7 days per request)
        var numRequests = Math.min(4, Math.ceil(upperRange.diff(lowerRange, 'days') / 7));
        if (numRequests < 1) numRequests = 1;

        var i = 0;
        var requests = [];

        var lower = lowerRange.clone();
        var upper = lowerRange.clone().add(7, 'days');
        while (i < numRequests) {
            if (i + 1 == numRequests) upper = upperRange;

            requests.push(product.timeSlots().where({
                startsAt: {
                    ge: lower.toDate(),
                    le: upper.toDate()
                },
                status: 'bookable'
            }).all());

            lower.add(7, 'days');
            upper.add(7, 'days');
            i++;
        }

        return Promise.all(requests).then(function (timeSlotsArray) {
            return ActiveResource.prototype.Collection.build(timeSlotsArray).map(function (ts) {
                return ts.toArray();
            }).flatten();
        });
    };

    this.queryProductById = function (id) {
        return new Promise(function (resolve, reject) {
            _this.queryMyMerchant.then(function (merchant) {
                merchant.products().find(id).then(function (product) {
                    return resolve(product);
                }).catch(function (error) {
                    return reject(error);
                });
            });
        });
    };

    this.queryToCreateOrderForProduct = function (product) {
        return new Promise(function (resolve, reject) {
            _this.occsn.Order.construct({ product: product }).then(function (order) {
                return resolve(order);
            }).catch(function (error) {
                return reject(error);
            });
        });
    };

    this.queryBuildCard = function (token) {
        return _this.occsn.CreditCard.build({ id: token });
    };

    this.queryRedeemableType = function (redeemable) {
        if (redeemable.isA(_this.occsn.Coupon)) return 'coupon';
        if (redeemable.isA(_this.occsn.GiftCard)) return 'card';
    };

    //Set merchant variable locally
    this.queryMyMerchant.then(function (merchant) {
        return _this.myMerchant = merchant;
    });

    //Return Public Member Variables and Functions
    return {
        getMyMerchant: function getMyMerchant() {
            return _this.queryMyMerchant;
        },
        getMyVenues: function getMyVenues() {
            return _this.queryMyVenues;
        },
        getMyProducts: function getMyProducts() {
            return _this.queryMyProducts;
        },
        getProductById: function getProductById(id) {
            return _this.queryProductById(id);
        },
        getTimeSlotsByMonth: function getTimeSlotsByMonth(product, month) {
            return _this.queryTimeSlotsByMonth(product, month);
        },
        getTimeSlotsForProduct: function getTimeSlotsForProduct(product) {
            return _this.queryTimeSlotsForProduct(product);
        },
        getNextTimeSlotsPage: function getNextTimeSlotsPage(timeSlots) {
            return _this.queryNextTimeSlotsPage(timeSlots);
        },
        createOrderForProduct: function createOrderForProduct(product) {
            return _this.queryToCreateOrderForProduct(product);
        },
        buildCard: function buildCard(token) {
            return _this.queryBuildCard(token);
        },
        redeemableType: function redeemableType(redeemable) {
            return _this.queryRedeemableType(redeemable);
        }
    };
});

/***/ })

},[241]);