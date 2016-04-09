angular.module('greyMatter').controller('ThingsCtrl', function ($scope, $ionicModal, $ionicPlatform, $cordovaCamera, $ionicPopup, User, Things, RunMode) {

  //todo: alter this so that the connected PATIENT'S things are retrieved!!!

  $scope.currentThings = Things.getCurrentThings();
  $scope.editingExistingThing = false;
  $scope.server = RunMode.server().slice(0, -4);
  var currentUser;

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

  //retrive updated list of things from service whenever reenter the view
  $scope.$on('$ionicView.enter', function () {

    //if the user is a carer, set things factory to get patient things
    currentUser = User.currentUser();

    if (currentUser.userType == 'carer') {

      //set the view title appropriately
      $scope.viewTitle = 'Patient Things';

      //then set the things to retrieve the patient's things
      Things.setThingUserId(currentUser.connectedPatient.user_id);
    } else {

      $scope.viewTitle = 'Things'
    }

    Things.getAllThings().then(function (response) {

      $scope.currentThings = response.data;

    }).catch(function (error) {

      //user alert when an error occurs!
      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve your things! Please try again! <br><br> " + error.error
      });
    });
  });

  //retrieve new things on first entering the view
  Things.getAllThings().then(function (response) {

    $scope.currentThings = response.data;

  }).catch(function (error) {

    //user alert when an error occurs!
    $ionicPopup.alert({
      title: "Oops! Something went wrong!",
      template: "There was a problem when trying to retrieve your things! Please try again! <br><br> " + error.error
    });

  });

  //refresher to pull in updated things
  $scope.refreshThingData = function () {

    Things.getAllThings().then(function (response) {

      $scope.currentThings = response.data;

    }).catch(function (error) {

      //user alert when an error occurs!
      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve your things! Please try again! <br><br> " + error.error
      });

    }).finally(function () {

      //tell angular scope that the broadcast has ender
      $scope.$broadcast('scroll.refreshComplete');

    });
  };

  $scope.newThing = {
    name: null,
    location: null,
    pic: null,
    note: null,
    userId: User.currentUser().user_id
  };

  //create new thing using sliding modal
  //may have to implement this as a modal, use same template
  $ionicModal.fromTemplateUrl('templates/create-new-thing.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    $scope.modal = modal;
  });

  $scope.openModal = function () {
    $scope.modal.show();
  };

  $scope.closeModal = function (form) {

    if (form.$valid) {

      if (!$scope.editingExistingThing) {

        //then attempt to create the new thing on the server!
        Things.createThing($scope.newThing).then(function () {

          //refresh list of things stored in the app
          Things.getAllThings().then(function (response) {
            $scope.currentThings = response.data;

            //clear out the new thing for the next thing
            $scope.newThing = {};

          }).catch(function (error) {
            $ionicPopup.alert({
              title: "Oops! Something went wrong!",
              template: "There was a problem when trying to retrieve things! Please try again! <br><br> " + error.error
            });
          }).finally(function () {

            //hide the modal and return to list of things
            $scope.modal.hide();

          });
        }).catch(function (error) {
          $ionicPopup.alert({
            title: "Oops! Something went wrong!",
            template: "There was a problem when trying to create your thing! Please try again! <br><br> " + error.error
          });
        });

      } else { //we are creating a new thing entirely

        //perform an update
        Things.updateThing($scope.newThing).then(function () {

          //refresh list of things stored in the app
          Things.getAllThings().then(function (response) {
            $scope.currentThings = response.data;

            $scope.newThing = {};

          }).catch(function (error) {

            $ionicPopup.alert({
              title: "Oops! Something went wrong!",
              template: "There was a problem when trying to retrieve things! Please try again! <br><br> " + error.error
            });
          }).finally(function () {
            //hide the modal and return to list of things

            $scope.editingExistingThing = false;
            $scope.modal.hide();
          });

        }).catch(function (error) {

          $ionicPopup.alert({
            title: "Oops! Something went wrong!",
            template: "There was a problem when trying to update your thing! Please try again! <br><br> " + error.error
          });
        });
      }
    }
  };

  $scope.deleteThing = function (thingId) {

    Things.deleteThing(thingId).then(function (response) {

      //tell user
      $ionicPopup.alert({
        title: "Delete Successful!",
        template: "The thing has been deleted!"
      }).then(function () {

        //get updated things
        Things.getAllThings().then(function (response) {
          $scope.currentThings = response.data;

        }).catch(function (error) {

          $ionicPopup.alert({
            title: "Oops! Something went wrong!",
            template: "There was a problem when trying to retrieve things! Please try again! <br><br> " + error.error
          });
        })
      });

    }).catch(function (error) {

      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to delete your thing! Please try again! <br><br> " + error.error
      });
    })
  };

  $scope.editExistingThing = function (index) {
    $scope.editingExistingThing = true;

    //set thing object bound to in edit template to be thing we wish to edit
    $scope.newThing = $scope.currentThings[index];

    $scope.openModal();
  };

  $scope.addNewThing = function () {
    $scope.openModal();
  };

  $scope.cancelCreateUpdateThing = function () {
    $scope.editingExistingThing = false;

    //clear the new thing
    $scope.newThing = {};

    $scope.modal.hide();
  };

  $scope.$on('$destroy', function () {
    $scope.modal.remove();
  });

  //function to allow user to upload an image of the thing using their smartphone
  $scope.chooseThingImage = function () {

    var options = {
      quality: 100,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
      allowEdit: true,
      encodingType: Camera.EncodingType.JPEG,
      targetWidth: 300,
      targetHeight: 300,
      popoverOptions: CameraPopoverOptions,
      saveToPhotoAlbum: false
    };

    $ionicPlatform.ready(function () {
      $cordovaCamera.getPicture(options).then(function (imageData) {
        if (imageData) {
          $scope.newThing.pic = dataURItoBlob("data:image/jpeg;base64," + imageData);
        }
      }, function (err) {
        // error
      });
    });
  };
});
