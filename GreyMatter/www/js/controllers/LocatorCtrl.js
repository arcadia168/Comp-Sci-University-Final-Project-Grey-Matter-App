angular.module('greyMatter').controller('LocatorCtrl', function ($scope, Socket, User, $ionicPopup, $ionicLoading,
                                                                 $compile, $ionicActionSheet,
                                                                 $window, $timeout,
                                                                 $ionicPlatform, $ionicModal, $interval) {//$cordovaGeolocation) {
  //define global variables!
  var currentUser;
  var connectedPatientData;
  var geolocationPlugin = window.BackgroundGeolocation;

  //Setup background location plugin, supplying callback to be run when a location change event is detected
  if (geolocationPlugin) {
    geolocationPlugin.configure(function (location, taskId) {

      //callback to be run when a location is successfully retrieved from the background geolocation plugin
      $scope.zoomMapToNewLocation(location);

      //task is run in the background so be sure to terminate the thread.
      geolocationPlugin.finish(taskId);

    }, function (error) {
      $ionicPopup.alert({
        title: 'Error retrieving location!',
        temaplate: 'Please restart the app and try again! Error: ' + JSON.stringify(error)
      })
    });

    geolocationPlugin.onGeofence(function (params, taskId) {
      var location = params.location;
      var identifier = params.identifier;
      var action = params.action;

      console.log('A geofence has been crossed: ', identifier);
      console.log('ENTER or EXIT?: ', action);
      console.log('location: ', JSON.stringify(location));

      $ionicPopup({
        title: 'You have crossed over a geofence! Carers will be alerte for safety',
        template: 'A geofence created by a carer has been ' + action + ' alerting carers now.'
      });

      geolocationPlugin.finish(taskId);
    });
  }

  //instantiate Google Maps JavaScript API direction service objects
  var directionsService = new google.maps.DirectionsService();
  var directionsDisplay = new google.maps.DirectionsRenderer();
  var geocoder = new google.maps.Geocoder();
  var distanceService = new google.maps.DistanceMatrixService();
  var markers = []; //array to hold all of the map markers
  var geofenceCursor = new google.maps.Marker({
    map: $scope.map,
    clickable: false,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 90,
      fillColor: '#11b700',
      fillOpacity: 0.1,
      strokeColor: '#11b700',
      strokeWeight: 3,
      strokeOpacity: 0.7
    }
  });
  var infoWindows = [];

  //declare scope variables to bind to in view
  $scope.carerDistances = [];
  $scope.showRoute = false;
  $scope.closestCarerKnown = false;
  $scope.routeInfo = undefined;
  $scope.geolocationPlugin = {
    enabled: (window.localStorage.getItem('geolocationPlugin:enabled') == 'true'),
    isMoving: (window.localStorage.getItem('geolocationPlugin:isMoving') == 'true')
  };
  $scope.currentLocationMarker = undefined;
  $scope.previousLocation = undefined;
  $scope.locationMarkers = [];
  $scope.geofenceMarkers = [];
  $scope.path = undefined;
  $scope.patientPath = undefined;
  $scope.currentPatientLocationMarker = undefined;
  $scope.locationAccuracyMarker = undefined;
  $scope.patientLocationAccuracyMarker = undefined;
  $scope.stationaryRadiusMarker = undefined;
  $scope.patientLocationMarkers = [];
  $scope.patientPreviousLocation = undefined;
  $scope.carerGooglePositions = undefined;
  $scope.carerMarkers = undefined;
  $scope.geofenceRecord = {};
  $scope.patientHomePosition = undefined;

  //todo: implement the below 2 statements in all other views as well.
  $scope.$on('$ionicView.enter', function () {

    //retrieve user data here.
    currentUser = User.currentUser();

    if (currentUser.userType == 'carer') {
      connectedPatientData = User.getConnectedPatient();
    }
    $scope.userType = currentUser.userType;

  });

  $scope.$on('$ionicView.leave', function () {

    //cancel the interval checking for new patient geofences
    $interval.cancel(instantiatePatientGeofences);

    //cancel interval for updating patient location
    if (currentUser.userType == 'carer') {
      $interval.cancel(retrieveLatestPatientLocation);
    } else {
      $interval.cancel(retrieveLatestCarerLocations);
    }

    //clear out any variables that may get cached and cause issues on signing out and back in again
    currentUser = null;
  });

  //function to be re-run to retrieve updated user data if patient and instantiate geo-fences
  function instantiatePatientGeofences() {

    console.log('carer user is checking for updated patient geofences and updating markers');

    var userIdToGetData, patientGeofences;
    if (currentUser.userType == 'patient') {
      userIdToGetData = currentUser.user_id;

      User.getUserData(userIdToGetData).then(function (response) {

        currentUser = response;
        patientGeofences = currentUser.patientGeofences; //assign the newly retrieved geofences

        if (!geolocationPlugin) {

          //clear all current geofence markers
          angular.forEach($scope.geofenceMarkers, function (geofence) {

            //remove the geofence marker
            removeGeofence(geofence.identifier);
          });

          //if there is no geolocation plugin, just create markers on the map
          angular.forEach(patientGeofences, function (geofence) {

            //for all users, create the geofence markers
            addNewGeofenceMarker(geofence); //todo: test that this actually works !!!
          });
        } else {
          geolocationPlugin.getGeofences(function (rs) {

            //remove all existing device geofences
            for (var n = 0, len = rs.length; n < len; n++) {

              //compare to the geofences on the user data and if
              removeGeofence(rs[n].identifier);
            }

            //instantiate all geofences as listed on the patient user
            angular.forEach(patientGeofences, function (geofence) {

              //for all users, create the geofence markers
              addNewGeofenceMarker(geofence); //todo: test that this actually works !!!

              //only actually instantiate the geofences on patient devices
              if (currentUser.userType == 'patient') {

                //instantiate this geofence on the patient device and add a marker
                geolocationPlugin.addGeofence(geofence, function () {
                  console.log('geofence created on patient device with identifier: ' + geofence.identifier);
                }, function (error) {
                  console.error(error);
                  alert("Failed to add geofence: " + error);
                });
              }
            });
          });
        }
      }).catch(function (error) {

        $ionicPopup.alert({
          title: 'Oops! Something went wrong!',
          template: 'An error occured attempting to featch up to date user data! : ' + error
        });
      });

    } else { //if the user is a carer user
      userIdToGetData = currentUser.connectedPatient.user_id;

      //retrieve up to date patient data (specifically want updates to geofences)
      User.loadConnectedPatientData(userIdToGetData).then(function (response) {

        connectedPatientData = response;
        patientGeofences = connectedPatientData.patientGeofences;

        //if there is no geolocation plugin, just create markers on the map
        angular.forEach(patientGeofences, function (geofence) {

          //for all users, create the geofence markers
          addNewGeofenceMarker(geofence); //todo: test that this actually works !!!
        });
      }).catch(function (error) {

        $ionicPopup.alert({
          title: 'Oops! Something went wrong!',
          template: 'An error occured attempting to fetch up to date user data! : ' + error
        })
      });
    }
  }

  function retrieveLatestPatientLocation() {

    console.log('carer user is checking for updated patient locations and updating patient marker');

    //retrieve the latest patient information
    User.loadConnectedPatientData().then(function (response) {

      //assign the newly recieved data back to the scope
      connectedPatientData = response;

      //update the patient's location on the carer's map
      $scope.setCurrentPatientLocationMarker(response.location);

    }).catch(function (error) {

      //alert the user something went wrong
      $ionicPopup.alert({
        title: 'Oops! Something went wrong!',
        template: 'An error occurred when attempting to fetch updated patient location, please try again!'
      });

      //prevent an infinite loop
      $interval.cancel(retrieveLatestPatientLocation);
    });
  }

  //function is run periodically to retrieve up to date carer locations, this is only run if user is a patient
  function retrieveLatestCarerLocations() {

    //construct object of carer user ids to send to the server
    var carerUserIds = {
      patientCarerUserIds: []
    };

    //use underscore to pluck list of carer user ids from list of carers on current patient user
    carerUserIds.patientCarerUserIds = _.pluck(currentUser.connectedCarers, 'user_id');

    //query the server to retrieve the most up to date carer locations
    User.retrieveCarerLocations(carerUserIds).then(function (response) {

      //will recieve a list of objects containing updated carer locations with user_ids attached
      console.log('Successfully retrieved up to date carer locations! : ' + JSON.stringify(response));

      var updatedCarerLocations = response.data;

      //clear out currently held list of carer distances
      $scope.carerDistances = [];

      //clear out the list of carer google permissions before updating it
      $scope.carerGooglePositions = [];

      //clear out pre-existing list of carer markers
      angular.forEach($scope.carerMarkers, function (carerMarker) {

        //clear marker from the map
        carerMarker.setMap(null);
      });

      //empty the list of carer markers
      $scope.carerMarkers = [];

      //now plot the carer locations and calculate the distance they are from the patient
      angular.forEach(updatedCarerLocations, function (carer_location) {

        //generate google maps api lat long position for marker
        var currentCarerPos = new google.maps.LatLng(carer_location.lat, carer_location.long);

        //add position to the global list of carer positions
        $scope.carerGooglePositions.push(currentCarerPos);

        //create a new marker to display on the map
        var currentCarerMarker = new google.maps.Marker({
          map: $scope.map,
          animation: google.maps.Animation.DROP,
          position: currentCarerPos
        });


        //add marker to the global array of markers
        $scope.carerMarkers.push(currentCarerMarker);

        //generate dom with button to invoke the finding of a route to the current carer's location
        var contentString = "<div><p>Carer: " + carer_location.name + "</p><br><button class='btn-small btn-positive' ng-click='showRouteInfo(2, " + currentCarerPos.lat() + "," + currentCarerPos.lng()
          + ")'>Get walking directions!</button></div>";
        var compiled = $compile(contentString)($scope);

        //generate window for marker
        var currentCarerInfoWindow = new google.maps.InfoWindow({
          content: compiled[0] //the html is at position 0 of the jqLite element object
        });

        //add this info window to the global array of info windows
        infoWindows.push(currentCarerInfoWindow);

        //add listener for the marker
        google.maps.event.addListener(currentCarerMarker, 'click', function () {

          closeAllInfoWindows();

          currentCarerInfoWindow.open($scope.map, currentCarerMarker);
        });
      });

      //invoke function to update distances of each carer to patient user
      $scope.calculateClosestCarer();

    }).catch(function (error) {

      //tell the error that something has gone wrong
      $ionicPopup.alert({
        title: 'Error occurred when attempting to retrieve latest carer locations!',
        template: 'An error occurred trying to fetch up to date carer locations, please try again! Error: ' + JSON.stringify(error)
      });

      //prevent an infinite loop
      $interval.cancel(retrieveLatestCarerLocations);
    });
  }

  function closeAllInfoWindows() {
    for (var i = 0; i < infoWindows.length; i++) {
      infoWindows[i].close();
    }
  }

  function initLocationTracking() {

    $scope.geolocationPlugin.isMoving = false;
    var beginTracking = !$scope.geolocationPlugin.isMoving;

    geolocationPlugin.changePace(beginTracking, function () {
      $scope.geolocationPlugin.isMoving = beginTracking;
    });

    $scope.geolocationPlugin.enabled = false;

    geolocationPlugin.start(function () {

      //tell localstorage that the location plugin has been enabled
      window.localStorage.setItem('geolocationPlugin:enabled', willEnable);

      $scope.geolocationPlugin.enabled = true;
      var isEnabled = $scope.geolocationPlugin.enabled;

      if (!isEnabled) {

        $scope.geolocationPlugin.isMoving = false;

        // Clear previousLocation
        $scope.previousLocation = undefined;

        // Clear location-markers.
        var marker;
        for (var n = 0, len = $scope.locationMarkers.length; n < len; n++) {
          marker = $scope.locationMarkers[n];
          marker.setMap(null);
        }
        $scope.locationMarkers = [];

        // Clear geofence markers.
        for (var n = 0, len = $scope.geofenceMarkers.length; n < len; n++) {
          marker = $scope.geofenceMarkers[n];
          marker.setMap(null);
        }
        $scope.geofenceMarkers = [];


        // Clear red stationaryRadius marker
        if ($scope.stationaryRadiusMarker) {
          $scope.stationaryRadiusMarker.setMap(null);
          $scope.stationaryRadiusMarker = null;
        }

        // Clear blue route PolyLine
        if ($scope.path) {
          $scope.path.setMap(null);
          $scope.path = undefined;
        }

      }
    }, function (error) {
      alert('Failed to start tracking with error code: ' + error);
    });

  }

  function addNewGeofenceMarker(params) {
    var geofence = new google.maps.Circle({
      zIndex: 100,
      fillColor: '#11b700',
      fillOpacity: 0.2,
      strokeColor: '#11b700',
      strokeWeight: 2,
      strokeOpacity: 0.9,
      params: params,
      radius: parseInt(params.radius, 10),
      center: new google.maps.LatLng(params.latitude, params.longitude),
      map: $scope.map
    });

    // Add 'click' listener to geofence so we can edit it. only if carer user
    if (currentUser.userType == 'carer') {

      google.maps.event.addListener(geofence, 'click', function () {
        $scope.onShowGeofence(this.params);
      });
    }

    $scope.geofenceMarkers.push(geofence);
    return geofence;
  };

  function retrieveGeofenceMarkerRef(identifier) {
    var index = $scope.geofenceMarkers.map(function (geofence) {
      return geofence.params.identifier;
    }).indexOf(identifier);
    if (index >= 0) {
      return $scope.geofenceMarkers[index];
    }
    return -1;
  };

  function removeGeofence(identifier) {
    var marker = retrieveGeofenceMarkerRef(identifier);
    if (marker && marker.setMap) {
      var index = $scope.geofenceMarkers.indexOf(marker);
      $scope.geofenceMarkers.splice(index, 1);
      marker.setMap(null); //removes from map
      if (marker.removed) {
        return;
      }
    }
  };

  //retrieve the user's initial location and instantiate all map markers, routes and geofences
  navigator.geolocation.getCurrentPosition(function (pos) {

    //set the current user location
    $scope.currentLocation = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    var mapOptions = {
      center: $scope.currentLocation,
      zoom: 30,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    //instantiate the google map
    $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);
    //$scope.loading.hide();

    //create option buttons depending on the user type
    $scope.mapOptionButtons = [
      {text: '<i class="icon ion-navigate"></i> Get Current Location'},
      {text: '<i class="icon ion-pinpoint"></i> Re-center Map'}
    ];

    //configure available options based on the type of user
    if (currentUser.userType == 'patient') {

      $scope.mapOptionButtons.push(
        {text: '<i class="icon ion-map"></i> Find closest carer'},
        {text: '<i class="icon ion-home"></i> Find route home'}
      );
    } else {

      //add options to easily center in on the patient's location
      $scope.mapOptionButtons.push(
        {text: '<i class="icon ion-person"></i> Go to patient location'}
      );
    }

    //add location markers to the map once the the map has loaded
    google.maps.event.addListenerOnce($scope.map, 'idle', function () {

      ionic.Platform.ready(function () {
        if (!geolocationPlugin) {
          return;
        }
        geolocationPlugin.getGeofences(function (rs) {
          for (var n = 0, len = rs.length; n < len; n++) {
            addNewGeofenceMarker(rs[n]);
          }
        });

        //initialise geolocation tracking
        initLocationTracking();

        // Add BackgroundGeolocation event-listeners when Platform is ready.
        geolocationPlugin.on('motionchange', $scope.beginMoving);
        geolocationPlugin.on('geofence', $scope.onGeofence);

      });

      instantiatePatientGeofences();

      //once the map has loaded, proceed with the rendering of geofences check for new geofences every minute
      $interval(instantiatePatientGeofences, 100000);

      //add the marker for the current user's current location! todo: get this using the cordova geolocation plugin
      $scope.setCurrentLocationMarker(pos);

      //depending on user type, display markers
      if (currentUser.userType == 'patient') {

        //invoke function to plot current patient users carer markers
        retrieveLatestCarerLocations();

        //set function to monitor and update carer locations to run repeatedly every 30 seconds
        $interval(retrieveLatestCarerLocations, 100000);

        //parse the patient's address into a singular string
        var address = '';
        var patientHomePosition;
        //check to see if there is a pre-existing home address latitude and longitude
        if (currentUser.homeAddress.homeLat && currentUser.homeAddress.homeLong) { //PLOT PATIENT USER HOME

          $scope.patientHomePosition = new google.maps.LatLng(currentUser.homeAddress.homeLat, currentUser.homeAddress.homeLong);

          var patientHomeMarker = new google.maps.Marker({
            map: $scope.map,
            position: $scope.patientHomePosition
          });

          //add this marker to the global list of markers
          $scope.locationMarkers.push(patientHomeMarker);

          //generate dom for window, window and ng-click binding for patient to find a route home!
          var contentString = "<div><p>Home Address</p><br><button class='btn-small btn-positive' " +
            "ng-click='showRouteInfo(2, " + $scope.patientHomePosition.lat() + "," + $scope.patientHomePosition.lng()
            + ")'>Get directions to your home!</button></div>";
          var compiled = $compile(contentString)($scope);

          //generate window for marker
          var patientHomeMarkerWindow = new google.maps.InfoWindow({
            content: compiled[0] //the html is at position 0 of the jqLite element object
          });

          //add this info window to the global array of info windows
          infoWindows.push(patientHomeMarkerWindow);

          //add listener for the marker
          google.maps.event.addListener(patientHomeMarker, 'click', function () {

            closeAllInfoWindows();
            patientHomeMarkerWindow.open($scope.map, patientHomeMarker);
          });

        } else { //geocode patient's home address into a Google Maps JavaScript API location with latitude and longitude

          //iterate over each key value pait in the address object
          _.each(currentUser.homeAddress, function (value) {

            //build a singular string using each of the home address keys
            if (value) {
              address += value + ', ';
            }
          });

          geocoder.geocode({'address': address}, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {

              $scope.patientHomePosition = results[0].geometry.location;

              var patientHomeMarker = new google.maps.Marker({
                map: $scope.map,
                position: $scope.patientHomePosition
              });

              //add this marker to the global list of markers
              $scope.locationMarkers.push(patientHomeMarker);

              //generate dom for window, window and ng-click binding for patient to find a route home!
              var contentString = "<div><p>Home Address</p><br><button class='btn-small btn-positive' " +
                "ng-click='showRouteInfo(2, " + $scope.patientHomePosition.lat() + "," + $scope.patientHomePosition.lng()
                + ")'>Get directions to your home!</button></div>";
              var compiled = $compile(contentString)($scope);

              //generate window for marker
              var patientHomeMarkerWindow = new google.maps.InfoWindow({
                content: compiled[0] //the html is at position 0 of the jqLite element object
              });

              //add this info window to the global array of info windows
              infoWindows.push(patientHomeMarkerWindow);

              //add listener for the marker
              google.maps.event.addListener(patientHomeMarker, 'click', function () {

                closeAllInfoWindows();
                patientHomeMarkerWindow.open($scope.map, patientHomeMarker);
              });

              //save the latitude and longitude with the patient's home address and check for before geocoding
              User.updateHomeLocation(patientHomePosition.lat(), patientHomePosition.lng()).then(function (response) {
                currentUser = response.data;
              }).catch(function (error) {

                $ionicPopup.alert({
                  title: "Oops! Something went wrong!",
                  template: "There was a problem when trying to update patient home location, please try again! <br><br> Error: " + JSON.stringify(error)
                });
              });
            } else {

              //let the user know there was an error fetching up to date invitations
              $ionicPopup.alert({
                title: "Oops! Something went wrong!",
                template: "There was a problem when trying to retrieve patient location, please try again! <br><br> Error: " + JSON.stringify(error)
              });
            }
          });
        }
      } else { // IF USER IS A CARER

        //set the patient location marker
        retrieveLatestPatientLocation();

        //POLL continually check for and update the patient location path and marker, check every 3 seconds
        $interval(retrieveLatestPatientLocation, 10000);

        $scope.frameMarkers();
      }

      // after checking user type create action sheet
      $scope.mapOptions = function () {

        // Show the action sheet
        $ionicActionSheet.show({
          buttons: $scope.mapOptionButtons,
          titleText: 'Map Options',
          cancelText: 'Cancel',
          buttonClicked: function (index) {

            //run code based on witch button the user picked
            switch (index) {
              case 0: //get current user's location on the map
                $scope.getCurrentPosition();
                break;
              case 1:
                $scope.frameMarkers();
                break;
              case 2:
                if (currentUser.userType == 'patient') {
                  //find route to the closest carer
                  $scope.closestCarerRoute();
                } else {

                  //locate the patient and zoom in on their location marker on the map
                  $scope.centerOnPatient($scope.currentPatientLocation);
                }
                break;
              case 3:
                if (currentUser.userType == 'patient') {
                  //find route home
                  $scope.homeRoute();
                }
                break
            }
            return true;
          }
        });
      };
    });
  }, function (error) {

    //let the user know there was an error fetching up to date invitations
    $ionicPopup.alert({
      title: "Oops! Something went wrong!",
      template: "There was a problem when trying to retrieve your initial location, please try again! <br><br> Error: " + JSON.stringify(error)
    });
  });

  $scope.calculateClosestCarer = function () {

    //once each of the carer locations is parsed, retrieve distances to each carer using the distanceMatrix service
    distanceService.getDistanceMatrix(
      {
        origins: [
          {
            lat: $scope.currentLocation.coords.latitude,
            lng: $scope.currentLocation.coords.longitude
          }
        ],
        destinations: $scope.carerGooglePositions, //todo: create and maintain a list of Google carer positions on the scope
        travelMode: google.maps.TravelMode.WALKING
      }, function (response) {

        var origins = response.originAddresses;

        for (var i = 0; i < origins.length; i++) {
          var results = response.rows[i].elements;
          for (var j = 0; j < results.length; j++) {
            var element = results[j];

            //assuming the the index of the distance matches the index of the corresponding carer

            //find corresponding carer
            var location = $scope.carerGooglePositions[j];

            if (element.distance.value) {
              var newCarerDistance = {
                location: location,
                distance: element.distance.value
              };

              $scope.carerDistances.push(newCarerDistance);
            }
          }
        }

        //now show the button to find the closest carer and a route to them
        $scope.closestCarerKnown = true;

        //tell angular to update the view
        $scope.$apply();
      }
    );
  };

  //function to center the map on the patient's location
  $scope.centerOnPatient = function (location) {

    //focus the map on the new patient's location
    $scope.map.setCenter(new google.maps.LatLng(location.lat, location.long));

    //update the patient's location and path
    $scope.setCurrentPatientLocationMarker(location);
  };

  //function to update the patient's location marker on the carer and update patient location and path
  $scope.setCurrentPatientLocationMarker = function (location) {

    // Set currentLocation @property
    $scope.currentPatientLocation = location;

    if (!$scope.currentPatientLocationMarker) {

      //create a new location marker for the patient
      $scope.currentPatientLocationMarker = new google.maps.Marker({
        map: $scope.map,
        zIndex: 10,
        title: 'Current Patient Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#7cfc00',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeOpacity: 1,
          strokeWeight: 6
        }
      });

      //add marker to the global array of markers
      $scope.locationMarkers.push($scope.currentPatientLocationMarker);

      //set a circle around the patient location marker to denote accuracy
      $scope.patientLocationAccuracyMarker = new google.maps.Circle({
        zIndex: 9,
        fillColor: '#90ee90',
        fillOpacity: 0.4,
        strokeOpacity: 0,
        map: $scope.map
      });
    }

    if (!$scope.patientPath) {
      $scope.patientPath = new google.maps.Polyline({
        zIndex: 1,
        map: $scope.map,
        geodesic: true,
        strokeColor: '#228b22',
        strokeOpacity: 0.7,
        strokeWeight: 5
      });
    }
    var latlng = new google.maps.LatLng(location.lat, location.long);

    if ($scope.patientPreviousLocation) {
      var prevLocation = $scope.patientPreviousLocation;

      $scope.patientLocationMarkers.push(new google.maps.Marker({
        zIndex: 1,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#11b700',
          fillOpacity: 1,
          strokeColor: '#0d6104',
          strokeWeight: 1,
          strokeOpacity: 0.7
        },
        map: $scope.map,
        position: new google.maps.LatLng(prevLocation.lat, prevLocation.long)
      }));
    }

    // Update our current position marker and accuracy bubble.
    $scope.currentPatientLocationMarker.setPosition(latlng); //moves the patient marker on the map
    $scope.patientLocationAccuracyMarker.setCenter(latlng); //update the patient accuracy circle
    $scope.patientLocationAccuracyMarker.setRadius(location.accuracy); //update accuracy of patient location

    //Update the click event handler and create geofence function for the patient's current location marker
    var contentString = "<div><p>Patient: " + currentUser.connectedPatient.patient_name
      + "</p><br><button class='btn-small btn-positive' ng-click='showRouteInfo(1, " + location.lat + "," + location.long
      + ")'>Get driving directions!</button><button ng-click='createGeofence(" + location.lat + "," + location.long
      + ")'>Create Patient Geofence</button></div>";

    var compiled = $compile(contentString)($scope);

    //generate window for marker
    var patientInfoWindow = new google.maps.InfoWindow({
      content: compiled[0] //the html is at position 0 of the jqLite element object
    });

    //add this info window to the global array of info windows
    infoWindows.push(patientInfoWindow);

    //clear any existing listeners (would create a geofence for previous location!!!)
    google.maps.event.clearListeners($scope.currentPatientLocationMarker, 'click');

    //add listener for the marker
    google.maps.event.addListener($scope.currentPatientLocationMarker, 'click', function () {

      //close all other infoWindows
      closeAllInfoWindows();

      patientInfoWindow.open($scope.map, $scope.currentPatientLocationMarker);
    });

    // Add breadcrumb to current Polyline path.
    $scope.patientPath.getPath().push(latlng); //update the patient's journey path
    $scope.patientPreviousLocation = location; //set the patient's previous location
  };

  $scope.beginMoving = function (isMoving, location, taskId) {

    window.localStorage.setItem('geolocationPlugin:isMoving', isMoving);
    $scope.geolocationPlugin.isMoving = isMoving;

    if ($scope.map) {
      $scope.map.setCenter(new google.maps.LatLng(location.coords.latitude, location.coords.longitude));
      if (!isMoving) {
        $scope.setStationaryMarker(location);
      } else if ($scope.stationaryRadiusMarker) {
        $scope.setCurrentLocationMarker(location);
        $scope.stationaryRadiusMarker.setMap(null);
      }
    }
    geolocationPlugin.finish(taskId);
  };

  $scope.setStationaryMarker = function (location) {
    $scope.setCurrentLocationMarker(location);

    var newPos = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };

    User.updateLocation(newPos).then(function () {

      console.log('Successfully updated user position');

    }).catch(function (error) {

      $ionicPopup.alert({
        title: "Oops! Something went wrong!",
        template: "There was a problem when trying to retrieve up to date user location, please try again! <br><br> Error: " + JSON.stringify(error)
      });
    });

    var coords = location.coords;

    if (!$scope.stationaryRadiusMarker) {
      $scope.stationaryRadiusMarker = new google.maps.Circle({
        zIndex: 0,
        fillColor: '#ff0000',
        strokeColor: '#aa0000',
        strokeWeight: 2,
        fillOpacity: 0.5,
        strokeOpacity: 0.5,
        map: $scope.map
      });
    }
    var radius = 50;
    var center = new google.maps.LatLng(coords.latitude, coords.longitude);
    $scope.stationaryRadiusMarker.setRadius(radius);
    $scope.stationaryRadiusMarker.setCenter(center);
    $scope.stationaryRadiusMarker.setMap($scope.map);
    $scope.map.setCenter(center);
  };

  $scope.setCurrentLocationMarker = function (location) {

    // Set currentLocation @property
    $scope.currentLocation = location;

    var coords = location.coords;

    if (!$scope.currentLocationMarker) {
      $scope.currentLocationMarker = new google.maps.Marker({
        map: $scope.map,
        zIndex: 10,
        title: 'Current Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#2677FF',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeOpacity: 1,
          strokeWeight: 6
        }
      });
      $scope.locationAccuracyMarker = new google.maps.Circle({
        zIndex: 9,
        fillColor: '#3366cc',
        fillOpacity: 0.4,
        strokeOpacity: 0,
        map: $scope.map
      });
    }

    if (!$scope.path) {
      $scope.path = new google.maps.Polyline({
        zIndex: 1,
        map: $scope.map,
        geodesic: true,
        strokeColor: '#2677FF',
        strokeOpacity: 0.7,
        strokeWeight: 5
      });
    }
    var latlng = new google.maps.LatLng(coords.latitude, coords.longitude);

    if ($scope.previousLocation) {
      var prevLocation = $scope.previousLocation;

      $scope.locationMarkers.push(new google.maps.Marker({
        zIndex: 1,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#11b700',
          fillOpacity: 1,
          strokeColor: '#0d6104',
          strokeWeight: 1,
          strokeOpacity: 0.7
        },
        map: $scope.map,
        position: new google.maps.LatLng(prevLocation.coords.latitude, prevLocation.coords.longitude)
      }));
    }

    // Update our current position marker and accuracy bubble.
    $scope.currentLocationMarker.setPosition(latlng);
    $scope.locationAccuracyMarker.setCenter(latlng);
    $scope.locationAccuracyMarker.setRadius(location.coords.accuracy);

    if (location.sample === true) {
      return;
    }

    // Add breadcrumb to current Polyline path.
    $scope.path.getPath().push(latlng);
    $scope.previousLocation = location;
  };

  $scope.getCurrentPosition = function () {
    if (!$scope.map) {
      return;
    }

    if (!window.BackgroundGeolocation) {

      //get location using browser
      console.log('device background geolocation plugin not present, retrieving location using HTML navigation API');

      navigator.geolocation.getCurrentPosition(function (pos) {

        console.log('successfully retieved current location using HTML5 navigator object, centering map');
        $scope.zoomMapToNewLocation(pos);
      });
    } else {
      geolocationPlugin.getCurrentPosition(function (location, taskId) {
        $scope.zoomMapToNewLocation(location);
        geolocationPlugin.finish(taskId);
      }, function (error) {
        console.error("Problem when attempting getCurrentPostion: ", error);
      }, {
        maximumAge: 0,
        timeout: 30
      });
    }
  };

  $scope.zoomMapToNewLocation = function (params) {

    $scope.map.setCenter(new google.maps.LatLng(params.coords.latitude, params.coords.longitude));
    $scope.setCurrentLocationMarker(params);

    //will only be triggered for patient
    if (params.geofence) {

      $ionicPopup.alert({
        title: 'Geofence action detected! Notifying Carers',
        template: 'You have triggered the geofence ' + params.geofence.identifier + ' by ' + params.geofence.action
        + ' notifying your carers, just in case!'
      });

      //send the geofence action to the server and alert carers of patient movement
      User.alertGeofenceAction(params.geofence).catch(function (error) {

        console.log('error occurred attempting to send geofence action push notifications to carers');

        $ionicPopup.alert({
          title: 'Oops! Something went wrong!',
          template: 'An error occured attempting to notify carers of your activity, please try again!: ' + JSON.stringify(error)
        });
      });
    }

    //construct location object to post to server
    var updatedPatientLocation = {
      latitude: params.coords.latitude,
      longitude: params.coords.longitude,
      accuracy: params.coords.accuracy
    };

    //update the patient's location on the server
    User.updateLocation(updatedPatientLocation).then(function (response) {

      console.log('successfully updated the patient location on the server');

      currentUser = response.data;

    }).catch(function (error) {

      console.log('error occurred attempting to send updated patient location to server');

      $ionicPopup.alert({
        title: 'Oops! Something went wrong!',
        template: 'An error occured attempting to update your location on the server, please try again!: ' + JSON.stringify(error)
      });
    });
  };

  $scope.createGeofence = function (lat, lng) {
    geofenceCursor.setPosition({lat: lat, lng: lng});
    $scope.onAddGeofence(geofenceCursor.getPosition());
    //geofenceCursor.setMap(null);
    //geofenceCursor.setMap($scope.map);
  };

  $scope.onAddGeofence = function (latLng) {
    $scope.geofenceRecord = {
      latitude: latLng.lat(),
      longitude: latLng.lng(),
      identifier: '',
      radius: 200,
      notifyOnEntry: true,
      notifyOnExit: false,
      notifyOnDwell: false,
      loiteringDelay: undefined
    };
    $scope.addGeofenceModal.show();
  };

  $ionicModal.fromTemplateUrl('templates/create-new-geofence.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    $scope.addGeofenceModal = modal;
  });

  $ionicModal.fromTemplateUrl('templates/edit-geofence.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    $scope.showGeofenceModal = modal;
  });

  $scope.addNewGeofence = function () {
    $scope.addGeofenceModal.hide();

    //now add the geofence to the patient
    User.createPatientGeofence($scope.geofenceRecord).then(function (response) {

      currentUser = response.data[0];
      connectedPatientData = response.data[1];

      //render the new geofence just created
      addNewGeofenceMarker($scope.geofenceRecord);

    }).catch(function (error) {

      $ionicPopup.alert({
        title: 'Error occured trying to create geofence on patient',
        template: 'An unexpected error occurred when attempting to add the geofence to the patient: ' + error
      })
    });
  };

  $scope.onCancelGeofence = function () {
    $scope.modal.hide();
  };

  $scope.onShowGeofence = function (params) {
    $scope.geofenceRecord = params;
    $scope.showGeofenceModal.show();
  };

  $scope.onRemoveGeofence = function () {
    var identifier = $scope.geofenceRecord.identifier;

    //remove this geofence from the patient by making an api call
    User.removePatientGeofence(identifier).then(function (response) {

      //update the user and patient data via the response
      currentUser = response.data[0];
      connectedPatientData = response.data[1];

      //now remove the marker and geofence
      removeGeofence(identifier);
      $scope.showGeofenceModal.hide();

    }).catch(function (error) {

      $ionicPopup.alert({
        title: 'Error when attempting to remove patient geofence!',
        template: 'An error occurred when attempting to delete the geofence from the patient, please try again!'
      })
    });
  };

  //calculate routes to users
  $scope.showRouteInfo = function (travelMode, destinationLat, destinationLng) {

    //close all open infoWindows
    closeAllInfoWindows();

    //clear out any existing route information that might already be being displayed
    document.getElementById('directionsPanel').innerHTML = '';

    $scope.responseCount = 0;

    //parse passed in location coordinates into google location
    var destinationLocation = new google.maps.LatLng(destinationLat, destinationLng);

    var request = {
      origin: {lat: $scope.currentLocation.coords.latitude, lng: $scope.currentLocation.coords.longitude},
      destination: destinationLocation,
      travelMode: travelMode == 1 ? google.maps.TravelMode.DRIVING : google.maps.TravelMode.WALKING
    };
    directionsService.route(request, function (response, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        directionsDisplay.setDirections(response);
        $scope.showRoute = true;

        //tell angular to update view
        $scope.$apply();
      }
    });

    directionsDisplay.setMap($scope.map);
    directionsDisplay.setPanel(document.getElementById('directionsPanel'));
  };

  $scope.clearRoute = function () {

    //close all info windows
    closeAllInfoWindows();

    //clear the route from the map
    directionsDisplay.setMap(null);

    //set show route flag to false
    $scope.showRoute = false;

    //clear the directions
    document.getElementById('directionsPanel').innerHTML = '';

  };

  $scope.homeRoute = function () {

    //display the route to the patient's home
    $scope.showRouteInfo(2, $scope.patientHomePosition.lat(), $scope.patientHomePosition.lng());
  };

  $scope.closestCarerRoute = function () {

    //calculate the closest carer
    var closestCarer = _.min($scope.carerDistances, function (carerDistance) {
      return carerDistance.distance;
    });

    //get the route to this closest carer
    $scope.showRouteInfo(2, closestCarer.location.lat(), closestCarer.location.lng());
  };

  $scope.frameMarkers = function () {

    //once all map markers have been loaded, adjust the map zoom to fit aroud all displayed markers
    var bounds = new google.maps.LatLngBounds();
    var allMarkers = [];

    if (currentUser.userType == 'patient') {
      allMarkers = $scope.locationMarkers.concat($scope.carerMarkers);
    } else {
      allMarkers = $scope.locationMarkers.concat($scope.patientLocationMarkers);
    }

    //append the user's current location
    allMarkers = allMarkers.concat($scope.currentLocationMarker);

    for (var i = 0; i < allMarkers.length; i++) {
      bounds.extend(allMarkers[i].getPosition());
    }

    //adjust map zoom
    $scope.map.fitBounds(bounds);
  };
});
