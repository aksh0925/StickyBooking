//Function to be called when dependencies are loaded and the angular application may begin running
let initializeAppModule = function () {

    let app = angular.module( 'StickyBooking', [] ).config( function ( $sceProvider ) {
        // Completely disable SCE.  For demonstration purposes only!
        // Do not use in new projects or libraries.
        $sceProvider.enabled( false );
    } );

    app.controller( 'AppController', function ( $scope ) {

        //Runs On Init
        this.$onInit = function () {
            console.log( "App Module Init" );
        }

        $scope.$on( 'initialDataLoaded', function ( event, data ) {
            document.title = data.product.title;
        } );

    } );

}