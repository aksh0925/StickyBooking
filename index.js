let initializeAngular = function(){

    let app = angular.module('StickyBooking', []);

    app.controller('BookingController', function($scope, $http) {

        //OnInit
        this.$onInit = function(){
            $scope.occasionClient = new Occasion.Client('463436b5ebf74b42873aaa544801f91a');
            
            $scope.occasionClient.Merchant.first()
                .then((merchant) => {
                    $scope.Merchant = merchant;
                    console.log("Merchant", $scope.Merchant);

                    $scope.Merchant.venues().all()
                        .then((venues) => {
                            $scope.Venues = venues
                            console.log("Venues", $scope.Venues);
                        });

                    $scope.Merchant.products().all()
                        .then((products) => {
                            $scope.Products = products;
                            console.log("Products", $scope.Products);
                        });

                    $scope.Merchant.products().first()
                        .then((product) => {
                            $scope.mainProduct = product;
                            console.log("Main Product", $scope.mainProduct);

                            $scope.occasionClient.Product.includes('merchant', 'venue')
                                .find($scope.mainProduct.id)
                                .then((product) => {
                                    $scope.productWithIncludes = product;
                                    console.log("With Includes", $scope.productWithIncludes);
                                    console.log("OUTPUT", $scope.productWithIncludes.attributes());
                                    console.log("Status", $scope.productWithIncludes.attributes().status);

                                    $scope.occasionClient.Order.construct({ product: $scope.productWithIncludes })
                                        .then((order) => {
                                            console.log("Order created", order);
                                        });
                                });
                        });

                });
        }

        //When date is selected from calendar
        $scope.onDateSelection = function(){
            
        }

    });

}
