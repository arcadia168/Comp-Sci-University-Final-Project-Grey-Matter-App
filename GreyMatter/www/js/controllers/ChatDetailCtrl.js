//view individual chats with various people (different carers)
angular.module('greyMatter').controller('ChatDetailCtrl', function ($scope, $stateParams, User, Socket,
                                                                    _, $sanitize, $timeout, $ionicScrollDelegate,
                                                                    $ionicNavBarDelegate) {

  //globally used copy of currently logged in user profile WARNING: THIS GETS CACHED
  var currentUser;

  $scope.currentPlatform = ionic.Platform.platform();

  var self = this;
  var typing = false;
  var lastTypingTime;
  var typing_timeout = 400;
  var connected = false;

  //initializing messages array
  self.messages = [];

  $scope.$on('$ionicView.enter', function () {

    //todo: retrieve up to date chat messages to display here as stored on the server
    self.messages = [];

    //ensure this gets refreshed (not using cached version) every time the tab is reloaded!!!
    currentUser = User.currentUser();

    //work out who were are chatting to
    if (currentUser.userType == 'carer') {

      //set chat window if the user is a carer
      $scope.chattingTo = User.getConnectedPatient();

      $scope.chattingToTitle = $scope.chattingTo.firstName + ' ' + $scope.chattingTo.lastName;

      $ionicNavBarDelegate.showBackButton(false);
    } else {

      //find corresponding carer using given carer user_id
      $scope.chattingTo = _.findWhere(currentUser.connectedCarers, {'user_id': $stateParams.recipientId});

      $scope.chattingToTitle = $scope.chattingTo.carer_name;
    }

    //Add user
    if (currentUser.userType == 'carer') {
      Socket.emit('adduser', currentUser.user_id, currentUser.user_id);
    } else {

      //Use the chosen carer's id as the unique id for the chat 'room' for socket.io (conversation/chat)
      Socket.emit('adduser', currentUser.user_id, $scope.chattingTo.user_id);
    }
  });

  $scope.$on('$ionicView.leave', function () {

    //ensure we don't cache the current user
    currentUser = null;

    //clear any messages also cached on this view's controller!
    self.messages = [];

    //tell the server this user is no longer present on this chat!
    Socket.emit('leave chat');
  });

  Socket.on('connect', function () {

    console.log('connected to chat socket');
    connected = true;
  });

  // Whenever the server emits 'new message', update the chat body
  Socket.on('new message', function (data) {
    if (data.message && data.username) {
      parseMessageInView(data.username, true, data.message)
    }
  });

  // Whenever the server emits 'user joined', log it in the chat body
  Socket.on('user joined', function (data) {
    parseMessageInView("", false, "joined the chat");
  });

  // Whenever the server emits 'user left', log it in the chat body
  Socket.on('user left', function (data) {
    parseMessageInView("", false, " left the chat");
  });

  //Whenever the server emits 'typing', show the typing message
  Socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  Socket.on('stop typing', function (data) {
    hideTyping(data.username);
  });

  //function called when user hits the send button
  self.sendMessage = function () {
    Socket.emit('sendchat', self.message);
    parseMessageInView(User.currentUser().user_id, true, self.message);
    Socket.emit('stop typing');
    self.message = ""
  };

  //function called on Input Change
  self.updateTyping = function () {
    notifyIsTyping()
  };

  // Display message by adding it to the message list
  function parseMessageInView(username, style_type, message) {
    username = $sanitize(username);
    hideTyping(username);
    var color = '#ffffff';

    //alter username here
    if (username == currentUser.user_id) {
      message = 'You : ' + message;
    } else if (currentUser.userType == 'patient'){
      message = 'Carer : ' + message;
    } else {
      message = 'Patient : ' + message;
    }

    self.messages.push({content: $sanitize(message), style: style_type, username: username, color: color});
    $ionicScrollDelegate.scrollBottom();
  }

  // Updates the typing event
  function notifyIsTyping() {
    if (!typing) {
      typing = true;
      Socket.emit('typing');
    }
    lastTypingTime = (new Date()).getTime();
    $timeout(function () {
      var typingTimer = (new Date()).getTime();
      var timeDiff = typingTimer - lastTypingTime;
      if (timeDiff >= typing_timeout && typing) {
        Socket.emit('stop typing');
        typing = false;
      }
    }, typing_timeout)
  }

  // Adds the visual chat typing message
  function addChatTyping(data) {
    parseMessageInView(data.username, true, " is typing");
  }

  // Removes the visual chat typing message
  function hideTyping(username) {
    self.messages = self.messages.filter(function (element) {
      return element.username != username || element.content.indexOf(": is typing") > -1
    })
  }
});
