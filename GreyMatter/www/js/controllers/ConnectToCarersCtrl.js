angular.module('greyMatter').controller('ConnectToCarersCtrl', function ($scope, $location, store, auth, $state, $ionicPopup, $ionicLoading, User) {

  //retrive current user data
  $scope.currentUser = User.currentUser();

  $scope.$on('$ionicView.enter', function () {

    //refresh user data
    User.getUserData($scope.currentUser.user_id).then(function (userData) {

      //update the user on the scope
      $scope.currentUser = userData;

    }).catch(function (error) {

      //let the user know there was an error fetching up to date invitations
      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve up to date invitations, please try again! <br><br> Error: " + JSON.stringify(error)
      });
    });
  });

  $scope.finishInvitations = function () {

    $scope.notDoingForm = true;

    $ionicPopup.confirm({
      title: 'Invites Sent!',
      template: 'You can always come back here and invite more people to connect!'
    }).then(function (res) {
      if (res) {

        //take the newly created user to the profile tab
        $state.go('tab.profile');
      }
    });

  };

  $scope.inviteEmail = {
    email: undefined
  };

  $scope.inviteCarer = function (carerEmailForm) {

    //ensure a valid email has been supplied and it is not the one of the logged in account!
    if ((!$scope.notDoingForm && carerEmailForm.$valid) && ($scope.inviteEmail.email != $scope.currentUser.email)) {

      //use the email to attempt to invite this carer to connect
      User.inviteCarer($scope.inviteEmail.email).then(function (response) {

        //if user existed, tell patient that the carer was invited
        $ionicPopup.alert({
          title: 'Carer Invited!',
          template: 'Feel free to invite another!'
        });

        $scope.inviteEmail.email = null;

      }).catch(function (response) {

        //ionic popup detailing error
        $ionicPopup.alert({
          title: 'Failed to send invitation!',
          template: 'Error: ' + response.error +
          '<br><br>Please ensure that the email address you provided is valid and that a user exists with this address!'
        });

      });

    } else {

      //ionic popup detailing error
      $ionicPopup.alert({
        title: 'Invalid Email Address!',
        template: 'Please ensure that the email address you provided is valid and that a user exists with this address!'
      });

    }

  };

});
