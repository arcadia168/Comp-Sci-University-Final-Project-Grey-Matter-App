module.exports = function(app){
    var users = require('./mongo/controllers/users');
    var things = require('./mongo/controllers/things');
    var schedule = require('./mongo/controllers/schedule');
    var moment = require('moment');
    var multer = require('multer');

    var started = moment();

    app.get('/status', function(req, res){ res.send({status: "Running", uptime: started.fromNow().toString()})}); //protect
    app.get('/api/users/:user_id', users.getUserData); //protect
    app.post('/api/users/user_location/:user_id', users.updateLocation);
    app.post('/api/users/sync', users.userSync); //protect //TODO: How do users delete accounts? Implement user delete
    app.post('/api/users/update/pic/:user_id/', multer({dest: './uploads/'}).single('pic'), users.updatePic);
    app.post('/api/users/:user_id/update/', multer({dest: './uploads/'}).single('pic'), users.updateUser); //protect
    app.post('/api/users/:user_id/update/home_location', users.updateHomeLocation);
    app.post('/api/users/:patient_id/carer_locations/', users.retrieveCarerLocations);

    //geofence routes
    app.post('/api/users/create_geofence/:carer_id/:patient_id', users.createNewGeofence);
    app.delete('/api/users/geofence/:carer_id/:patient_id/:geofence_id', users.removeGeofence);
    app.post('/api/users/:patient_id/geofence/action', users.alertPatientGeofenceAction);

    //scheduled task routes
    app.post('/api/users/:user_id/schedule/create', schedule.createScheduleTask);
    app.post('/api/users/:user_id/schedule/update/:task_id', schedule.updateScheduleTask);
    app.get('/api/users/:user_id/schedule/', schedule.getAllScheduleTasks);
    app.get('/api/users/:user_id/schedule/toggle/:task_id/:state', schedule.toggleTaskCompletionState);
    app.delete('/api/users/:user_id/schedule/delete/:task_id', schedule.deleteScheduledTask);

    //thing routes
    app.post('/api/users/:user_id/things/create', multer({dest: './uploads/'}).single('pic'), things.createNewThing); //protect
    app.post('/api/users/:user_id/things/:thing_id/update', multer({dest: './uploads/'}).single('pic'), things.updateThing); //protect
    app.delete('/api/users/:user_id/things/:thing_id/delete', things.deleteThing); //protect
    app.get('/api/users/:user_id/things/:thing_id', things.readThing); //protect
    app.get('/api/users/:user_id/things/', things.readAllThings); //protect

    //user carer connection routes
    app.delete('/api/users/:user_id/delete', users.deleteUser); //protect
    app.post('/api/users/:user_id/invite', users.inviteCarer); //protect
    app.get('/api/users/invite/accept/:patient_id/:carer_id', users.acceptInvitation); //protect
    app.get('/api/users/invite/reject/:patient_id/:carer_id', users.rejectInvitation); //protect
    app.get('/api/users/carers/disconnect/:carer_id/:patient_id/', users.disconnectPatientFromCarer); //protect
    app.get('/api/users/devices/register/:user_id/:new_device_token', users.registerDeviceToken); //protect
};