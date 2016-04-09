var mongoose = require('mongoose');
var Things = mongoose.model('Thing');
var User = mongoose.model('User');
var moment = require('moment');

String.prototype.toObjectId = function () {
    var ObjectId = (require('mongoose').Types.ObjectId);
    return new ObjectId(this.toString());
};

exports.createNewThing = function (req, res) {

    //check that the user id for whom to create a thing is valid
    var userId = req.params.user_id;

    if (!userId) {

        return res.status(500).jsonp({
            error: "Please supply a user ID to attach new thing to."
        })
    } else {

        User.findOne({'user_id': userId}, function (err, foundUser) {

            //check for errors and handle
            if (err) {
                console.log('Error finding user to add new thing to: ' + JSON.stringify(err));
                return res.jsonp(err);
            } else if (foundUser == null) {
                console.log('Could not find user to create new thing for');
                return res.status(404).end();
            } else {

                //check that the user has supplied a name and a location
                if (req.body.location == null || req.body.name == null) {
                    //throw an error as both of these pieces of information are required
                    return res.status(502).send(
                        {
                            error: 'To create a new thing, both a name and location of the item are required. ' +
                            'Please ensure that these are supplied'
                        }
                    );

                } else {

                    //now create the new thing object using the validated parameters
                    var newThing = {
                        userId: userId,
                        name: req.body.name,
                        location: req.body.location,
                        pic: {}
                    };

                    //check for the optional parameters
                    var note = req.body.note;

                    if (note) {

                        newThing.note = note;
                    }

                    //todo: handle multiple file uploads if time

                    var pic = req.file;
                    if (pic) {
                        //then store the picture's details
                        newThing.pic.originalFileName = req.file.originalname;
                        newThing.pic.uploadedFileName = req.file.filename.substring(0, req.file.filename.length);
                        newThing.pic.location = req.file.destination;
                    }

                    //save the new thing's details, write the new thing into the database
                    Things.create(newThing, function (err, createdThing) {
                        if (err) {
                            console.log(JSON.stringify(err));
                            return res.status(500).jsonp({
                                error: err
                            });
                        }
                        res.status(201).jsonp({data: createdThing});
                    });
                }
            }
        });
    }
};

exports.updateThing = function (req, res) {

    //first get and verify all required parameters
    var userId = req.params.user_id, thingId = req.params.thing_id;

    if (!userId || !thingId) {

        console.log("Error when attempting to update thing, missing parameters");

        return res.status(403).jsonp({
            error: "Please ensure that you supply the User ID and Thing ID of the thing being updated."
        });

    } else {

        //ensure user is still valid and active
        User.findOne({user_id: userId}, function(err, foundUser) {

            if (err) {

                console.log("Error occurred when attempting to verify user: " + JSON.stringify(err));

                return res.status(502).jsonp({error: err});
            } else if (!foundUser) {

                console.log("Could not find user specified to update thing, user may have been deleted.");

                return res.status(404).jsonp({error: "Unable to find user to whom thing to be updated belongs"});
            } else {

                //if everything is still good with the user, attempt to delete the thing
                Things.findOne({_id: thingId.toObjectId()}, function(err, foundThing) {

                    if (err) {
                        console.log("Error occurred when attempting to find thing to update");
                        return res.status(502).jsonp({error:  err});
                    } else if (!foundThing) {
                        console.log("Could not find existing thing to update, creating new thing");

                        //create new thing instead, makes this an upsert, just invoke above function
                        return res.status(404).jsonp({error: "Could not find specified thing to update"});
                    } else {

                        //apply supplied updated to the thing
                        if (req.body.name) {
                            foundThing.name = req.body.name;
                        }

                        if (req.body.location) {
                            foundThing.location = req.body.location;
                        }

                        if (req.body.note) {
                            foundThing.note = req.body.note;
                        }

                        //override the picture for the thing
                        if (req.file) {

                            foundThing.pic.originalFileName = req.file.originalname;
                            foundThing.pic.uploadedFileName = req.file.filename;
                            foundThing.pic.location = '/uploads/' + req.file.filename; //location image can be loaded from
                        }

                        //attempt to use newly provided thing details to update existing thing
                        foundThing.save({_id: thingId.toObjectId()}, function(err) {

                            if (err) {
                                console.log("Error occurred when attempting to save changes to thing." + JSON.stringify(err));

                                return res.status(500).jsonp({error: err});
                            } else {

                                console.log("Successfully saved updates to the thing");

                                return res.status(200).end();
                            }
                        });
                    }
                });
            }
        });
    }
};

exports.readThing = function (req, res) {

    var userId = req.params.user_id, thingId = req.params.thing_id;

    //validat the required parameters
    if (!userId || !thingId) {
        console.log("Error, please ensure that you have supplied a valid User ID and Thing ID");
        return res.status(500).jsonp({error: "Please ensure you have supplied a valid User ID and Thing ID"});
    } else {

        //ensure requesting user is valid
        User.findOne({user_id: userId}, function (err, foundUser) {

            if (err) {
                console.log("Error occurred when attempting to verify user: " + JSON.stringify(err));
                return res.status(500).jsonp({error: err});
            } else if (!foundUser) {
                console.log("Could not find user to whom thing belongs to.");
                return res.status(404).jsonp({error: "Could not find user, user may have been deleted."});
            } else {

                //attempt to achieve requested thing
                Things.findOne({_id: thingId.toObjectId()}, function(err, foundThing) {

                    if (err) {
                        console.log("Error occurred when attempting find specified thing.");
                        return res.status(500).jsonp({error: err});
                    } else if (!foundThing) {
                        console.log("Could not find requested thing");
                        return res.status(404).jsonp({error: "Could not find specified thing"});
                    } else {

                        //if no problems, simply return the requested item
                        res.jsonp({data: foundThing});

                    }

                });
            }
        });
    }
};

exports.readAllThings = function (req, res) {

    var userId = req.params.user_id;

    //validat the required parameters
    if (!userId) {
        console.log("Error, please ensure that you have supplied a valid User ID");
        return res.status(500).jsonp({error: "Please ensure you have supplied a valid User ID"});
    } else {

        //ensure requesting user is valid
        User.findOne({user_id: userId}, function (err, foundUser) {

            if (err) {
                console.log("Error occurred when attempting to verify user: " + JSON.stringify(err));
                return res.status(500).jsonp({error: err});
            } else if (!foundUser) {
                console.log("Could not find user to whom thing belongs to.");
                return res.status(404).jsonp({error: "Could not find user, user may have been deleted."});
            } else {

                //attempt to achieve requested thing
                Things.find({'userId' : userId}, function(err, foundThings) {

                    if (err) {
                        console.log("Error occurred when attempting find things for specified user.");
                        return res.status(500).jsonp({error: err});
                    } else if (!foundThings) {
                        console.log("Could not find requested things");
                        return res.status(404).jsonp({error: "Could not find things for specified users."});
                    } else {

                        //if no problems, simply return the requested item
                        res.jsonp({data: foundThings});
                    }
                });
            }
        });
    }
};

exports.deleteThing = function (req, res) {

    //first check user is valid
    var userId = req.params.user_id, thingId = req.params.thing_id;

    if (!userId || !thingId) {
        return res.status(502).jsonp({
            error: "Please supply a user ID to whom the specified thing belongs and the unique thing ID."
        });
    } else {

        //attempt to verify user of thing being deleted exists
        User.findOne({user_id: userId}, function (err, foundUser) {

            if (err) {

                console.log("Error occurred when attempting to verify user: " + JSON.stringify(err));

                return res.status(500).jsonp({errorMsg: "Error occurred when attempting to verify user", error: err})
            } else if (foundUser == null) {

                console.log("Could not find specified user from which to delete thing.");

                return res.status(404).jsonp({error: "Could not find user to which specified thing belongs"});
            } else {

                //now attept to delete thing using the supplied thing ID
                Things.remove({_id: thingId.toObjectId()}, function (err) {
                    if (err) {
                        console.log("Error occurred when attempting to delete specified thing with ID: " + thingId);
                        return res.status(502).jsonp({err: err});
                    }

                    return res.status(200).end();
                });
            }
        });

    }
};

