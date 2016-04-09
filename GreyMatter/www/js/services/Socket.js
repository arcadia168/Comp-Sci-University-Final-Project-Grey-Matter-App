angular.module('greyMatter').factory('Socket',function(socketFactory, RunMode){
  //Create socket and connect to http://chat.socket.io
  //var myIoSocket = io.connect('http://chat.socket.io');
  var SERVER = RunMode.server().slice(0, -4); //remove the '/api' from server url string
  
  //connect to socket on our server, my precious.
  var myIoSocket = io.connect(SERVER);

  mySocket = socketFactory({
    ioSocket: myIoSocket
  });

  return mySocket;
});
