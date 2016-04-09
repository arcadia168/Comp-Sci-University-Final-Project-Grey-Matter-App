var myApp = angular.module('myApp');

myApp.controller('MsgCtrl', function ($scope) {
  $scope.message = '';
});

myApp.controller('RootCtrl', function (auth, $scope) {
  $scope.$parent.message = '';
  $scope.auth = auth;
});

var saveUserInfo = function(profile, token, store) {
  store.set('profile', profile);
  store.set('token', token);
};

myApp.controller('LoginCtrl', function (auth, $scope, $state, store) {
  $scope.$parent.message = 'loading signin...';

  auth.signin({}, function (profile, id_token) {
    saveUserInfo(profile, id_token, store);
    $state.go('root');
  }, function () {
    $scope.$parent.message = 'invalid credentials';
    $scope.loading = false;
  });
});

myApp.controller('SignupCtrl', function (auth, $scope, $state, store) {
  $scope.$parent.message = 'loading signup...';

  auth.signup({ popup:  true, auto_login: false }, function (profile, id_token) {
    saveUserInfo(profile, id_token, store);
    $state.go('root');
  });
});

myApp.controller('ResetCtrl', function (auth, $scope) {
  $scope.$parent.message = 'loading password reset...';

  auth.reset({}, function () {
    console.log('reset success');
  }, function  () {
    console.log('reset fail');
  });
});

myApp.controller('LogoutCtrl', function (auth, $location, store, $scope, $state) {
  auth.signout();
  store.remove('profile');
  store.remove('token');
  $scope.$parent.message = '';
  $state.go('root');
});
