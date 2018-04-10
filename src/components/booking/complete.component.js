var angular = require('angular');

var templateUrl = require('./complete.component.nghtml');

//Creating bookingPage component on StickyBooking Module
angular.module('StickyBooking')
.component('completePage', {
  templateUrl: templateUrl,
  bindings: {
    order: '<'
  },
  controller: function CompleteController($scope) {
    this.$onInit = function(){
      $scope.order = this.order;
    };
  }
}); //End Component
