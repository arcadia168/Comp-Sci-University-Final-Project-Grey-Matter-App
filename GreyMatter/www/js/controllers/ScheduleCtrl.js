angular.module('greyMatter').controller('ScheduleCtrl', function ($scope, moment, Schedule, User, $ionicModal, $ionicPopup) {

  $scope.currentScheduledTasks = {};
  $scope.editingExistingTask = false;
  $scope.setTimeValidationHack = null;
  $scope.showDelete = false;
  $scope.timePickerObject = {
    inputEpochTime: ((new Date()).getHours() * 60 * 60),  //Optional
    step: 15,  //Optional
    format: 12,  //Optional
    titleLabel: 'Choose Task Time of Day',  //Optional
    setLabel: 'Set',  //Optional
    closeLabel: 'Close',  //Optional
    setButtonType: 'button-positive',  //Optional
    closeButtonType: 'button-stable',  //Optional
    callback: function (val) {    //Mandatory
      timePickerCallback(val);
    }
  };
  var currentUser = User.currentUser();
  var timePickerClicked = false;

  //callback for the ionic-timepicker directive
  function timePickerCallback(val) {
    if (typeof (val) === 'undefined') {
      console.log('Time not selected');
    } else {
      $scope.setTimeValidationHack = $scope.newOrUpdatedTask.time = new Date(val * 1000);
    }
  }

  //on reentering view, refresh the tasks from the server.
  $scope.$on('$ionicView.enter', function () {

    currentUser = User.currentUser();

    if (currentUser.userType == 'carer') {

      $scope.viewTitle = 'Patient Daily Routine';

      //then we want to see and manipulate the schedule of the patient we are concerned about
      Schedule.setScheduleUserId(currentUser.connectedPatient.user_id);
    } else {

      $scope.viewTitle = 'Daily Routine';
    }

    //get all scheduled items when controller is first initialised
    Schedule.getAllScheduledTasks().then(function (response) {

      $scope.currentScheduledTasks = response.data;

    }).catch(function (error) {

      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve schedule tasks! Please try again! <br><br> " + error.error
      });

    });
  });

  $scope.orderByDate = function (task) {
    var date = moment(task.time)
    var rawDate = date.toDate();
    return rawDate;
  };

  $scope.convertToJsDate = function (stringDate) {

    //return moment(stringDate).toDate();
    var momentDate = moment(stringDate);
    console.log('Date is: ' + momentDate.toString());
    return momentDate.toDate();
  };

  $scope.toggleDeleteTasks = function () {
    $scope.showDelete = !$scope.showDelete;
  };

  //refreshed function for the scheduled items
  $scope.doNothing = function () {
    timePickerClicked = true;
    console.log('do nothing');
  };

  //task object to be bound to the add/edit task modal
  var blankTask = {
    name: null,
    details: null,
    time: Date.now(),
    user_id: Schedule.getScheduleUserId(),
    completedToday: false
  };

  $scope.newOrUpdatedTask = angular.copy(blankTask);

  //modal functions

  //define modal
  $ionicModal.fromTemplateUrl('templates/create-new-schedule-task.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    $scope.modal = modal;
  });

  $scope.addNewScheduleItem = function () {
    $scope.openModal();
  };

  $scope.openModal = function () {
    $scope.modal.show();
  };

  //modal function to edit existing task
  $scope.editScheduleTask = function (index) {

    $scope.editingExistingTask = true;
    $scope.newOrUpdatedTask = $scope.currentScheduledTasks[index];
    $scope.setTimeValidationHack = $scope.newOrUpdatedTask.time;

    $scope.openModal();
  };

  //modal function to add new task
  $scope.closeModal = function (form) {

    if (form.$valid && timePickerClicked == false) {

      if (!$scope.editingExistingTask) {

        //then attempt to create the new thing on the server!
        Schedule.createNewScheduleTask($scope.newOrUpdatedTask).then(function (response) {

          console.log('successfully created new task: ' + JSON.stringify(response.data));

          //clear newUpdatedThing as successfully persisted
          $scope.newOrUpdatedTask = angular.copy(blankTask);

          //refresh list of things stored in the app
          Schedule.getAllScheduledTasks().then(function (response) {
            $scope.currentScheduledTasks = response.data;

          }).catch(function (error) {
            $ionicPopup.alert({
              title: "Oops! Something went wrong!",
              template: "There was a problem when trying to retrieve schedule tasks! Please try again! <br><br> " + error.error
            });
          }).finally(function () {

            //hide the modal and return to list of things
            $scope.modal.hide();

          });
        }).catch(function (error) {
          $ionicPopup.alert({
            title: "Oops! Something went wrong!",
            template: "There was a problem when trying to create your task! Please try again! <br><br> " + error.error
          });
        }).finally(function () {

          $scope.setTimeValidationHack = null;
          $scope.modal.hide();
        });

      }
      else { //we are creating a new thing entirely

        //perform an update
        Schedule.updateScheduledTask($scope.newOrUpdatedTask).then(function () {

          //refresh list of things stored in the app
          Schedule.getAllScheduledTasks().then(function (response) {

            $scope.currentScheduledTasks = response.data;
          }).catch(function (error) {

            $ionicPopup.alert({
              title: "Oops! Something went wrong!",
              template: "There was a problem when trying to retrieve schedule tasks! Please try again! <br><br> " + error.error
            });
          }).finally(function () {
            //hide the modal and return to list of things

            //clear out task being edited regardless
            $scope.newOrUpdatedTask = angular.copy(blankTask);

            $scope.editingExistingTask = false;
            $scope.modal.hide();
          });

        }).catch(function (error) {

          $ionicPopup.alert({
            title: "Oops! Something went wrong!",
            template: "There was a problem when trying to update your thing! Please try again! <br><br> " + error.error
          });
        }).finally(function () {

          $scope.setTimeValidationHack = null;
          $scope.modal.hide();
        });
      }
    }

    timePickerClicked = false;
  };

  //modal function to  editing or adding a new task
  $scope.cancelAddOrEditTask = function () {

    $scope.editingExistingTask = false;

    $scope.modal.hide();

  };

  //function to delete existing task.
  $scope.deleteScheduledTask = function (taskId) {

    Schedule.deleteScheduledTask(taskId).then(function () {

      $ionicPopup.alert({
        title: "Task Deleted!",
        template: "This task was successfully removed from your daily schedule"
      });

      //now refresh the list of tasks from the server
      //refresh list of things stored in the app
      Schedule.getAllScheduledTasks().then(function (response) {

        $scope.currentScheduledTasks = response.data;
      }).catch(function (error) {

        $ionicPopup.alert({
          title: "Oops! Something went wrong!",
          template: "There was a problem when trying to retrieve schedule tasks! Please try again! <br><br> " + error.error
        });
      });
    }).catch(function (error) {

      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve schedule tasks! Please try again! <br><br> " + error.error
      });
    });
  };

  //function to run when an item is checked as done or not done
  $scope.toggleTask = function (index) {

    //first retrieve the task to be updated
    //todo: check this retrieves the correct task
    var taskToToggle = $scope.currentScheduledTasks[index];

    //now call through to the server to set the completion state of this task
    Schedule.setTaskState(taskToToggle._id, taskToToggle.completedToday).then(function () {

      if (!taskToToggle.completedToday) {
        $ionicPopup.alert({
          title: "Task undone!",
          template: "You've marked this daily task needing to be still done today!"
        });
      } else {
        $ionicPopup.alert({
          title: "Task Done!",
          template: "You've marked this daily task as done for today!"
        });
      }

      //fetch an updated list of tasks from the server //todo: is this a good design?
      Schedule.getAllScheduledTasks().then(function (response) {

        $scope.currentScheduledTasks = response.data;
      }).catch(function (error) {

        $ionicPopup.alert({
          title: "Oops! Something went wrong!",
          template: "There was a problem when trying to retrieve schedule tasks! Please try again! <br><br> " + error.error
        });
      });
    }).catch(function (error) {

      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve schedule tasks! Please try again! <br><br> " + error.error
      });
    }).catch(function (error) {

      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to update the schedule task! Please try again! <br><br> " + error.error
      });
    });
  }

  /*
   function to bind to the ion-refresher directive
   refresher to pull in updated things
   */
  $scope.refreshScheduleData = function () {

    //fetch an updated list of tasks from the server //todo: is this a good design?
    Schedule.getAllScheduledTasks().then(function (response) {

      $scope.currentScheduledTasks = response.data;
    }).catch(function (error) {

      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve schedule tasks! Please try again! <br><br> " + error.error
      });
    }).finally(function () {

      //tell angular scope that the broadcast has ender
      $scope.$broadcast('scroll.refreshComplete');
    });
  };

});
