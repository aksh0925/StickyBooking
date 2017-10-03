var initializeAngular = function(){

    console.log("Initialize Angular Function Ran");

    let OccasionClient = new Occasion.Client('463436b5ebf74b42873aaa544801f91a');

    var app = angular.module('StickyBooking', []);

    app.controller('BookingController', function($scope, $http) {

        //OnInit
        this.$onInit = function(){
            console.log("Angular On Init Function Ran");
        }

        //Function to load field data from database
        $scope.testFunction = function(){
            console.log("Test Function");
        }

    });

}
