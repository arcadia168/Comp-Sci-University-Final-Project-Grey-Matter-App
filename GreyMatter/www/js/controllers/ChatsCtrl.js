angular.module("greyMatter").controller('ChatsCtrl', function ($scope, $state, $ionicPopup, Socket, User) {

  //on loading in the controller get current user and patient data
  User.getUserData(User.currentUser().user_id).then(function (response) {

    $scope.currentUser = response;

    if ($scope.currentUser.userType == 'carer') {

      //go directly to a chat with this carers only patient
      $state.go('tab.chat-detail');
    } else {
      
      //user is patient, fetch carer details
      
      
    }
  }).catch(function (error) {

    $ionicPopup.alert({
      title: "Oops! Something went wrong!",
      template: "An error occurred when attempting to retrieve current user data. Error: " + JSON.stringify(error)
    })
  });
});
