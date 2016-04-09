angular.module('greyMatter').controller('PatientProfileOverviewCtrl', function ($scope, $state, $ionicModal, $ionicPopup, RunMode, User, moment, _) {

  $scope.user = User.currentUser();
  $scope.patient = User.getConnectedPatient();
  $scope.otherCarerUsersExist = false;
  $scope.server = RunMode.server().slice(0, -4);

  angular.forEach($scope.patient.connectedCarers, function(connectedCarer) {

    if (connectedCarer.user_id != $scope.user.user_id) {
      $scope.otherCarerUsersExist = true;
    }

  });

  //todo: needs testing
  $scope.getAgeFromDateOfBirth = function (dateOfBirth) {

    //convert given date of birth into an age using moment.js

    //variable for current day
    var today = moment();

    //variable for date of birth of child
    dateOfBirth = moment(dateOfBirth);

    //time between today and the date of birth
    return moment.duration(today.diff(dateOfBirth)).humanize();

  };

  $scope.$on('$ionicView.enter', function() {

    //get latest patient data
    User.loadConnectedPatientData($scope.patient.user_id).then(function (patientData) {

      //update the user on the scope
      $scope.patient = patientData;

    }).catch(function (error) {

      //let the user know there was an error fetching up to date invitations
      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve up to date patient info, please try again! <br><br> Error: " + JSON.stringify(error)
      });

    });

  });

  //just need functions to navigate to other app states.
  $scope.refreshPatientData = function () {

    User.loadConnectedPatientData($scope.patient.user_id).then(function (patientData) {

      //update the user on the scope
      $scope.patient = patientData;

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
