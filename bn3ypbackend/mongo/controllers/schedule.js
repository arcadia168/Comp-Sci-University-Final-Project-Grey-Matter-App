var mongoose = require('mongoose');
var ScheduleTask = mongoose.model('ScheduleTask');
var User = mongoose.model('User');
var moment = require('moment');

String.prototype.toObjectId = function () {
    var ObjectId = (require('mongoose').Types.ObjectId);
    return new ObjectId(this.toString());
};

exports.createScheduleTask = function (req, res) {

    var userId = req.params.user_id;

    if (!userId) {
        return res.status(500).jsonp({
            error: "Please supply a user ID for whom to create a new schedule task."
        })
    } else {

        User.findOne({'user_id': userId}, function (err, foundUser) {

            //check for errors and handle
            if (err) {
                console.log('Error finding user to add new schedule task to: ' + JSON.stringify(err));
                return res.jsonp(err);
            } else if (foundUser == null) {
                console.log('Could not find user to create new schedule task for');
                return res.status(404).end();
            } else {

                //now create new schedule task using details provided
                var newScheduleTask = {
                    name: req.body.name,
                    details: req.body.details,
                    time: new Date(req.body.time),
                    user_id: userId,
                    completedToday: false
                };

                console.log('new task being created is: ' + JSON.stringify(newScheduleTask));

                //insert the newly created task into the database
                ScheduleTask.create(newScheduleTask, function (err, createdScheduleTask) {
                    if (err) {
                        console.log(JSON.stringify(err));
                        return res.status(500).jsonp({
                            error: err
                        });
                    }
                    res.status(201).jsonp({data: createdScheduleTask});
                });
            }
        });
    }
};

exports.getAllScheduleTasks = function (req, res) {

    var userId = req.params.user_id;

    if (!userId) {
        return res.status(500).jsonp({
            error: "Please supply a user ID to retrieve schedule tasks for."
        })
    } else {
        User.findOne({'user_id': userId}, function (err, foundUser) {

            //check for errors and handle
            if (err) {
                console.log('Error finding user to retrieve scheduled tasks for: ' + JSON.stringify(err));
                return res.jsonp(err);
            } else if (foundUser == null) {
                console.log('Could not find user retrieve scheduled tasks for');
                return res.status(404).end();
            } else {

                //retrieve all of the schedule tasks that correspond to this user
                ScheduleTask.find({'user_id': userId}, function (err, foundTasks) {

                    if (err) {
                        console.log('Error retrieving scheduled tasks: ' + JSON.stringify(err));
                        return res.jsonp(err);
                    } else if (!foundTasks) {
                        console.log('Could not find any scheduled tasks for this user.');
                        return res.status(404).end();
                    } else {
                        res.status(200).jsonp({data: foundTasks});
                    }
                });
            }
        });
    }
};

exports.updateScheduleTask = function (req, res) {

    //first get and verify all required parameters
    var userId = req.params.user_id, taskId = req.params.task_id;

    if (!userId || !taskId) {

        console.log("Error when attempting to update task, missing parameters");

        return res.status(403).jsonp({
            error: "Please ensure that you supply the User ID and Task ID of the schedule task being updated."
        });

    } else {

        //ensure user is still valid and active
        User.findOne({user_id: userId}, function (err, foundUser) {

            if (err) {

                console.log("Error occurred when attempting to verify user: " + JSON.stringify(err));

                return res.status(502).jsonp({error: err});
            } else if (!foundUser) {

                console.log("Could not find user specified to update task for, user may have been deleted.");

                return res.status(404).jsonp({error: "Unable to find user to whom task to be updated belongs"});
            } else {

                //if everything is still good with the user, attempt to delete the thing
                ScheduleTask.findOne({_id: taskId.toObjectId()}, function (err, foundTask) {

                    if (err) {
                        console.log("Error occurred when attempting to find task to update");
                        return res.status(502).jsonp({error: err});
                    } else if (!foundTask) {
                        console.log("Could not find existing task to update, creating new task");

                        //create new thing instead, makes this an upsert, just invoke above function
                        return res.status(404).jsonp({error: "Could not find specified task to update"});
                    } else {

                        //apply supplied updates to the task, with null checking for safety
                        if (req.body.name) {
                            foundTask.name = req.body.name;
                        }

                        if (req.body.time) {
                            foundTask.time = req.body.time;
                        }

                        //check for details as these are optional, only update if they are present on the request.
                        if (req.body.details) {
                            foundTask.details = req.body.details;
                        }

                        //attempt to use newly provided thing details to update existing thing
                        foundTask.save({_id: taskId.toObjectId()}, function (err) {

                            if (err) {
                                console.log("Error occurred when attempting to save changes to task." + JSON.stringify(err));

                                return res.status(500).jsonp({error: err});
                            } else {

                                console.log("Successfully saved updates to the task");

                                return res.status(200).end();
                            }
                        });
                    }
                });
            }
        });
    }
};

exports.deleteScheduledTask = function (req, res) {

    var userId = req.params.user_id, taskId = req.params.task_id;

    if (!userId || !taskId) {
        return res.status(500).jsonp({
            error: "Please supply a user ID and task ID in order to delete specified schedule task."
        })
    } else {
        User.findOne({'user_id': userId}, function (err, foundUser) {

            //check for errors and handle
            if (err) {
                console.log('Error finding user to retrieve scheduled tasks for: ' + JSON.stringify(err));
                return res.jsonp(err);
            } else if (foundUser == null) {
                console.log('Could not find user retrieve scheduled tasks for');
                return res.status(404).end();
            } else {

                //now attempt to delete task using the supplied task ID
                ScheduleTask.remove({_id: taskId.toObjectId()}, function (err) {
                    if (err) {
                        console.log("Error occurred when attempting to delete specified task with ID: " + taskId);
                        return res.status(502).jsonp({err: err});
                    }

                    return res.status(200).end();
                });
            }
        });
    }
};

exports.toggleTaskCompletionState = function (req, res) {

    var userId = req.params.user_id, taskId = req.params.task_id, setToCompletionState = req.params.state;

    if (!userId || (!taskId || !setToCompletionState)) {
        return res.status(500).jsonp({
            error: "Please supply a user ID, task ID and task state in order to update specified schedule task."
        })
    } else {
        User.findOne({'user_id': userId}, function (err, foundUser) {

            //check for errors and handle
            if (err) {
                console.log('Error finding user to retrieve scheduled tasks for: ' + JSON.stringify(err));
                return res.jsonp(err);
            } else if (foundUser == null) {
                console.log('Could not find user retrieve scheduled tasks for');
                return res.status(404).end();
            } else {

                //if everything is still good with the user, attempt to delete the thing
                ScheduleTask.findOne({_id: taskId.toObjectId()}, function (err, foundTask) {

                    if (err) {
                        console.log("Error occurred when attempting to find task to update");
                        return res.status(502).jsonp({error: err});
                    } else if (!foundTask) {
                        console.log("Could not find existing task to update, creating new task");

                        //create new thing instead, makes this an upsert, just invoke above function
                        return res.status(404).jsonp({error: "Could not find specified task to update"});
                    } else {

                        //set found task to the desired state
                        foundTask.completedToday = setToCompletionState;

                        //attempt to use newly provided thing details to update existing thing
                        foundTask.save({_id: taskId.toObjectId()}, function (err) {

                            if (err) {
                                console.log("Error occurred when attempting to save changes to task." + JSON.stringify(err));

                                return res.status(500).jsonp({error: err});
                            } else {

                                console.log("Successfully saved updates to the task");

                                return res.status(200).end();
                            }
                        });
                    }
                });
            }
        });
    }
};
