angular.module('greyMatter').controller('ConnectToPatientsCtrl', function ($scope, $location, store, auth, $state, $ionicPopup, $ionicLoading, User) {

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

  $scope.refreshCarerInvitations = function () {

    User.getUserData($scope.currentUser.user_id).then(function (userData) {

      //update the user on the scope
      $scope.currentUser = userData;

    }).catch(function (error) {

      //let the user know there was an error fetching up to date invitations
      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve up to date invitations, please try again! <br><br> Error: " + JSON.stringify(error)
      });

    }).finally(function () {

      //let the refresher know update complete
      $scope.$broadcast('scroll.refreshComplete');

    });

  };

  $scope.acceptInvitation = function (invitation) {

    //before accepting, warn user and get confirmation
    $ionicPopup.confirm({
      title: 'Confirm Patient Connection',
      template: 'Are you sure you want to accept this connection invitation and connect to this patient?'
    }).then(function (res) {
      if (res) {

        //todo: run code to go ahead and accept the invitation
        User.acceptInvitation(invitation.sender.user_id).then(function (response) {

          //notify user the invitation was successfully accepted and that they are now connected to patient
          $ionicPopup.alert({
            title: 'Invitation Accepted',
            template: 'You are now connected to a patient! You will be able to see an overview of their data as they use the app.'
          }).then(function (res) {

            //take the user through to the patient's view of the app
            $state.go('tab.profile');

          });

        }).catch(function (error) {

          //inform the user of the error, ask them to try again.
          $ionicPopup.alert({
            title: 'Whoops! Something went wrong!',
            template: 'Unfortunately, something went wrong, please try again!'
          });
        });

      } //else do nothing
    });
  };

  $scope.rejectInvitation = function (invitation) {

    //before rejecting, warn use and get confirmation
    User.rejectInvitation(invitation.sender.user_id).then(function (response) {

      //display error message to user
      $ionicPopup.alert({
        title: "Invitation Successfully Rejected!",
        template: "Successfully rejected this patient invitation, feel free to accept another one."
      }).then(function () {

        //update the scope with new user invitations (remove invitation just rejected)
        $scope.currentUser = User.currentUser();

      });

    }).catch(function (error) {

      //display error message to user
      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve reject the invitation, please try again! <br><br> Error: " + JSON.stringify(error)
      });
    });
  };

  $scope.signOut = function () {

    //also need to clear scope variable
    $scope.currentUser = {};

    //clear the stored user data in out service
    User.clearCurrentUser();

    //call the signout method on the auth service
    auth.signout();
    store.remove('profile');
    store.remove('token');
    store.remove('refreshToken');

    $state.go('login');
  };
});
