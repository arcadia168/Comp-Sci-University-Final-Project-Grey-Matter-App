angular.module('greyMatter').factory('Things', ['$http', '$q', 'RunMode', 'User', function ($http, $q, RunMode, User) {

  var SERVER = RunMode.server();

  //variables to share across application global state
  var currentThings = null;

  //used by carers to fetch patient things
  var thingUserId = User.currentUser().user_id; //default to the current user, overwrite to patient

  //methods to make available to global application
  return {
    setThingUserId: function(userId) {
      thingUserId = userId;
    },
    createThing: function (thing) {

      var deferred = $q.defer();
      var formdata = new FormData;

      formdata.append('name', thing.name);
      formdata.append('location', thing.location);
      if (thing.pic) {
        formdata.append('pic', thing.pic);
      }
      if (thing.note) {
        formdata.append('note', thing.note);
      }

      var request = {
        method: 'POST',
        url: SERVER + '/users/' + thingUserId + '/things/create',
        data: formdata,
        headers: {
          'Content-Type': undefined
        }
      };

      // SEND THE FILES.
      $http(request)
        .success(function (response) {
          deferred.resolve(response);
        })
        .error(function () {
          deferred.reject(error);
        });

      return deferred.promise;

    },
    getCurrentThings: function () {
      return currentThings;
    },
    getAllThings: function () {

      var deferred = $q.defer();

      $http.get(SERVER + '/users/' + thingUserId + '/things'
      ).success(function (response) {

        //assign response into factory shared state for all applcation
        currentThings = response.data;

        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;

    },
    getThing: function(thingId) {

      var deferred = $q.defer();

      $http.get(SERVER + '/users/' + thingUserId + '/things/' + thingId
      ).success(function (response) {
        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;

    },
    updateThing: function(thing) {

      var deferred = $q.defer();

      //build form data object to post to api
      var thingFormData = new FormData();
      thingFormData.append('pic', thing.pic);
      thingFormData.append('name', thing.name);
      thingFormData.append('location', thing.location);
      thingFormData.append('note', thing.note);
      thingFormData.append('_id', thing._id);

      $http.post(SERVER + '/users/' + thingUserId + '/things/' + thing._id + '/update', thingFormData, {
          transformRequest: angular.identity,
          headers: {'Content-Type': undefined}
      }
      ).success(function (response) {
        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;

    },
    deleteThing: function(thingId) {

      var deferred = $q.defer();

      $http.delete(SERVER + '/users/' + thingUserId + '/things/' + thingId + '/delete'
      ).success(function (response) {
        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;
    }
  }
}]);
