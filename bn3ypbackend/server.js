#!/bin/env node

/**************************/
/*  DECLARE DEPENDENCIES  */
/**************************/

//Set environment variables depending on the platform that server is running.
var PORT = process.env.OPENSHIFT_INTERNAL_PORT || process.env.OPENSHIFT_NODEJS_PORT || 8000;
var IPADDRESS = process.env.OPENSHIFT_INTERNAL_IP || process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var mongoose = require('mongoose');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var multer = require('multer');
var _ = require('underscore');
//var Agenda = require('agenda');
//var agendaUI = require('agenda-ui');
var mongoConnection = 'mongodb://' + IPADDRESS + '/3yp_db';
var jwt = require('express-jwt'); //configure auth0
var app = express(); //creates a new Express application


var jwtCheck = jwt({ //configure this server for use with Auth0 server, to authenticate users. Auth0 account specific
    secret: new Buffer('TDF5y56jsT1efjwTr-WR3IFPt5vQTbi-wTX4MK_g34FYJ_NOIlplOj-aBC_l46VA', 'base64'),
    audience: 'B4fFBY7OcermBIy5eG0kLZddPBGYjGw3'
});
//used to connect to the mongoDB on the openshift server. Overwrite only if running on production server.
if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
    mongoConnection = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
        process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
        process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
        process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
        process.env.OPENSHIFT_APP_NAME;
}

/**************************/
/*   DEFINE MIDDLEWARES   */
/**************************/

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
app.use(cors());

//enable cors todo: test use without
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    next();
});

//define folder to which images and other uploaded files are uploaded and placed into
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.static('/uploads'));

//baton down the hatches
app.use('/api/', jwtCheck); //protect all sub-routes

/**************************/
/* CONNECT TO THE MONGODB */
/**************************/

//Load in all of the mongoose data models
require('./mongo/models/usermodel');
require('./mongo/models/thingmodel');
require('./mongo/models/scheduletaskmodel');

require('./routes')(app);

//establish connection to the mongo database
mongoose.connect(mongoConnection);
var db = mongoose.connection;
db.on('error', function (err) {
    console.error('MongoDB Error: %s', err);
    throw new Error('unable to connect to database at ' + mongoConnection);
});

/**************************/
/*   FIRE UP THE SERVER   */
/**************************/

//Fire up the server
var server = app.listen(PORT, IPADDRESS, function () {
    console.log('%s: Node server started on %s:%d ...', Date(Date.now()), IPADDRESS, PORT);
});

//important to properly instantiate the socket.io server to serve client library
var io = require('socket.io')(server);

/*Socket.io stuff */
var numUsers = 0;
var usernames = [];
var rooms = [];
io.on('connection', function (socket) {

    console.log('client connected to live chat socket');

    //when a carer user requests to create geo-fence around patient
    socket.on('monitorPatientLocation', function(lat, long) {//function(carerId, patientId) {

        //todo: validate carer exists

        //todo: validate patient exists

        //todo: validate patient exists on carer

        //add a geofence record to patient
        console.log('recieved monitor patient event');

        //emit event to patient

        socket.broadcast.emit('createPatientGeofence', lat, long);
    });

    socket.on('stopMonitoringPatientLocation', function (identifier) {

        //todo: other clever stuff here
        console.log('recieved stop monitor patient event');

        socket.broadcast.emit('removePatientGeofence', identifier)
    });

    // when the client emits 'adduser', this listens and executes
    socket.on('adduser', function (username, carerChatToJoin) {

        console.log('user ' + username + ' connected to room ' + carerChatToJoin);
        // store the username in the socket session for this client
        socket.username = username;
        // store the room name in the socket session for this client
        socket.room = carerChatToJoin;
        // add the client's username to the global list
        usernames[username] = username;
        // send client to room 1

        //var usersInRoom = io.sockets.adapter.rooms[carerChatToJoin];

        socket.join(carerChatToJoin);

        //insert or update the room
        if (!_.contains(rooms, carerChatToJoin)) {
            rooms.push(carerChatToJoin);
        }

        // echo to client they've connected
        //socket.emit('updatechat', 'SERVER', 'you have connected to ' + carerChatToJoin);
        // echo to room 1 that a person has connected to their room

        socket.broadcast.to(carerChatToJoin).emit('user joined', {username: username});
        socket.emit('updaterooms', rooms, carerChatToJoin);

    });

// when the client emits 'sendchat', this listens and executes
    socket.on('sendchat', function (data) {
        // we tell the client to execute 'updatechat' with 2 parameters

        //todo: save all messages in the corresponding carer - patient chat
        //todo: here, check if other user in room, send out push notification if not

        console.log('new message from ' + 'user ' + socket.username + ', message: ' + data);

        // we tell the client to execute 'new message'
        socket.broadcast.to(socket.room).emit('new message', {
            username: socket.username,
            message: data
        });
        //io.sockets.in(socket.room).emit('new message', {username: socket.username, message: data});
    });

//tell users in same rooms when other users are typing
// when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
        console.log('user ' + socket.username + ' typing');
        socket.broadcast.to(socket.room).emit('typing', {
            username: socket.username
        });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('user ' + socket.username + ' stopped typing', function () {
        console.log('stop typing');
        socket.broadcast.to(socket.room).emit('stop typing', {
            username: socket.username
        });
    });

    socket.on('switchRoom', function (newroom) {

        console.log('user switching room');

        // leave the current room (stored in session)
        socket.leave(socket.room);
        // join new room, received as function parameter
        socket.join(newroom);

        //socket.emit('updatechat', 'SERVER', 'you have connected to ' + newroom);

        // sent message to OLD room
        socket.broadcast.to(socket.room).emit('user left', {username: socket.username});

        // update socket session room title
        socket.room = newroom;

        socket.broadcast.to(newroom).emit('user joined', {username: socket.username});

        socket.emit('updaterooms', rooms, newroom);
    });

    //when a user leaves one chat
    socket.on('leave chat', function () {

        console.log('user: ' + socket.username + ' disconnecting from room: ' + socket.room);

        // remove the username from global usernames list
        delete usernames[socket.username];

        // update list of users in chat, client-side
        //io.sockets.emit('updateusers', usernames);

        // echo globally that this client has left
        socket.broadcast.to(socket.room).emit('user left', {username: socket.username});
        socket.leave(socket.room);
    });
});