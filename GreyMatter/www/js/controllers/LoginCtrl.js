angular.module('greyMatter').controller('LoginCtrl', function ($scope, $rootScope, $location,
                                                               store, auth, $state, $ionicPopup,
                                                               $ionicLoading, User, $ionicPush) {

  $scope.$on('$ionicView.enter', function () {
    // code to run each time view is entered

    $scope.loginData = {
      user: "",
      password: ""
    };

    //login
    auth.signin(
      {
        //THIS IS WHERE TO CONFIGURE THE AUTH0 OPTIONS SUCH AS CLOSABLE ETC...
        closable: false,
        popup: true,
        // Make the widget non closeable
        standalone: true,
        authParams: {
          scope: 'openid offline_access',
          device: 'Mobile device',
          // This is a must for mobile projects
          popup: true,
          // Make the widget non closeable
          standalone: true
        }

      }, function (profile, idToken, access_token, state, refreshToken) {

        // Success callback
        store.set('profile', profile);
        store.set('token', idToken);
        store.set('refreshToken', refreshToken);
        $location.path('/');

        // Login was successful
        User.sync(auth.profile).then(function (userData) {
            //hide the loader

            //store device token on server
            console.log('registering push');

            var push = new Ionic.Push({
              "onNotification": function (notification) {
                var payload = notification.payload;
                console.log(notification, payload);
                $ionicPopup.alert({
                  title: 'Patient Activity Notification',
                  template: notification.text
                })
              },
              "pluginConfig": {
                "ios": {
                  "badge": true,
                  "sound": true
                },
                "android": {
                  "iconColor": "#343434"
                }
              }
            });

            push.register(function (token) {
              // Log out your device token (Save this!)
              console.log("Got Token:", token.token);

              //send the device token to server and register against user who has just logged in
              User.registerDeviceToken(userData.data.user_id, token.token).then(
                function () {
                  console.log('successfully added device token to user ' + userData.data.user_id);
                },
                function (error) {
                  console.log('error occured saving device token to user: ' + JSON.stringify(error));
                }
              );
            });

            //Once the user data has been synced, get the user data object from our server
            //User.hideTutorials();

            //here check if the user is a patient or carer and if carer load patient details into global factory
            if (userData.isNewUser == true || userData.data.userType == undefined) {

              //then mark this user as being new and show them the tutorials
              User.showTutorials();

              //take user to the sign up page
              $state.go('signup-user-type');

            } else {

              //if the user is not a new user, and has not completed their profile
              if (userData.data.profileCompleted == true) {

                //here check if the user is a patient
                if (userData.data.userType == 'patient') {

                  //if we have a non-new user with a complete profile, simply load the app
                  $state.go('tab.profile');

                } else if (userData.data.userType == 'carer') {

                  //check to see if there is a patient associated with this carer
                  if (userData.data.connectedPatient) {

                    $state.go('tab.profile')

                  } else {

                    //assume that there is no attached patient, so take the user to the patient invitatoin waiting area
                    $state.go('signup-connect-patients');

                  }
                }
              } else if (userData.data.userType == 'patient') {

                $state.go('signup-patient-details');

              } else if (userData.data.userType == 'carer') {

                //check the carer's patient, if there is none, go to holding, else show that patient's profile
                $state.go('signup-connect-patients');

              } else {

                $state.go('signup-user-type');
              }
            }
          }
        ).catch(function (response) {

          $ionicPopup.alert({
            title: 'Login Failed',
            template: 'Error: ' + response.error + '<br><br> Please try logging in again and ensure you\'re connected to the internet! '
          });

        });

      }, function (response) {

        //Log this user out
        $state.go('login');

        $ionicPopup.alert({
          title: 'Login Failed',
          template: 'Error: ' + response.error + '<br><br> Please try logging in again and ensure you\'re connected to the internet!'
        });

      });

  });
});
