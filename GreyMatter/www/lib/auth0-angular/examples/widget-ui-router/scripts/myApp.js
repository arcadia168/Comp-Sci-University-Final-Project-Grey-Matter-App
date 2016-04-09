var myApp = angular.module('myApp', [
  'ngCookies', 'auth0', 'ui.router', 'angular-jwt', 'angular-storage'
]);

myApp.config(function ($stateProvider, $urlRouterProvider, $httpProvider,
  authProvider, $locationProvider, jwtInterceptorProvider) {

  // For any unmatched url, redirect to /login
  $urlRouterProvider.otherwise('/');

  // Now set up the states
  $stateProvider
    .state('login', {
      url: '/login',
      controller: 'LoginCtrl'
    })
    .state('signup', {
      url: '/signup',
      controller: 'SignupCtrl'
    })
    .state('reset', {
      url: '/reset',
      controller: 'ResetCtrl'
    })
    .state('logout', {
      url: '/logout',
      controller: 'LogoutCtrl'
    })
    .state('root', {
      url: '/',
      templateUrl: 'views/root.html',
      controller: 'RootCtrl',
      data: {
        requiresLogin: true
      }
    });

  $locationProvider.hashPrefix('!');

  authProvider.init({
    domain: 'samples.auth0.com',
    clientID: 'BUIJSW9x60sIHBw8Kd9EmCbj8eDIFxDC',
    loginUrl: '/login'
  });

  jwtInterceptorProvider.tokenGetter = function(store) {
    return store.get('token');
  };

  // Add a simple interceptor that will fetch all requests and add the jwt token to its authorization header.
  // NOTE: in case you are calling APIs which expect a token signed with a different secret, you might
  // want to check the delegation-token example
  $httpProvider.interceptors.push('jwtInterceptor');
}).run(function($rootScope, auth, store, jwtHelper, $state) {
  $rootScope.$on('$locationChangeStart', function() {
    if (!auth.isAuthenticated) {
      var token = store.get('token');

      if (token) {
        if (!jwtHelper.isTokenExpired(token)) {
          auth.authenticate(store.get('profile'), token);
        } else {
          $state.go('login');
        }
      }
    }
  });
});
