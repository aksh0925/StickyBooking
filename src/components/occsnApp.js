var angular = require('angular');
var $ = require('jquery');

var moment = require('moment');
require('moment-timezone');
var _ = require('underscore');

require('../components/booking/booking.component');
require('../components/booking/complete.component');
require('../components/calendar/calendar.component');
require('../services/occasionSDK.service');

var templateUrl = require('./occsnApp.nghtml');

//Creating bookingPage component on StickyBooking Module
angular.module('StickyBooking')
.component('occsnApp', {
  templateUrl: templateUrl,
  controller: function AppController($scope) {
    this.$onInit = function(){
      $scope.$on('initialDataLoaded', function(event, data){
        $scope.merchant = data.merchant;
        $scope.product = data.product;

        document.title = data.product.title;
      });

      $scope.$on('orderDataLoaded', function(event, data){
        $scope.order = data.order;
      });
    };
  } //End Controller
}); //End Component
