var ActiveResource = require('active-resource');
var angular = require('angular');
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
