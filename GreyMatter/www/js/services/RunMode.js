angular.module('greyMatter').factory('RunMode', [function () {

  //TO SET THE WHOLE APP TO RELEASE MODE CHANGE THIS HERE
  var debugRelease = 'release';//'debug'//'release';//'deviceDebug';

  var serverToUse = '';

  var runMode = {}; //object to be returned by the factory for use all over - this is a singleton (I think)

  if (debugRelease == 'release') {
    serverToUse = "http://greymatterapi-arcadia168.rhcloud.com:8000/api";
  } else if (debugRelease == 'deviceDebug') {
    //running the app on the device hosting server on mac
    //use the ip address of mac from router, port 8000 as usual
    var code = 'ktreqzppxr'; //todo: change this code for every different instance of localtunnel
    var localTunnelUrl = 'https://' + code + '.localtunnel.me'; //THIS WILL CHANGE DYNAMICALLY, UPDATE ALWAYS
    console.log("Local tunnel url is: %s", localTunnelUrl);
    serverToUse = localTunnelUrl + "/api";
  } else { //inefficiency for the sake of ease of reading here
    // serverToUse = "http://10.0.3.2:8000/api";
    serverToUse = "http://localhost:8000/api";
  }

  //Now assign the server being used to a property of the service
  runMode.server = function () {
    return serverToUse;
  };

  //return this object to quickly get which server to use
  return runMode;
}]);
