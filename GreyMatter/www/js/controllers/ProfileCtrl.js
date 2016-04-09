//to give an overview of the patient - health, mood, family etc
angular.module('greyMatter').controller('ProfileCtrl', function ($scope, $state,
                                                                 RunMode, Socket,
                                                                 $ionicModal,
                                                                 $ionicPlatform,
                                                                 $ionicHistory,
                                                                 $cordovaCamera,
                                                                 $ionicPopup, User,
                                                                 auth, store) {

  $scope.server = RunMode.server().slice(0, -4);

  function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString = atob(dataURI.split(',')[1]);
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    var bb = new Blob([ab], {"type": mimeString});
    return bb;
  }

  $scope.$on('$ionicView.enter', function () {

    $scope.user = User.currentUser();

    User.getUserData($scope.user.user_id).then(function (userData) {

      //update the user on the scope
      $scope.user = userData;

      //fetch up to date patient data after user data
      User.loadConnectedPatientData().then(function () {

        //assign patient data to scope
        $scope.connectedPatient = User.getConnectedPatient();

      }).catch(function (error) {

        //let the user know there was an error fetching up to date invitations
        $ionicPopup.alert({
          title: "Oops! Something went wrong!",
          template: "There was a problem when trying to retrieve up to date patient info, please try again! <br><br> Error: " + JSON.stringify(error)
        });

      }).finally(function () {

        //let the refresher know update complete
        $scope.$broadcast('scroll.refreshComplete');

      });

    }).catch(function (error) {

      //let the user know there was an error fetching up to date invitations
      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve up to date user info, please try again! <br><br> Error: " + JSON.stringify(error)
      });
    });
  });

  $scope.inviteEmail = {
    email: undefined
  };

  $scope.inviteCarer = function (carerEmailForm) {

    //ensure a valid email has been supplied and it is not the one of the logged in account!
    if (carerEmailForm.$valid && $scope.inviteEmail.email != $scope.user.email) {

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

  $scope.finishInvitations = function () {

    $ionicPopup.confirm({
      title: 'Invites Sent!',
      template: 'You can always come back here and invite more people to connect!'
    }).then(function (res) {
      if (res) {
        $scope.closeModal();
      }
    });

  };

  $scope.goToCarerConnect = function () {
    $scope.openModal();
  };

  //may have to implement this as a modal, use same template
  $ionicModal.fromTemplateUrl('templates/invite-carer-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    $scope.modal = modal;
  });

  $scope.openModal = function () {
    $scope.modal.show();
  };

  $scope.closeModal = function () {
    $scope.modal.hide();
  };

  $scope.disconnectFromPatient = function () {

    //todo: complete this function on backend
    console.log('disconnect a carer from a patient');

  };

  $scope.signOut = function () {

    //also need to clear scope variable
    $scope.user = {};

    //clear the stored user data in out service
    User.clearCurrentUser();

    //call the signout method on the auth service
    auth.signout();
    store.remove('profile');
    store.remove('token');
    store.remove('refreshToken');

    //remove all cached views and delete all cached scopes
    $ionicHistory.clearCache();

    //need to manually display the login screen again
    $state.go('login');

  };

  //pull down to refresh user and patient data
  $scope.refreshUserData = function () {

    User.getUserData($scope.user.user_id).then(function (userData) {

      //update the user on the scope
      $scope.user = userData;

      //fetch up to date patient data after user data
      User.loadConnectedPatientData().then(function () {

        //assign patient data to scope
        $scope.connectedPatient = User.getConnectedPatient();

      }).catch(function (error) {

        //let the user know there was an error fetching up to date invitations
        $ionicPopup.alert({
          title: "Oops! Something went wrong!",
          template: "There was a problem when trying to retrieve up to date patient info, please try again! <br><br> Error: " + JSON.stringify(error)
        });
      }).finally(function () {

        //let the refresher know update complete
        $scope.$broadcast('scroll.refreshComplete');

      });
    }).catch(function (error) {

      //let the user know there was an error fetching up to date invitations
      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve up to date user info, please try again! <br><br> Error: " + JSON.stringify(error)
      });
    });
  };

  $scope.chooseProfilePic = function () {

    var options = {
      quality: 100,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
      allowEdit: true,
      encodingType: Camera.EncodingType.JPEG,
      targetWidth: 100,
      targetHeight: 100,
      popoverOptions: CameraPopoverOptions,
      saveToPhotoAlbum: false
    };

    $ionicPlatform.ready(function () {
      $cordovaCamera.getPicture(options).then(function (imageData) {
        var profilePic = dataURItoBlob("data:image/jpeg;base64," + imageData);

        //send updated profile picture to server
        User.updateProfilePic(profilePic).then(function (response) {

          console.log('Profile picture updated');

          //assign updated user data to scope.
          $scope.user = response.data;

          //update the view
          //$scope.$apply();

        }, function (error) {

          $ionicPopup.alert({
            title: "Oops! Something went wrong!",
            template: "There was a problem when trying to update your profile picture, please try again! <br><br> Error: " + JSON.stringify(error)
          });
        })
      }, function (error) {

        //if the user has not simply cancelled the action
        if (error != "no image selected") {
          $ionicPopup.alert({
            title: "Oops! Something went wrong!",
            template: "There was a problem when trying to update your profile picture, please try again! <br><br> Error: " + JSON.stringify(error)
          });
        }
      });
    });
  };

  //function to allow carer to disconnect from patient
  $scope.disconnectFromPatient = function () {

    //confirmation dialog to ensure user is certain of this action
    $ionicPopup.confirm({
      title: 'Confirm Patient Disconnection',
      template: 'Are you sure you want to disconnect from this patient? The patient will have to re-invite to connect!'
    }).then(function (res) {
      if (res) {

        //disconnect patient from carer user
        User.disconnectPatientFromCarer().then(function () {

          //message to let user know that the action was successful
          $ionicPopup.alert({
            title: 'Successfully disconnected from patient!',
            template: 'You are no longer a carer for the specified patient, they can re-invite you at any time.'
          });

          //now there is no connected patient, carer user can't use app, take to patient connection waiting page
          $state.go('signup-connect-patients');

        }).catch(function () {

          //message to tell user of failure, ask to reattempt
          $ionicPopup.alert({
            title: 'Oops! Something went wrong!',
            template: 'Something went wrong, please try again!'
          });
        });
      }
    });
  };
});
