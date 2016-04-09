angular.module('greyMatter').factory('Schedule', ['$http', '$q', 'RunMode', 'User', '_', function ($http, $q, RunMode, User, _) {

  var SERVER = RunMode.server();

  //variable to hold the current schedule of the user (patient user)
  var currentScheduleTasks = {};

  //variable of patient's id of schedule to retrieve and manipulate
  var scheduleUserId = User.currentUser().user_id; //default this to the current user, overwrite in controller.

  //factory methods to alte state of business logic globally across the application
  return {
    setScheduleUserId : function (userId) {
      scheduleUserId = userId;
    },
    getScheduleUserId : function () {
      return scheduleUserId;
    },
    createNewScheduleTask: function (newTask) {

      var deferred = $q.defer();

      $http.post(SERVER + '/users/' + scheduleUserId + '/schedule/create', newTask
      ).success(function (response) {
        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;
    },
    getAllScheduledTasks: function () {

      var deferred = $q.defer();

      $http.get(SERVER + '/users/' + scheduleUserId + '/schedule/'
      ).success(function (response) {

        //assign retrieved tasks to factory property to allow global application access
        currentScheduleTasks = response.data;

        //sort all current tasks based on time
        response.data = currentScheduleTasks = _.sortBy(currentScheduleTasks, function(task){
          var date = moment(task.time);
          var today = moment();
          today.hours(date.hours());
          today.minutes(date.minutes());
          return today;
        });

        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;
    },
    getCurrentScheduledTasks: function ( ) {
      return currentScheduleTasks;
    },
    updateScheduledTask: function (updatedTask) {

      var deferred = $q.defer();

      $http.post(SERVER + '/users/' + scheduleUserId + '/schedule/update/' + updatedTask._id, updatedTask
      ).success(function (response) {
        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;

    },
    deleteScheduledTask: function(scheduledTaskId) {

      var deferred = $q.defer();

      $http.delete(SERVER + '/users/' + scheduleUserId + '/schedule/delete/' + scheduledTaskId
      ).success(function (response) {
        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;
    },
    setTaskState: function (scheduledTaskId, setTaskToState) {

      var deferred = $q.defer();

      $http.get(SERVER + '/users/' + scheduleUserId + '/schedule/toggle/' + scheduledTaskId + '/' + setTaskToState.toString()
      ).success(function (response) {
        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;

    }
  }
}]);
