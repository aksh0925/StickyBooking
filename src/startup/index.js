require('babel-polyfill');
var angular = require('angular');

angular.module('StickyBooking', ['angularSpinner', 'ngAnimate', 'ngSanitize'])
  .controller('AppController', function($scope) {
    $scope.$on('initialDataLoaded', function(event, data){
      document.title = data.product.title;
    });
  });

require('../components/booking/booking.component');
require('../components/calendar/calendar.component');
require('../services/occasionSDK.service');
