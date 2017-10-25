//Function to be called when dependencies are loaded and the angular application may begin running
let initializeAppModule = function(){

    let app = angular.module('StickyBooking', []);

    app.controller('AppController', function($scope){
        
        //Runs On Init
        this.$onInit = function(){}

        $scope.$on('initialDataLoaded', function(event, data){
            document.title = data.product.title;
        });

    });

}