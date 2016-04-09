angular.module('greyMatter').factory('User', ['$http', '$q', 'RunMode', 'Socket', function ($http, $q, RunMode) {

  var SERVER = RunMode.server();

  //store the current users data in this service so it is globally accessible
  var currentUserData = null;
  var connectedPatientData = null; //stored details about connected patient if user is carer
  var currentCarerLocations = null;
  var showTutorials = true;

  return {
    sync: function (user) {

      user = JSON.stringify(user);
      var deferred = $q.defer();

      $http.post(SERVER + '/users/sync/', user
      ).success(function (response) {
        //assign the up to date user details to the global factory here
        currentUserData = response.data;

        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;
    },
    updateHomeLocation : function (lat, long) {

      var deferred = $q.defer();

      var newLocation = {
        latitude : lat,
        longitude: long
      }

      $http.post(SERVER + '/users/' + currentUserData.user_id + '/update/home_location', newLocation
      ).success(function (response) {
        //assign the returned user data to the factory for global user data
        currentUserData = response;

        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });
      return deferred.promise;

    },
    getUserData: function (user_id) {

      //get the data for a particular user from the server

      var deferred = $q.defer();

      $http.get(SERVER + '/users/' + user_id
      ).success(function (response) {
        //assign the returned user data to the factory for global user data
        currentUserData = response;

        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });
      return deferred.promise;
    },
    currentUser: function () {
      //simply return the user data of the user who is currently logged in
      return currentUserData;
    },
    setUserType: function (userType) {
      if (userType == 1) {
        currentUserData.userType = 'patient';
      } else {
        currentUserData.userType = 'carer';
      }
    },
    getConnectedPatient: function () {
      //return the data of the patient connected to this user (if user is carer)
      return connectedPatientData;
    },
    loadConnectedPatientData: function () {

      var deferred = $q.defer();

      if (currentUserData.connectedPatient && currentUserData.connectedPatient.user_id) {

        $http.get(SERVER + '/users/' + currentUserData.connectedPatient.user_id
        ).success(function (response) {

          //upon successfully accepting invitation from user, will recieve newly connected patient data
          connectedPatientData = response;
          deferred.resolve(response);

        }).error(function (response) {

          deferred.reject(response);

        });

      } else {

        //resolve promise, just set no patient data!
        deferred.resolve();
      }

      return deferred.promise;

    },
    disconnectPatientFromCarer: function () { //need different method for disconnecting patient from carer

      var deferred = $q.defer();

      //ensure that there is a patient to disconnect from
      if (currentUserData.connectedPatient.user_id) {

        $http.get(SERVER + '/users/carers/disconnect/' + currentUserData.user_id + '/' + currentUserData.connectedPatient.user_id + '/'
        ).success(function (response) {

          //upon successfully accepting invitation from user, will recieve newly connected patient and user data
          //connectedPatientData = response.data[0];
          connectedPatientData = {};

          //update user data
          currentUserData = response.data[1];

          deferred.resolve(response);

        }).error(function (response) {

          deferred.reject(response);

        });
      } else {

        deferred.reject();
      }

      return deferred.promise;

    },
    retrieveCarerLocations: function (carerUserIds) {

      var deferred = $q.defer();

      $http.post(SERVER + '/users/' + currentUserData.user_id + '/carer_locations', carerUserIds
      ).success(function (response) {

        //assign the returned user data to the factory for global user data
        currentCarerLocations = response.data;

        deferred.resolve(response);
      }).error(function (error) {

        deferred.reject(error);
      });

      return deferred.promise;

    },
    getCachedCarerLocations: function () {
      return currentCarerLocations;
    },
    updateConnectedPatientData: function () {

      //retrieve most up to date details about the patient connected to this user
      var connectedPatientId = currentUserData.connectedPatient.user_id;
      var deferred = $q.defer();

      $http.get(SERVER + '/users/' + connectedPatientId
      ).success(function (response) {

        //assign the returned user data to the factory for global user data
        connectedPatientData = response[0];

        deferred.resolve(response);
      }).error(function (error) {

        deferred.reject(error);
      });

      return deferred.promise;

    },
    //send the updated user data to the server to be saved
    saveUpdatedUserData: function (newUserProfileInfo) {

      //need to convert the user object into a JSON string
      user = JSON.stringify(newUserProfileInfo);

      var deferred = $q.defer();

      //use dummy user sillybilly for now
      $http.post(SERVER + '/users/' + currentUserData.user_id + '/update/', newUserProfileInfo
      ).success(function (response) {

        //assign the up to date user details to the global factory here
        currentUserData = response.data;
        console.log("Current user data: " + JSON.stringify(currentUserData));

        //fulfill the promise
        deferred.resolve(response);

      }).error(function (response) {

        //reject the promise
        deferred.reject();

      });

      //return promise to be fulfilled to controller
      return deferred.promise;

    },
    inviteCarer: function (carerEmail) {

      var deferred = $q.defer();

      var user = {
        email: carerEmail
      };

      user = JSON.stringify(user);

      $http.post(SERVER + '/users/' + currentUserData.user_id + '/invite/', user
      ).success(function (response) {

        //fulfill the promise
        deferred.resolve(response);

      }).error(function (response) {

        //reject the promise
        deferred.reject(response);
      });

      //return promise to be fulfilled to controller
      return deferred.promise;

    },
    acceptInvitation: function (patientID) {

      var deferred = $q.defer();

      $http.get(SERVER + '/users/invite/accept/' + patientID + '/' + currentUserData.user_id
      ).success(function (response) {

        //upon successfully accepting invitation from user, will recieve newly connected patient data
        connectedPatientData = response.data[0];
        currentUserData = response.data[1];

        deferred.resolve(response);

      }).error(function (response) {

        deferred.reject(response);

      });

      return deferred.promise;

    },
    rejectInvitation: function (patientID) {

      var deferred = $q.defer();

      $http.get(SERVER + '/users/invite/reject/' + patientID + '/' + currentUserData.user_id
      ).success(function (response) {

        //update carer user data
        currentUserData = response.data[1];

        deferred.resolve(response);

      }).error(function (response) {

        deferred.reject(response);

      });

      return deferred.promise;

    },
    updateLocation: function (newPos) {

      var deferred = $q.defer();


      $http.post(SERVER + '/users/user_location/' + currentUserData.user_id, newPos
      ).success(function (response) {

        //update carer user data
        currentUserData = response.data;

        deferred.resolve(response);

      }).error(function (response) {

        deferred.reject(response);

      });

      return deferred.promise;

    },
    createPatientGeofence: function (geofence) {

      var deferred = $q.defer();

      $http.post(SERVER + '/users/create_geofence/' + currentUserData.user_id + '/' + currentUserData.connectedPatient.user_id, geofence
      ).success(function (response) {

        //update carer user data
        currentUserData = response.data[0];
        connectedPatientData = response.data[1];

        deferred.resolve(response);

      }).error(function (response) {

        deferred.reject(response);

      });

      return deferred.promise;

    },
    removePatientGeofence: function (geofenceIdentifier) {

      var deferred = $q.defer();

      $http.delete(SERVER + '/users/geofence/' + currentUserData.user_id + '/' + currentUserData.connectedPatient.user_id + '/' + geofenceIdentifier
      ).success(function (response) {

        //update carer user data
        currentUserData = response.data[0];
        connectedPatientData = response.data[1];

        deferred.resolve(response);

      }).error(function (response) {

        deferred.reject(response);

      });

      return deferred.promise;
    },
    alertGeofenceAction: function(geofenceAction) {

      var deferred = $q.defer();

      $http.post(SERVER + '/users/' + currentUserData.user_id + '/geofence/action', geofenceAction
      ).success(function (response) {

        deferred.resolve(response);
      }).error(function (response) {

        deferred.reject(response);
      });

      return deferred.promise;
    },
    updateProfilePic: function (userPic) {

      var deferred = $q.defer();

      //build form data object to post to api
      var userPicData = new FormData();
      userPicData.append('pic', userPic);

      $http.post(SERVER + '/users/update/pic/' + currentUserData.user_id, userPicData, {
          transformRequest: angular.identity,
          headers: {'Content-Type': undefined}
        }
      ).success(function (response) {

        //update the current user's data
        currentUserData = response.data;

        deferred.resolve(response);
      }).error(function (error) {
        deferred.reject(error);
      });

      return deferred.promise;

    },
    registerDeviceToken: function (user_id, new_device_token) {
      //get the data for a particular user from the server

      var deferred = $q.defer();

      $http.get(SERVER + '/users/devices/register/' + user_id + '/' + new_device_token
      ).success(
        function (response) {
          deferred.resolve(response);
        }
      ).error(
        function () {
          console.log("Error while making HTTP call.");
          deferred.reject();
        }
      );

      return deferred.promise;
    },
    clearCurrentUser: function () {
      //for use when logging out
      currentUserData = {};
      connectedPatientData = {};
      //Socket.emit('leave room');
      return;
      //to avoid having old user data after logging out and back in again
    },
    showTutorials: function () {
      showTutorials = true;
    },
    hideTutorials: function () {
      showTutorials = false;
    },
    tutorialsActiveCheck: function () {
      return showTutorials;
    }
  }
}]);
