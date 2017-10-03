require.onError = function(error) {
    var message = error.requireType + ': ';
    if (error.requireType === 'scripterror' || error.requireType === 'notloaded' && error.requireModules) {
    message += 'Illegal path or script error: ' + '[\'' + error.requireModules.join("', '") + '\']';
    } else {
    message += error.message;
    }
    throw Error(message);
};
require.config({
    "baseUrl": "/",
    "paths": {
    "jquery": '/node_modules/jquery/dist/jquery.min',
    "axios": '/node_modules/axios/dist/axios',
    "qs": '/node_modules/qs/dist/qs',
    "es6-promise": '/node_modules/es6-promise/dist/es6-promise',
    "underscore": '/node_modules/underscore/underscore-min',
    "underscore.string": '/node_modules/underscore.string/dist/underscore.string',
    "underscore.inflection": '/node_modules/underscore.inflection/lib/underscore.inflection',
    "active-resource": '/node_modules/active-resource/dist/active-resource.min',
    "occasion-sdk": '/node_modules/occasion-sdk/dist/occasion-sdk.min',
    "angular": '/node_modules/angular/angular.min'
    }
});
require(['jquery', 'axios', 'qs', 'es6-promise', 'underscore', 'underscore.string', 'underscore.inflection', 'active-resource','occasion-sdk', 'angular'], function() {
    /* scripts loaded */
    console.log("All Require Scripts Loaded");
    initializeAngular();
    initializeMain();
});