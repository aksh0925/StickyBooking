var app = angular.module('StickyBooking', []);

app.controller('BookingController', function($scope, $http) {

    //OnInit
    this.$onInit = function(){
        alert("Hey");
    }

    //Function to load field data from database
    $scope.testFunction = function(){
        alert("there");
    }

});
