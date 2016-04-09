angular.module('greyMatter').controller('CompleteCarerProfileCtrl', function ($scope, $timeout, $location, store, $state, User, auth, $ionicPopup, _, moment) {

  $scope.currentUser = User.currentUser();

  $scope.newUserData = {
    firstName: null,
    lastName: null,
    userType: 'carer'//,
    //dateOfBirth: null,
  };

  $scope.yesterday = moment().subtract(1, 'day');

  $scope.maxPatientDob = moment().subtract(35, 'years');

  //check that the form has been filled out and validated and if so save the user data
  $scope.updateCarerDetails = function (form) {

    if (form.$valid) {

      //merge the current user's data with the new profile info
      $scope.currentUser.profileCompleted = true;

      _.extend($scope.currentUser, $scope.newUserData);

      //save the updated user data
      User.saveUpdatedUserData($scope.currentUser).then(function () {

        $ionicPopup.alert({
          title: 'Profile successfully created!',
          template: 'Congratulations, you have successfully created a carer profile!'
        });

        $state.go('signup-connect-patients');

      }).catch(function (error) {
        //ionic popup detailing error
        $ionicPopup.alert({
          title: 'Saving Profile Failed!',
          template: 'Error: ' + error.error + '! <br><br> Please try again!'
        });
      });
    } else {
      $ionicPopup.alert({
        title: 'Invalid data entered!',
        template: 'Please ensure you\'ve included all of the required fields!'
      });
    }
  };

  //todo: function to run when choosing images of children
  $scope.chooseCarerPicture = function() {

    var options = {
      maximumImagesCount: 1,
      width: 800,
      height: 800,
      quality: 80
    };

    $cordovaImagePicker.getPictures(options)
      .then(function (results) {
          for (var i = 0; i < results.length; i++) {
            console.log('Image URI: ' + results[i]);
          }
        }, function(error) {
          // error getting photos
        }
      );
  };
});
