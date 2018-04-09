require('babel-polyfill');
var angular = require('angular');
require('angular-animate');
require('angular-sanitize');
require('angular-spinner');

require('jquery');
require('chosen-js');

require('moment-range');

require('animate.css/animate.css');
require('bootstrap/dist/css/bootstrap.css');

require('../styles/index.scss');

angular.module('StickyBooking', ['angularSpinner', 'ngAnimate', 'ngSanitize'])
  .controller('AppController', function($scope) {
    $scope.$on('initialDataLoaded', function(event, data){
      document.title = data.product.title;
    });
  });

require('../components/booking/booking.component');
require('../components/calendar/calendar.component');
require('../services/occasionSDK.service');
