// Grey Matter App

var app = angular.module('greyMatter',
  ['ionic','ionic.service.core',  'ionic.service.push', 'auth0', 'angular-storage', 'angular-jwt', 'underscore',
    'angularMoment', 'ionic-timepicker', 'btford.socket-io', 'ngAnimate', 'ngCordova'])

  .run(function ($ionicPlatform, $rootScope, $window, $ionicPopup, auth, store, jwtHelper) {
    $ionicPlatform.ready(function () {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        cordova.plugins.Keyboard.disableScroll(true);

      }
      // if (window.StatusBar) {
      //   // org.apache.cordova.statusbar required
      //   StatusBar.styleLightContent();
      // }

    });

    // This hooks all auth events to check everything as soon as the app starts
    auth.hookEvents();

    // This events gets triggered on refresh or URL change
    var refreshingToken = null;
    $rootScope.$on('$locationChangeStart', function () {
      //stop loading screen from showing
      //console.log("$locationChangeStart event triggered. ");
      //tokenRefreshCheck.activateCheckingToken();
      var token = store.get('token');
      //console.log("Regular token: " + token);
      //console.log(token);
      var refreshToken = store.get('refreshToken');
      //console.log("Refresh token: " + token);
      if (token) {
        if (!jwtHelper.isTokenExpired(token)) {
          //console.log("Token expired, getting new token.");
          if (!auth.isAuthenticated) {
            //console.log("User not authenticated, authenticating.");
            auth.authenticate(store.get('profile'), token);
            //tokenRefreshCheck.deactivateCheckingToken();
          }
        } else {
          //console.log("Token is not expired, checking the refresh token.");
          if (refreshToken) {
            //console.log("There is a refresh token.");
            if (refreshingToken === null) {
              //console.log("Getting a new refresh token from auth service.");

              //get a new refresh token
              refreshingToken = auth.refreshIdToken(refreshToken).then(function (idToken) {
                //console.log("Set the new tokens");
                store.set('token', idToken);

                //authenticate using newly acquired token
                auth.authenticate(store.get('profile'), idToken);
              }).finally(function () {
                //console.log("Reset the temporary refreshing token variable");
                refreshingToken = null;
              });
            }
            //tokenRefreshCheck.deactivateCheckingToken();
            return refreshingToken;
          } else {
            //console.log("There is no refresh token available, so asking user to log in again.");
            //tokenRefreshCheck.deactivateCheckingToken();
            $location.path('/login');
          }
        }
      }
    });

// This events gets triggered on refresh or URL change
    refreshingToken = null;
    $rootScope.$on('$locationChangeStart', function () {
      //stop loading screen from showing
      //console.log("$locationChangeStart event triggered. ");
      //tokenRefreshCheck.activateCheckingToken();
      var token = store.get('token');
      //console.log("Regular token: " + token);
      //console.log(token);
      var refreshToken = store.get('refreshToken');
      //console.log("Refresh token: " + token);
      if (token) {
        if (!jwtHelper.isTokenExpired(token)) {
          //console.log("Token expired, getting new token.");
          if (!auth.isAuthenticated) {
            //console.log("User not authenticated, authenticating.");
            auth.authenticate(store.get('profile'), token);
            //tokenRefreshCheck.deactivateCheckingToken();
          }
        } else {
          //console.log("Token is not expired, checking the refresh token.");
          if (refreshToken) {
            //console.log("There is a refresh token.");
            if (refreshingToken === null) {
              //console.log("Getting a new refresh token from auth service.");

              //get a new refresh token
              refreshingToken = auth.refreshIdToken(refreshToken).then(function (idToken) {
                //console.log("Set the new tokens");
                store.set('token', idToken);

                //authenticate using newly acquired token
                auth.authenticate(store.get('profile'), idToken);
              }).finally(function () {
                //console.log("Reset the temporary refreshing token variable");
                refreshingToken = null;
              });
            }
            //tokenRefreshCheck.deactivateCheckingToken();
            return refreshingToken;
          } else {
            //console.log("There is no refresh token available, so asking user to log in again.");
            //tokenRefreshCheck.deactivateCheckingToken();
            $location.path('/login');
          }
        }
      }
    });
  })

  .config(function ($stateProvider, $urlRouterProvider, authProvider, $httpProvider, jwtInterceptorProvider) {

    //AUTH 0 CODE
    //Attempting to configure the use of Auth0
    authProvider.init({
      domain: 'greymatter.eu.auth0.com',
      clientID: 'B4fFBY7OcermBIy5eG0kLZddPBGYjGw3',
      loginState: 'login' // This is the name of the state where you'll show the login, which is defined above...
    });

    //add the auth0 jwt http interceptor
    var refreshingToken = null;
    jwtInterceptorProvider.tokenGetter = function (auth, store, $http, jwtHelper) {
      //notify app that chekcing for refresh token, don't show loader;

      var token = store.get('token');
      //console.log("The regular token is: " + token);
      var refreshToken = store.get('refreshToken');
      //console.log("The refresh token is: " + refreshToken);
      if (token) {
        if (!jwtHelper.isTokenExpired(token)) {
          //tokenRefreshCheck.activateCheckingToken();
          return store.get('token');
        } else {
          //console.log("Attempting to get a refresh token");
          if (refreshingToken === null) {
            refreshingToken = auth.refreshIdToken(refreshToken).then(function (idToken) {
              store.set('token', idToken);
              return idToken;
            }).finally(function () {
              refreshingToken = null;
            });
          }
          return refreshingToken;
        }
      }
    };

    $httpProvider.interceptors.push('jwtInterceptor');

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider

      .state('login', {
        url: '/login',
        templateUrl: './templates/login.html',
        controller: 'LoginCtrl'
      })

      .state('signup-user-type', {
        url: '/signup/user-type',
        templateUrl: 'templates/signup-user-type.html',
        controller: 'SignUpCtrl'
      })

      .state('signup-patient-details', {
        url: '/signup/patient-details',
        templateUrl: 'templates/signup-patient-details.html',
        controller: 'CompletePatientProfileCtrl'
      })

      .state('signup-carer-details', {
        url: '/signup/carer-details',
        templateUrl: 'templates/signup-carer-details.html',
        controller: 'CompleteCarerProfileCtrl'
      })

      .state('signup-connect-patients', {
        url: '/signup/connect-patients',
        templateUrl: 'templates/signup-connect-to-patients.html',
        controller: 'ConnectToPatientsCtrl'
      })

      .state('signup-connect-carers', {
        url: '/signup/connect-carers',
        templateUrl: 'templates/signup-connect-to-carers.html',
        controller: 'ConnectToCarersCtrl'
      })

      // setup an abstract state for the tabs directive
      .state('tab', {
        url: '/tab',
        abstract: true,
        templateUrl: './templates/tabs.html'
      })

      // Each tab has its own nav history stack:

      .state('tab.things', {
        url: '/things',
        views: {
          'tab-things': {
            templateUrl: './templates/tab-things.html',
            controller: 'ThingsCtrl'
          }
        }
      })

      .state('tab.chats', {
        url: '/chats',
        views: {
          'tab-chats': {
            templateUrl: './templates/tab-chats.html',
            controller: 'ChatsCtrl'
          }
        }
      })
      .state('tab.chat-detail', {
        url: '/chats/:recipientId',
        views: {
          'tab-chats': {
            templateUrl: './templates/chat-detail.html'
            //controller: 'ChatDetailCtrl'
          }
        }
      })

      .state('tab.profile', {
        url: '/profile',
        views: {
          'tab-profile': {
            templateUrl: './templates/tab-profile.html',
            controller: 'ProfileCtrl'
          }
        }
      })
      .state('tab.patient-overview', {
        url: '/profile/patient-overview',
        views: {
          'tab-profile': {
            templateUrl: './templates/patient-profile-overview.html',
            controller: 'PatientProfileOverviewCtrl'
          }
        }
      })

      .state('tab.routine', {
        url: '/routine',
        views: {
          'tab-routine': {
            templateUrl: './templates/tab-schedule.html',
            controller: 'ScheduleCtrl'
          }
        }
      })

      .state('tab.locator', {
        url: '/locator',
        views: {
          'tab-locator': {
            templateUrl: './templates/tab-locator.html',
            controller: 'LocatorCtrl'
          }
        }
      });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/login');

  });
