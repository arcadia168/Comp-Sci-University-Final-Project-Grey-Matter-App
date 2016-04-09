angular.module('greyMatter').controller('CompletePatientProfileCtrl', function ($scope, $timeout, $location,
                                                                                store, $state, User, auth,
                                                                                $ionicPopup, _, moment,
                                                                                $ionicModal) {

  $scope.currentUser = User.currentUser();

  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function () {
    $scope.modal.remove();
  });

  $scope.newUserData = {
    firstName: null,
    lastName: null,
    userType: 'patient',
    spouse: null,
    maritalStatus: null,
    homeAddress: {
      houseNameNo: null,
      firstLineAddress: null,
      secondLineAddress: null,
      city: null,
      county: null,
      postCode: null,
      country: null
    },
    dateOfBirth: null,
    children: []
  };

  //invoke the modal window to add the child's details
  $ionicModal.fromTemplateUrl('templates/add-child-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    $scope.modal = modal;
  });

  $scope.openModal = function () {
    $scope.modal.show();
  };

  $scope.cancelAddEditChild = function () {
    $scope.modal.hide();
  };

  $scope.closeModal = function (form) { //run this on submission

    //validate the child details
    if (form.$valid) {

      //upsert the child

      //check if the child exists within the list of children
      var existingChild = _.findWhere($scope.newUserData.children, {name: $scope.newChild.name});

      if (existingChild) {
        //update the child
        existingChild = $scope.newChild;
      } else {
        //otherwise add the child as new
        $scope.newUserData.children.push($scope.newChild);
      }

      //now clear the newChild object for reuse
      $scope.newChild = {
        name: null,
        dateOfBirth: null,
        relation: null,
        picture: null
      };

      //hide the modal and return to main screen
      $scope.modal.hide();
    } else {
      $ionicPopup.alert({
        title: 'Invalid data entered!',
        template: 'Please ensure you\'ve included all of the required fields!'
      });
    }
  };

  //function to add a child to the patient's account
  $scope.addChild = function () {
    $scope.openModal();
  };

  $scope.editChild = function (childToEdit) {
    //set the child to edit to be the newChild object bound to in the view
    $scope.newChild = childToEdit;
    $scope.openModal();
  };

  $scope.newChild = {
    name: null,
    dateOfBirth: null,
    relation: null,
    picture: null
  };

  $scope.yesterday = moment().subtract(1, 'day');

  $scope.maxPatientDob = moment().subtract(35, 'years');

  //check that the form has been filled out and validated and if so save the user data
  $scope.updatePatientDetails = function (form) {

    if (form.$valid) {

      //merge the current user's data with the new profile info
      $scope.currentUser.profileCompleted = true;

      _.extend($scope.currentUser, $scope.newUserData);

      //save the updated user data
      User.saveUpdatedUserData($scope.currentUser).then(function () {

        $ionicPopup.alert({
          title: 'Profile successfully created!',
          template: 'Congratulations, you have successfully created a patient profile!'
        });

        $state.go('signup-connect-carers');

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

  //function to run when choosing images of children
  $scope.chooseChildPicture = function() {

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
