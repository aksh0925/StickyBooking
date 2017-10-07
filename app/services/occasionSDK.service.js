//Function to be called when dependencies are loaded and the angular application may begin running
let initializeSDKService = function(){

    //Occasion SDK Service
    angular.module('StickyBooking').factory('occasionSDKService', () => {

        //Private Variables
        this.occsnKey = '463436b5ebf74b42873aaa544801f91a';
        this.myMerchant;

        //Create Connection to Occasion SDK using Merchant API Key
        this.occsn = new Occasion.Client(occsnKey);

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
        this.queryTimeSlotsForProduct = (product) => {
            return new Promise( (resolve, reject) => {
                this.queryMyMerchant
                    .then( (merchant) => {
                        merchant.products().find(product.id)
                        .then( (product) => {
                            product.timeSlots().where({ status: 'bookable' }).all()
                            .then( (timeSlots) => resolve(timeSlots) )
                            .catch( (error) => reject(error) );
                        })
                    });
            });
        };

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
            getTimeSlotsForProduct: (product) => {
                return this.queryTimeSlotsForProduct(product);
            },
            createOrderForProduct: (product) => {
                return this.queryToCreateOrderForProduct(product);
            }
        }

    });
}

