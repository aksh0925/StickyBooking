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
            return new Promise( (resolve, reject) => {
                var today = moment();
                var lowerRange = month.isSame(today, 'month') ? today : month;
                var upperRange = lowerRange.clone().endOf('month');

                return product.timeSlots().where({
                    startsAt: {
                        ge: lowerRange.toDate(),
                        le: upperRange.toDate()
                    },
                    status: 'bookable'
                }).all()
                    .then( (timeSlots) => resolve(timeSlots) )
                    .catch( (error) => reject(error) );
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
            return occsn.CreditCard.build({ id: token });
        }

        this.queryRedeemableType = (redeemable) => {
            if( redeemable.isA(occsn.Coupon) )
                return 'coupon';
            if( redeemable.isA(occsn.GiftCard) )
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
