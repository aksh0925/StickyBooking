var ActiveResource = require('active-resource');
var angular = require('angular');
var moment = require('moment');
var Occasion = require('occasion-sdk');

angular.module('StickyBooking')
    .factory('occasionSDKService', function() {
        console.log("SDK Service Init");

        //Private Variables
        this.occsnKey = window.OCCSN.api_key;
        this.myMerchant;

        let options = { token: this.occsnKey };

        let url = window.OCCSN.host_url;
        if(url != undefined) {
            options.baseUrl = ActiveResource.prototype.Links.__constructLink(url, 'api', 'v1');
        }

        //Create Connection to Occasion SDK using Merchant API Key
        this.occsn = new Occasion.Client(options);

        this.occsn.TimeSlot.afterRequest(function() {
            this.startsAt = moment(this.startsAt);
        });

        //Private Promises
        this.queryMyMerchant = new Promise( (resolve, reject) => {
            this.occsn.Merchant.includes('currency').first()
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
        this.queryTimeSlotsByMonth = (product, month) => {
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

        this.queryBuildCard = (token) => {
            return this.occsn.CreditCard.build({ id: token });
        }

        this.queryRedeemableType = (redeemable) => {
            if( redeemable.isA(this.occsn.Coupon) )
                return 'coupon';
            if( redeemable.isA(this.occsn.GiftCard) )
                return 'card';
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
            getTimeSlotsByMonth: (product, month) => {
                return this.queryTimeSlotsByMonth(product, month);
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
            },
            redeemableType: (redeemable) => {
                return this.queryRedeemableType(redeemable);
            }
        }

    });
