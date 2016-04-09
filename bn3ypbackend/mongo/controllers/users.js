var mongoose = require('mongoose');
var User = mongoose.model('User');
var moment = require('moment');
var async = require('async');
var https = require('https');
var _ = require('underscore');

String.prototype.toObjectId = function () {
    var ObjectId = (require('mongoose').Types.ObjectId);
    return new ObjectId(this.toString());
};

function sendPushNotification(deviceTokens, notificationMesage) {

    console.log('\nabout to attempt to send push notications to devices with ids: ' + deviceTokens);

    console.log('\n\nattempting to send message: ' + notificationMesage);

    // Build the post string from an object
    var post_data = JSON.stringify({
        tokens: deviceTokens,
        profile: 'greymatterypprofile',//'fake_push_profile', //not sending real push so this just needs to be fake: fake_push_profile
        notification: {
            message: notificationMesage
        }
    });

    // An object of options to indicate where to post to
    var post_options = {
        host: 'api.ionic.io',
        path: '/push/notifications',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyMDc1NDcwMS1jODIxLTQxMTEtYWFiZC02MmI0MjJmNzUzYjMifQ.xOCmfEjJAUYJDcR0XUAZJj_74l-T8UgB0779e2ydPBY'
        }
    };

    // Set up the request
    var post_req = https.request(post_options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('\n\nResponse: ' + chunk);
        });
    });

    // post the data
    post_req.write(post_data);
    post_req.end();
}

//todo: need updating to test and have better error handling
exports.registerDeviceToken = function (req, res) {

    //extract user id
    var user_id = req.params.user_id;

    //extract token
    var new_device_token = req.params.new_device_token;


    //add token to user
    User.findOne({'user_id': user_id}, function (error, foundUser) {
        if (error) {
            console.log('Error updating user device tokens, when attempting to retrieve user: ' + error);
            return res.jsonp(503);
        } else if (foundUser == null) {
            console.log('Error retrieving user, could not find user with specified user_id');
            return res.jsonp(404);
        } else if (!new_device_token) {

            console.log('No device token was supplied');
            return res.jsonp(502);
        } else {

            //If user does not have device token, register it (push into array)

            //check user does not already have token
            //if (!_.contains(foundUser.userDeviceTokens, new_device_token)) {
            //if token does not exist, add it and return

            //TEMPORARILY JUST OVERWRITING USER DEVICE TOKENS AS USING DEV PUSHES
            var newTokenArray = [];
            newTokenArray.push(new_device_token);

            foundUser.userDeviceTokens = newTokenArray;

            foundUser.save(function (error) {
                if (error) {
                    console.log("Error when saving changes to the user: " + error);
                    return res.jsonp(503);
                } else {
                    console.log("Changes made to the user's device tokens were saved successfully.");
                    return res.jsonp(200);
                }
            });
            //} else {
            //    console.log("User already has this device token");
            //    return res.jsonp(502);
            //}
        }
    });
};

//todo: need updating to test and have better error handling
exports.userDeviceTokenManager = function (req, res) {
    //Get the POST body
    console.log('JSON Post body received from the webhook Ionic Push API is: ' + JSON.stringify(req.body));

    var userDeviceDetails = req.body;

    //if the data recieved if registering a new user
    if (userDeviceDetails.user_id) {
        //Now find the user which corresponds to the stated devices
        console.log("Now trying to find user: " + userDeviceDetails.user_id);
        User.findOne({'user_id': userDeviceDetails.user_id}, function (error, foundUser) {
            if (error) {
                console.log('Error updating user device tokens, when attempting to retrieve user: ' + error);
                return res.jsonp(503);
            } else if (foundUser == null) {
                console.log('Error retrieving user, could not find user with specified user_id');
                return res.jsonp(404);
            } else {

                var changesMade = false;

                //If user does not have device token, register it (push into array)

                //todo: compile a single list of tokens (concat arrays) and run code once

                //Add any android device tokens
                var androidTokens = userDeviceDetails._push.android_tokens;
                console.log('Android tokens are: ' + androidTokens.toString());
                console.log('Device tokens already stored against user are: ' + JSON.stringify(foundUser.userDeviceTokens));

                if (androidTokens) {
                    underscore.each(androidTokens, function (androidToken, index, tokens) {
                        console.log('Now using underscore underscore.each to iterate over ' + index);
                        console.log('Android token is: ' + androidToken);

                        //if this token is not in the list of stored tokens, add it
                        var tokenExists = underscore.contains(foundUser.userDeviceTokens, androidToken);

                        if (!tokenExists) {
                            //add the new token to the array
                            foundUser.userDeviceTokens.push(androidToken);
                            //denote that changes need to be saved
                            changesMade = true;
                            console.log("A new android device token was added for the user.");
                        } else {
                            console.log('Device token already existed for the user');
                        }
                    });
                }

                //Add any ios device tokens
                var iosTokens = userDeviceDetails._push.ios_tokens;
                console.log('Android tokens are: ' + iosTokens.toString());
                console.log('Device tokens already stored against user are: ' + JSON.stringify(foundUser.userDeviceTokens));

                if (iosTokens) {
                    underscore.each(iosTokens, function (iosToken, index, tokens) {
                        console.log('Now using underscore underscore.each to iterate over ' + index);
                        console.log('Android token is: ' + iosToken);

                        //if this token is not in the list of stored tokens, add it
                        var tokenExists = underscore.contains(foundUser.userDeviceTokens, iosToken);

                        if (!tokenExists) {
                            //add the new token to the array
                            foundUser.userDeviceTokens.push(iosToken);
                            changesMade = true;
                            console.log("A new ios device token was added for the user.");
                        } else {
                            console.log('Device token already existed for the user');
                        }
                    });
                }

                //Now save any changes that have been made to the user
                if (changesMade) {
                    console.log("Changes were made to the user and need to be saved.");

                    foundUser.save(function (error) {
                        if (error) {
                            console.log("Error when saving changes to the user: " + error);
                            return res.jsonp(503);
                        } else {
                            console.log("Changes made to the user were saved successfully.");
                            return res.jsonp(200);
                        }
                    });
                } else {
                    console.log('No changes were made to the user'); //todo: remove once tested
                }
            }
        });
    } else if (userDeviceDetails.token_invalid == 'true') { //If a device token becomes invalid

        if (userDeviceDetails.ios_token) {
            console.log('Token is for ios device: ' + userDeviceDetails.ios_token);
            tokenToRemove = userDeviceDetails.ios_token
        } else {
            console.log('Token is for android device: ' + userDeviceDetails.android_token);
            tokenToRemove = userDeviceDetails.android_token;
        }

        //Query to find any users which have the invalid device tokens
        Users.find({'userDeviceTokens': tokenToRemove}, function (error, foundUsers) {
            if (error) {
                console.log('Error updating user device tokens, when attempting to retrieve user: ' + error);
                return res.jsonp(503);
            } else if (foundUsers == null) {
                console.log('Error retrieving user, could not find user with specified user_id');
                return res.jsonp(404);
            } else {
                var changesMade = false; //variable to track whether or not changes will require saving
                console.log('The users found to have the device token are: ' + JSON.stringify(foundUsers));

                //iterate over all of the users and remove the invalid token then save
                //async recursion loop
                _removeInvalidDeviceToken(1, foundUsers, tokenToRemove, function () {
                    console.log("All invalid device ids have successfully been removed from users.");
                    return res.jsonp(200);
                });
            }
        });

        //remove invalid tokens from users and save

    } else if (userDeviceDetails.unregister == 'true') { //If a user unregisters a device

        //Compile single list of device tokens
        var tokensToUnregister = [];
        var androidTokens = userDeviceDetails._push.android_tokens;
        var iosTokens = userDeviceDetails._push.ios_tokens;

        if (androidTokens) {
            tokensToUnregister.concat(androidTokens);
        }

        if (iosTokens) {
            tokensToUnregister.concat(iosTokens);
        }

        console.log('the list of tokens to dergister is: ' + JSON.stringify(tokensToUnregister));

        //Now loop over all users and remove any tokens
        //do recursively
        Users.find({}, function (error, foundUsers) {
            if (error) {
                console.log('Error updating user device tokens, when attempting to retrieve user: ' + error);
                return res.jsonp(503);
            } else if (foundUsers == null) {
                console.log('Error retrieving user, could not find user with specified user_id');
                return res.jsonp(404);
            } else {
                //call recursive async method passing in all users and all tokens
                _removeUnregisteredDeviceToken(i + 1, foundUsers, tokensToUnregister, function () {
                    console.log("Device tokens successfully unregistered");
                    return res.jsonp(200);
                });
            }
        });
    }
};

exports.updateUser = function (req, res) {
    var user_id = req.params.user_id;

    //remove the _id field before updating to avoid error
    delete req.body._id;

    User.findOneAndUpdate({'user_id': user_id}, req.body, {new: true}, function (err, updatedUserData) {
        if (err) {
            console.log(err);
            return res.status(500).jsonp({
                error: err
            });
        }
        return res.status(200).jsonp({
            data: updatedUserData,
            message: "User details were successfully updated."
        });
    });
};

exports.inviteCarer = function (req, res) {

    var user_id = req.params.user_id;

    //first retrieve the  sending user's details
    User.findOne({'user_id': user_id}, function (err, foundPatient) {

        if (foundPatient == null) {
            return res.status(404).send({
                error: 'Could not find inviting user. Please restart the app and sign in again.'
            });
        } else {

            //attempt to find a user with the email address
            User.findOne({'email': req.body.email}, function (err, foundCarer) {

                if (foundCarer == null) {

                    return res.status(404).send({
                        error: 'No carer was found using the supplied email address. Please ensure that the user exists.'
                    });

                } else {

                    //check that this user has not already invited this carer
                    var invitationExisted = false;

                    foundCarer.careConnectInvitations.some(function (invitation) {
                        if (invitation.sender.user_id == user_id) {
                            return invitationExisted = true;
                        }
                    });

                    if (invitationExisted) {
                        return res.status(409).send({
                            error: 'An invitation from this patient to this carer already existed.'
                        });
                    } else if (foundPatient.user_id == foundCarer.user_id) { //todo: remove once unique emails are ensured!!!!
                        return res.status(409).send({
                            error: 'You can\'t invite yourself to connect!'
                        });

                        //will this ever get hit? Only if user changes userType from patient
                    } else if (foundCarer.userType == 'patient') {
                        return res.status(500).send({
                            error: 'The person you are inviting is also a patient! There can only be one patient to a number of carers.'
                        });
                    } else {

                        //add an invitation from the patient to this user
                        var newInvitation = {
                            sender: {
                                user_id: user_id,
                                name: foundPatient.firstName + ' ' + foundPatient.lastName,
                                pic: foundPatient.pic, //url to patient user's picture
                                email: foundPatient.email,
                                dOB: foundPatient.dateOfBirth
                            },
                            invitationIssued: moment().toDate(),
                            status: "pending"
                        };

                        foundCarer.careConnectInvitations.push(newInvitation);

                        //alter the invitation object to add to the patient's sent invitations array
                        delete newInvitation.sender;

                        newInvitation.recipient = {
                            user_id: foundCarer.user_id,
                            name: foundCarer.firstName + ' ' + foundCarer.lastName,
                            pic: foundCarer.pic, //url to patient user's picture
                            email: foundCarer.email,
                            dOB: foundCarer.dateOfBirth
                        };

                        //save the sent invitation against the patient
                        foundPatient.issuedInvitations.push(newInvitation);

                        //save the changes
                        foundCarer.save(function (err, savedCarer) {
                            if (err) {
                                console.log('Error inviting user: ' + err);
                                return res.status(500).send({
                                    error: err
                                });
                            } else {

                                //save the updates to the patient
                                foundPatient.save(function (err, savedPatient) {
                                    if (err) {
                                        console.log('Error inviting user: ' + err);
                                        return res.status(500).send({
                                            error: err
                                        });
                                    } else {
                                        return res.jsonp(
                                            {
                                                data: [savedPatient, savedCarer],
                                                message: "Invitation sent successfully."
                                            }
                                        );
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
    });
};

exports.acceptInvitation = function (req, res) {

    //first attempt to find details of the patient
    User.findOne({'user_id': req.params.patient_id}, function (err, foundPatient) {

        if (err) {
            console.log(JSON.stringify(err));
            res.status(500).send({
                error: err
            });
        } else if (foundPatient == null) {
            res.status(404).send({
                error: "Could not find patient to connect to. User may have been deleted."
            })
        } else {

            //Check that an invite actually exists for this carer
            var invitationExists = false;

            _.some(foundPatient.issuedInvitations, function (invitation) {
                if (invitation.recipient.user_id == req.params.carer_id) {
                    return invitationExists = true;
                }
            });

            if (!invitationExists) {

                res.status(404).send({
                    error: "No corresponding invitation to connect to carer was found"
                });
            } else {

                //Attempt to find the invited user's details
                User.findOne({'user_id': req.params.carer_id}, function (err, foundCarer) {

                    if (err) {
                        console.log(JSON.stringify(err));
                        res.status(500).send({
                            error: err
                        });
                    } else if (foundCarer == null) {

                        //todo: in these clauses, delete the invitation from the user to prevent encountering same error

                        res.status(404).send({
                            error: "Could not find carer to connect to. User may have been deleted."
                        })
                    } else {

                        //add the patient to the carer, ensure there is only 1
                        if (foundCarer.connectedPatient.user_id) {

                            res.status(409).send({
                                error: "Carer is already connected to a patient. Please disconnect from current patient before attempting to connect to another."
                            });

                        } else {

                            //Now accept (and delete) the invitation and add this carer to the patient

                            var newCarer = {
                                user_id: foundCarer.user_id,
                                carer_name: foundCarer.firstName + ' ' + foundCarer.lastName,
                                carer_pic: foundCarer.pic,
                                carer_pic: foundCarer.pic,
                                carer_dob: foundCarer.dateOfBirth,
                                carer_location: foundCarer.location
                            };

                            //ensure there is always some form of carer name, even if not ideal
                            if (!foundCarer.firstName || !foundCarer.lastName) {
                                newCarer.carer_name = foundCarer.name;
                            }

                            //add carer to patient's list of connected carers
                            foundPatient.connectedCarers.push(newCarer);

                            //delete the invitation on the patient
                            var updatedInvitations = _.reject(foundPatient.issuedInvitations, function (invitation) {
                                if (invitation.recipient.user_id == foundCarer.user_id) {
                                    return true;
                                }
                            });

                            //now assign the invitations with latest accepted removed invitation to object
                            foundPatient.issuedInvitations = updatedInvitations;

                            //save the patient to the carer and THEN save carer to patient
                            foundPatient.save(function (err, savedPatient) {

                                if (err) {

                                    //don't save the patient to the carer, return error
                                    return res.status(500).jsonp({
                                        error: "Error when saving carer to patient: " + err
                                    });

                                }

                                //otherwise if patient saved to carer successfully
                                foundCarer.connectedPatient = {
                                    user_id: savedPatient.user_id,
                                    patient_name: savedPatient.firstName + ' ' + savedPatient.lastName,
                                    patient_pic: savedPatient.pic,
                                    patient_location: savedPatient.location
                                };

                                //delete this invitation to this carer
                                var updatedInvitations = _.reject(foundCarer.careConnectInvitations, function (invitation) {
                                    if (invitation.sender.user_id == foundPatient.user_id) {
                                        return true;
                                    }
                                });

                                foundCarer.careConnectInvitations = updatedInvitations;

                                //now this carer has been connected to a patient, set them to have a complete profile
                                foundCarer.profileCompleted = true;

                                //Now attempt to save the new details for the carer
                                foundCarer.save(function (err, savedCarer) {

                                    if (err) {
                                        console.log(JSON.stringify(err));
                                        return res.status(500).jsonp({
                                            error: "Error when attempting to save patient connection to carer: " + err
                                        });
                                    }

                                    //otherwise return success to the user, send back patient data
                                    return res.status(200).jsonp({
                                        message: "Successfully accepted invitation, connected carer to patient",
                                        data: [savedPatient, savedCarer]
                                    })
                                });
                            });
                        }
                    }
                });
            }
        }
    });
};

exports.rejectInvitation = function (req, res) {

    //first attempt to find details of the patient
    User.findOne({'user_id': req.params.patient_id}, function (err, foundPatient) {

        if (err) {
            console.log(JSON.stringify(err));
            res.status(500).send({
                error: err
            });
        } else if (foundPatient == null) {

            //todo: in these clauses, delete the invitation from the user to prevent encountering same error

            return res.status(404).send({
                error: "Could not find patient to connect to. User may have been deleted."
            })
        } else {

            //Check that an invite actually exists for this carer
            var invitationExists = false;

            console.log(JSON.stringify(foundPatient.issuedInvitations));

            _.some(foundPatient.issuedInvitations, function (invitation) {
                if (invitation.recipient.user_id == req.params.carer_id) {
                    return invitationExists = true;
                }
            });

            if (!invitationExists) {

                res.status(404).send({
                    error: "No corresponding invitation to connect to carer was found"
                });
            } else {

                //Attempt to find the invited user's details
                User.findOne({'user_id': req.params.carer_id}, function (err, foundCarer) {

                    if (err) {
                        console.log(JSON.stringify(err));
                        res.status(500).send({
                            error: err
                        });
                    } else if (foundCarer == null) {
                        res.status(404).send({
                            error: "Could not find carer. User may have been deleted."
                        })
                    } else {

                        //Now reject (and delete) the invitation and add this carer to the patient

                        //Delete the rejected invitation from the patient
                        var filteredInvitations = _.reject(foundPatient.issuedInvitations, function (invitation) {
                            if (invitation.recipient.user_id == foundCarer.user_id) {
                                return true;
                            }
                        });

                        //reassign the new list of invitations back to the patient
                        foundPatient.issuedInvitations = filteredInvitations;

                        //save the patient to the carer and THEN save carer to patient
                        foundPatient.save(function (err, savedPatient) {

                            if (err) {

                                //don't save the patient to the carer, return error
                                return res.status(500).jsonp({
                                    error: "Error when saving carer to patient: " + err
                                });

                            }

                            //delete the rejected invitation from the carer
                            var filteredCarerInvitations = _.reject(foundCarer.careConnectInvitations, function (invitation) {
                                if (invitation.sender.user_id == foundPatient.user_id) {
                                    return true;
                                }
                            });

                            //reassign filtered carer invitations back to carer and then save
                            foundCarer.careConnectInvitations = filteredCarerInvitations;

                            //Now attempt to save the new details for the carer
                            foundCarer.save(function (err, savedCarer) {

                                if (err) {
                                    console.log(JSON.stringify(err));
                                    return res.status(500).jsonp({
                                        error: err
                                    });
                                }

                                //otherwise return success to the user, send back patient data
                                return res.status(200).jsonp({
                                    message: "Successfully rejected invitation",
                                    data: [savedPatient, savedCarer]
                                })

                            });
                        });
                    }
                });
            }
        }
    });
};

exports.removeGeofence = function (req, res) {

    if ((!req.params.carer_id || !req.params.patient_id) || !req.params.geofence_id) {

        console.log('Error, user has not supplied all required parameters');
        res.status(404).send({
            error: "Please ensure that you have supplied a carer, user and geofence ID!"
        });

    } else {
        User.findOne({'user_id': req.params.carer_id}, function (err, foundCarer) {

            if (err) {
                console.log(JSON.stringify(err));
                res.status(500).send({
                    error: err
                });
            } else if (!foundCarer) {
                res.status(404).send({
                    error: "Could not find carer to remove patient from. User may have been deleted."
                });
            } else {

                //find patient to update also
                User.findOne({'user_id': req.params.patient_id}, function (err, foundPatient) {

                    if (err) {
                        console.log(JSON.stringify(err));
                        res.status(500).send({
                            error: err
                        });
                    } else if (!foundPatient) {
                        res.status(404).send({
                            error: "Could not find patient to remove from carer. User may have been deleted."
                        });
                    } else {

                        //remove patient from carer

                        //check patient exists on carer
                        var patientExistsOnCarer = false;

                        if (foundCarer.connectedPatient) {
                            if (foundCarer.connectedPatient.user_id == req.params.patient_id) {
                                patientExistsOnCarer = true;
                            }

                            if (!patientExistsOnCarer) {
                                return res.status(404).send({
                                    error: "Can't find connection from specified patient to specified carer"
                                })
                            }
                        }

                        //check carer exists on patient
                        var carerExistsOnPatient = false;

                        if (foundPatient.connectedCarers.length > 0) {

                            //check that carer id exists within list of patient's connected carers
                            carerExistsOnPatient = _.some(foundPatient.connectedCarers, function (connectedCarer) {

                                if (connectedCarer.user_id == req.params.carer_id) {
                                    return true;
                                }

                            });

                            if (!carerExistsOnPatient) {
                                return res.status(404).send({
                                    error: "Can't find connection from specified carer to specified patient."
                                });
                            }
                        }

                        if (carerExistsOnPatient && patientExistsOnCarer) {

                            //use underscore to remove the identified geofence from the patient user
                            var updatedGeofences = _.reject(foundPatient.patientGeofences, function (geofence) {
                                return geofence.identifier == req.params.geofence_id;
                            });

                            foundPatient.patientGeofences = updatedGeofences;

                            //now save the changes to the patient
                            //save the changes made to the patient and return both user and patient data
                            foundPatient.save(function (err, savedPatient) {

                                //return new patient and carer data to client
                                return res.status(200).jsonp({
                                    message: "Successfully removed geofence from patient.",
                                    data: [foundCarer, savedPatient]
                                })
                            });
                        }
                    }
                })
            }
        })
    }
};

exports.createNewGeofence = function (req, res) {

    //first find carer and ensure exists
    User.findOne({'user_id': req.params.carer_id}, function (err, foundCarer) {

        if (err) {
            console.log(JSON.stringify(err));
            res.status(500).send({
                error: err
            });
        } else if (!foundCarer) {
            res.status(404).send({
                error: "Could not find carer to remove patient from. User may have been deleted."
            });
        } else {

            //find patient to update also
            User.findOne({'user_id': req.params.patient_id}, function (err, foundPatient) {

                if (err) {
                    console.log(JSON.stringify(err));
                    res.status(500).send({
                        error: err
                    });
                } else if (!foundPatient) {
                    res.status(404).send({
                        error: "Could not find patient to remove from carer. User may have been deleted."
                    });
                } else {

                    //remove patient from carer

                    //check patient exists on carer
                    var patientExistsOnCarer = false;

                    if (foundCarer.connectedPatient) {
                        if (foundCarer.connectedPatient.user_id == req.params.patient_id) {
                            patientExistsOnCarer = true;
                        }

                        if (!patientExistsOnCarer) {
                            return res.status(404).send({
                                error: "Can't find connection from specified patient to specified carer"
                            })
                        }
                    }

                    //check carer exists on patient
                    var carerExistsOnPatient = false;

                    if (foundPatient.connectedCarers.length > 0) {

                        //check that carer id exists within list of patient's connected carers
                        carerExistsOnPatient = _.some(foundPatient.connectedCarers, function (connectedCarer) {

                            if (connectedCarer.user_id == req.params.carer_id) {
                                return true;
                            }

                        });

                        if (!carerExistsOnPatient) {
                            return res.status(404).send({
                                error: "Can't find connection from specified carer to specified patient."
                            });
                        }
                    }

                    if (carerExistsOnPatient && patientExistsOnCarer) {

                        //create new geofence object on the patient
                        foundPatient.patientGeofences.push(req.body);

                        //save the changes made to the patient and return both user and patient data
                        foundPatient.save(function (err, savedPatient) {

                            //return new patient and carer data to client
                            return res.status(200).jsonp({
                                message: "Successfully added geodence to the patient.",
                                data: [foundCarer, savedPatient]
                            })
                        });
                    }
                }
            });
        }
    });
};

exports.alertPatientGeofenceAction = function (req, res) {

    //first find carer and ensure exists
    User.findOne({'user_id': req.params.patient_id}, function (err, foundPatient) {

        if (err) {
            console.log(JSON.stringify(err));
            res.status(500).send({
                error: err
            });
        } else if (!foundPatient) {
            console.log('Error: Could not find the specified patient');
            res.status(404).send({
                error: "Could not find carer to remove patient from. User may have been deleted."
            });
        } else {

            console.log('Patient was found and is valid, now iterating over carers to send out push notifications');

            //before sending out message, construct notification string
            var messageAction = undefined;
            switch (req.body.action) {
                case 'EXIT' :
                    messageAction = 'left';
                    break;
                case 'ENTER' :
                    messageAction = 'entered';
                    break;
                case 'DWELL' :
                    messageAction = 'remained';
                    break;
            }

            var notificationMessage = "Patient " + foundPatient.firstName + ' ' + foundPatient.lastName +
                ' has ' + messageAction + ' the geofence location with identifier: ' + req.body.identifier;

            //iterate over patient carers and for each carer device send out a push notification


            var connectedCarerQuery = [];

            _.each(foundPatient.connectedCarers, function (carer) {

                //build array of user id strings
                connectedCarerQuery.push(carer.user_id);
            });

            User.find({'user_id': {$in: connectedCarerQuery}}, function (err, foundCarers) {

                if (err) {

                    return res.status(500).jsonp({
                        error: 'Error occurred finding carers to notify: ' + JSON.stringify(error)
                    });
                } else if (foundCarers) {

                    //iterate over each of the found carers and create a list of unique device tokens to push to
                    var deviceTokensToPushTo = [];

                    _.each(foundCarers, function (carer) {
                        _.each(carer.userDeviceTokens, function (token) {
                            if (!_.contains(deviceTokensToPushTo, token)) {
                                deviceTokensToPushTo.push(token);
                            }
                        });
                    });

                    //once a unique list of all device tokens to push to has been built, send the notifications
                    sendPushNotification(deviceTokensToPushTo, notificationMessage);

                    //once request is recieved let user know they no longer need to worry about how it is processed
                    return res.status(202).end();

                } else {

                    return res.status(400).jsonp({
                        error: 'No carers were found for those specified on the patient user.'
                    });
                }
            });
        }
    });
};

exports.disconnectPatientFromCarer = function (req, res) {

    //first find carer and ensure exists
    User.findOne({'user_id': req.params.carer_id}, function (err, foundCarer) {

        if (err) {
            console.log(JSON.stringify(err));
            res.status(500).send({
                error: err
            });
        } else if (!foundCarer) {
            res.status(404).send({
                error: "Could not find carer to remove patient from. User may have been deleted."
            });
        } else {

            //find patient to update also
            User.findOne({'user_id': req.params.patient_id}, function (err, foundPatient) {

                if (err) {
                    console.log(JSON.stringify(err));
                    res.status(500).send({
                        error: err
                    });
                } else if (!foundPatient) {
                    res.status(404).send({
                        error: "Could not find patient to remove from carer. User may have been deleted."
                    });
                } else {

                    //remove patient from carer

                    //check patient exists on carer
                    var patientExistsOnCarer = false;

                    if (foundCarer.connectedPatient) {
                        if (foundCarer.connectedPatient.user_id == req.params.patient_id) {
                            patientExistsOnCarer = true;
                        }

                        if (!patientExistsOnCarer) {
                            return res.status(404).send({
                                error: "Can't find connection from specified patient to specified carer"
                            })
                        }
                    }

                    //check carer exists on patient
                    var carerExistsOnPatient = false;

                    if (foundPatient.connectedCarers.length > 0) {

                        //check that carer id exists within list of patient's connected carers
                        carerExistsOnPatient = _.some(foundPatient.connectedCarers, function (connectedCarer) {

                            if (connectedCarer.user_id == req.params.carer_id) {
                                return true;
                            }

                        });

                        if (!carerExistsOnPatient) {
                            return res.status(404).send({
                                error: "Can't find connection from specified carer to specified patient."
                            });
                        }
                    }

                    if (carerExistsOnPatient && patientExistsOnCarer) {

                        //remove carer from patient
                        foundPatient.connectedCarers = _.reject(foundPatient.connectedCarers, function (connectedCarer) {
                            if (connectedCarer.user_id == req.params.carer_id) {
                                return connectedCarer;
                            }
                        });

                        //save changes to patient
                        foundPatient.save(function (err, savedPatient) {

                            if (err) {
                                console.log(JSON.stringify(err));
                                return res.status(500).jsonp({
                                    error: err
                                });
                            } else {

                                //remove patient from carer
                                foundCarer.connectedPatient = undefined;

                                //save changes to carer
                                foundCarer.save(function (err, savedCarer) {

                                    if (err) {
                                        console.log(JSON.stringify(err));
                                        return res.status(500).jsonp({
                                            error: err
                                        });
                                    } else {
                                        //return new patient and carer data to client
                                        return res.status(200).jsonp({
                                            message: "Successfully disconnected patient from carer.",
                                            data: [savedPatient, savedCarer]
                                        })
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
    });
};

exports.updateLocation = function (req, res) {

    //retrieve the user
    var userId = req.params.user_id;

    User.findOne({'user_id': userId}, function (err, foundUser) {

        if (err) {
            console.log(JSON.stringify(err));
            return res.status(500).jsonp({
                error: err
            });
        }

        //if no user with this user_id exists, create one
        if (foundUser == null) {

            console.log('Error: Could not find specified user!');
            return res.status(503).jsonp({
                error: 'Could not find specified user!'
            });
        } else {

            if (!req.body) {

                console.log('Error: No new location supplied!');
                return res.status(503).jsonp({
                    error: 'No new location was supplied!'
                });
            } else {

                //update the user's location
                foundUser.location.lat = req.body.latitude;
                foundUser.location.long = req.body.longitude;

                if (req.body.accuracy) {
                    foundUser.location.accuracy = req.body.accuracy;
                }

                //save the changes made to the user's location
                foundUser.save(function (err, user) {
                    if (err) {
                        console.log(JSON.stringify(err));
                        return res.status(500).jsonp({
                            error: err
                        });
                    } else {
                        return res.jsonp(
                            {
                                data: user
                            }
                        );
                    }
                });
            }
        }
    });
};

exports.retrieveCarerLocations = function (req, res) {

    //retrieve locations for each user in supplied list of users
    User.findOne({'user_id': req.params.patient_id}, function (err, foundPatient) {

        if (err) {

            console.log('error when attempting to find requesting patient user: ' + JSON.stringify(error));
            return res.status(502).jsonp({
                error: 'An error occurred attempting to find patient user: ' + JSON.stringify(error)
            });
        } else if (!foundPatient) {

            console.log('The requesting user could not be found');
            return res.status(404).jsonp({
                error: 'Could not find a user corresponding to requesting User ID'
            })
        } else {

            //patient requesting carer locations is valid, proceed
            User.find({'user_id': {$in: req.body.patientCarerUserIds}}, function (err, foundCarers) {

                if (err) {

                    return res.status(502).jsonp({
                        error: 'Error occurred when attempting to find list of carers for patient: ' + JSON.stringify(error)
                    });
                } else if (!foundCarers) {

                    return res.status(404).jsonp({
                        error: 'No users were found for the specified carer IDs'
                    });
                } else {

                    var patientCarerLocations = [];

                    //build new list of locations and return to the patient
                    _.each(foundCarers, function (carer) {

                        if (carer.location) {
                            var carerLocation = carer.location;
                            carerLocation.user_id = carer.user_id;
                            carerLocation.name = carer.firstName + ' ' + carer.lastName;
                            patientCarerLocations.push(carerLocation);
                        }
                    });

                    //now return this list to the user
                    return res.status(200).jsonp({
                        message: 'Successfully retrieved a list of carer locations',
                        data: patientCarerLocations
                    });
                }
            });
        }
    });
};

exports.updateHomeLocation = function (req, res) {

    //retrieve the user
    var userId = req.params.user_id;

    User.findOne({'user_id': userId}, function (err, foundUser) {

        if (err) {
            console.log(JSON.stringify(err));
            return res.status(500).jsonp({
                error: err
            });
        }

        //if no user with this user_id exists, create one
        if (foundUser == null) {

            console.log('Error: Could not find specified user!');
            return res.status(503).jsonp({
                error: 'Could not find specified user!'
            });
        } else {

            if (!req.body) {

                console.log('Error: No new home location supplied!');
                return res.status(503).jsonp({
                    error: 'No new home location was supplied!'
                });

            } else {

                //update the user's location
                foundUser.homeAddress.homeLat = req.body.latitude;
                foundUser.homeAddress.homeLong = req.body.longitude;

                //save the changes made to the user's location
                foundUser.save(function (err, user) {
                    if (err) {
                        console.log(JSON.stringify(err));
                        return res.status(500).jsonp({
                            error: err
                        });
                    } else {
                        return res.jsonp(
                            {
                                data: user
                            }
                        );
                    }
                });
            }
        }
    });
};

exports.userSync = function (req, res) {
    var user_id = req.body.user_id;

    User.findOne({'user_id': user_id}, function (err, foundUser) {

        if (err) {
            console.log(JSON.stringify(err));
            return res.status(500).jsonp({
                error: err
            });
        }

        //if no user with this user_id exists, create one
        if (foundUser == null) {

            //construct an object to represent the new user and insert into database
            
            var newUser = {
                user_id: req.body.user_id,
                email: req.body.email,
                username: req.body.nickname,
                pic: req.body.picture,
                userDeviceTokens: [],
                name: req.body.name,
                location: {
                    name: 'Default Location',
                    lat: 53.3,
                    long: 2.2,
                    accuracy: 100
                }
            };

            //now check for other data which may or may not be present and add, then save to DB
            
            //Create and save the user
            User.create(newUser, function (err, user) {
                if (err) {
                    console.log(JSON.stringify(err));
                    return res.status(500).jsonp({
                        error: err
                    });
                }
                res.status(201).jsonp(
                    {
                        isNewUser: true,
                        data: user
                    }
                );
            });

        } else {

            foundUser.username = req.body.nickname;
            foundUser.name = req.body.name;
            //foundUser.pic = req.body.picture;
            foundUser.email = req.body.email;

            foundUser.save(function (err, user) {
                if (err) {
                    console.log(JSON.stringify(err));
                    return res.status(500).jsonp({
                        error: err
                    });
                } else {
                    return res.jsonp(
                        {
                            isNewUser: false,
                            data: user
                        }
                    );
                }
            });
        }
    });
};

exports.updatePic = function (req, res) {

    //retrieve the user
    var userId = req.params.user_id;

    User.findOne({'user_id': userId}, function (err, foundUser) {

        if (err) {
            console.log(JSON.stringify(err));
            return res.status(500).jsonp({
                error: err
            });
        }

        //if no user with this user_id exists, create one
        //todo: enforce unique email addresses
        if (foundUser == null) {

            console.log('Error: Could not find specified user!');
            return res.status(503).jsonp({
                error: 'Could not find specified user!'
            });
        } else {
            //validate that there is a pic
            if (!req.file) {

                console.log('Error: No updated image supplied!');
                return res.status(503).jsonp({
                    error: 'No updated image supplied!'
                });
            } else {

                //set picture to be the url of where the picture is available on the server
                foundUser.pic = '/uploads/' + req.file.filename;

                //save the changes to the user
                foundUser.save(function (err, user) {
                    if (err) {
                        console.log(JSON.stringify(err));
                        return res.status(500).jsonp({
                            error: err
                        });
                    } else {
                        return res.jsonp(
                            {
                                data: user
                            }
                        );
                    }
                });
            }
        }
    });
};

exports.getUserData = function (req, res) {
    var user_id = req.params.user_id;
    User.findOne({'user_id': user_id}, function (err, results) {

        if (err) {
            console.log(JSON.stringify(err));
            return res.status(500).jsonp({
                error: err
            });
        }

        return res.jsonp(results);
    });
};

exports.deleteUser = function (req, res) {

    User.remove({'user_id': req.params.user_id}, function (err) {

        if (err) {
            console.log(JSON.stringify(err));

            return res.status(502).jsonp({
                error: err
            });
        }

        res.status(200).send({
            message: "User was successfully deleted"
        });
    });
};