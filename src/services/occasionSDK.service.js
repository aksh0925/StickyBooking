var ActiveResource = require('active-resource');
var angular = require('angular');
var moment = require('moment');
var Occasion = require('occasion-sdk');

angular.module('StickyBooking')
    .factory('occasionSDKService', function($q) {
        this.occsnKey = window.OCCSN.api_key;

        let options = { token: this.occsnKey };

        let url = window.OCCSN.host_url;
        if(url != undefined) {
            options.baseUrl = ActiveResource.prototype.Links.__constructLink(url, 'api', 'v1');
        }

        // Create Connection to Occasion SDK using Merchant API Key
        this.occsn = new Occasion.Client(options);

        // Wrap SDK dates in Moment.js objects
        this.occsn.Product.afterRequest(function() {
            if(this.firstTimeSlotStartsAt != null) this.firstTimeSlotStartsAt = moment(this.firstTimeSlotStartsAt);
        });

        this.occsn.TimeSlot.afterRequest(function() {
            this.startsAt = moment(this.startsAt);
        });

        //Private Promises
        this.queryMyMerchant = $q.when(this.occsn.Merchant.includes('currency').first());

        //Private Functions
        this.queryTimeSlotsByMonth = function(product, month) {
            var today = moment();
            var lowerRange = month.isSame(today, 'month') ? today : month;
            var upperRange = lowerRange.clone().endOf('month');

            // make between 1-4 parallel requests (about 7 days per request)
            var numRequests = Math.min(4, Math.ceil(upperRange.diff(lowerRange, 'days') / 7));
            if(numRequests < 1) numRequests = 1;

            var i = 0;
            var requests = [];

            var lower = lowerRange.clone();
            var upper = lowerRange.clone().add(7, 'days');
            while(i < numRequests) {
                if(i + 1 == numRequests) upper = upperRange;

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

            return Promise.all(requests)
            .then(function(timeSlotsArray) {
                return ActiveResource.prototype.Collection
                    .build(timeSlotsArray)
                    .map(function(ts) { return ts.toArray() })
                    .flatten();
            });
        };

        this.queryProductById = function(id) {
            return $q.when(
              this.queryMyMerchant
                .then((merchant) => { return merchant.products().find(id); })
            );
        };

        this.queryToCreateOrderForProduct = function(product) {
            return new $q.when(
                this.occsn.Order.construct({ product: product })
            );
        };

        this.queryBuildCard = function(token) {
            return this.occsn.CreditCard.build({ id: token });
        };

        this.queryRedeemableType = function(redeemable) {
            switch(redeemable.klass()) {
              case this.occsn.Coupon:
                  return 'coupon';
              case this.occsn.GiftCard:
                  return 'card';
            }
        }

        //Return Public Member Variables and Functions
        return {
            getMyMerchant: () => {
                return this.queryMyMerchant;
            },
            getProductById: (id) => {
                return this.queryProductById(id);
            },
            getTimeSlotsByMonth: (product, month) => {
                return this.queryTimeSlotsByMonth(product, month);
            },
            createOrderForProduct: (product) => {
                return this.queryToCreateOrderForProduct(product);
            },
            buildCard: (token) => {
                return this.queryBuildCard(token);
            },
            redeemableType: (redeemable) => {
                return this.queryRedeemableType(redeemable);
            }
        }

    });
