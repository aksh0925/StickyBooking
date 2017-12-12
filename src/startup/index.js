var angular = require('angular');

angular.module('StickyBooking', ['angularSpinner', 'ngSanitize'])
  .controller('AppController', function($scope){

    //Runs On Init
    this.$onInit = function(){
      console.log("App Module Init");
    }

    $scope.$on('initialDataLoaded', function(event, data){
      document.title = data.product.title;
    });

  });

require('../components/booking/booking.component');
require('../components/calendar/calendar.component');
require('../services/occasionSDK.service');