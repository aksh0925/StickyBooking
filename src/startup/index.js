var angular = require('angular');
require('libs/date-helpers');

angular.module('StickyBooking', [])
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