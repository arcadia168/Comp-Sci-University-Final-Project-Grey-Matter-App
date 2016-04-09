angular.module('greyMatter').controller('SignUpCtrl', function ($scope, $state, User, $ionicModal, $ionicPopup, moment, _) {

  $scope.currentUser = User.currentUser();

  //When the user taps the sign up button show the Auth0 lock widget.
  $scope.optionChosen = function (userType) {

    //go to a different state depending on which type of user is specified
    if (userType == 1) {

      //set the type of user to be a patient on the global user factory
      User.setUserType(1);

      //user has said they are a patient
      $state.go('signup-patient-details');
    } else {

      //set the type of user to be a carer on the global user factory
      User.setUserType(2);

      //Need to update the user as being a carer on the server side
      var newUserData = {
        userType: "carer"
      };

      _.extend($scope.currentUser, newUserData);

      User.saveUpdatedUserData($scope.currentUser).then(function () {

        //user has specified they are a carer, take them to connect to a user who is a patient

        var updatedCarerData = User.currentUser();

        $state.go('signup-carer-details');

        //otherwise capture basic information

      }).catch(function (error) {

        //ionic popup detailing error
        $ionicPopup.alert({
          title: 'Saving User Type Failed!',
          template: 'Error: ' + error.error + '! <br><br> Please try again!'
        });

      });
    }
  };
});
