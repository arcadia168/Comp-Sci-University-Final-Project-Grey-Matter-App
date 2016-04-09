var should = require('chai').should(),
    expect = require('chai').expect,
    supertest = require('supertest'),
    _ = require('underscore');

api = supertest('localhost:8000/api'); //todo: alternate this for production environment

//TODO: IMPLEMENT API AUTHORISATION USING AUTH0 AND HARD CODING USER LOGIN DETAILS... ?
//SHOULD WORK AS API JUST CHECKS THAT A VALID JWT IS ATTACHED TO ALL REQUESTS

//COULD SOMEONE LOG IN, GET A JWT, THEN RUN ANY COMMAND USING THIS JWT? IF THEY ACQUIRED OTHER USER IDS? I.E USER DELETE COMMAND?
//WOULD BE ABLE TO GET USER IDS VIA WIRESHARK
//WOULD NEED TO KNOW THE API ROUTES HOWEVER.
//ANYWAY TO CHECK EACH TIME THAT USER_ID RELATES TO LOGGED IN USER?
//HTTP IS STATELESS, USE REDIS TO STORE SESSIONS ON THE SERVER? THEN USE EXPRESS TO ENSURE THAT SAME SESSION IS BEING USED?
//LOOK IN TO THIS.

describe('User', function () {

    //todo: use a before each to create a temp carer for each test on the server, use after each to delete this temp carer

    describe('connecting patient type users to carer type users', function () {

        var testPatient1 = {
            user_id: 'testpatient1',
            email: 'testpatient1@domain.com',
            nickname: 'testpatient1username'
        }, testPatient2 = {
            user_id: 'testpatient2',
            email: 'testpatient2@domain.com',
            nickname: 'testpatient2username'
        };

        before(function (done) {

            //create 2 test patients to use globally

            //creating test patient 1
            api.post('/users/sync')
                .send(testPatient1)
                .end(function (err, res) {

                    expect(res).not.to.be.null;
                    expect(res.status).to.equal(201);

                    var responseObject = JSON.parse(res.text);

                    expect(responseObject.isNewUser).to.equal(true);
                    expect(responseObject.data.user_id).to.equal('testpatient1');
                    expect(responseObject.data.email).to.equal('testpatient1@domain.com');
                    expect(responseObject.data.username).to.equal('testpatient1username');

                    var newUserData = {
                        userType: "patient"
                    };

                    _.extend(responseObject.data, newUserData);

                    //set this user to be a carer
                    api.post('/users/' + responseObject.data.user_id + '/update')
                        .send(responseObject.data)
                        .end(function (err, res) {
                            expect(res).not.to.be.null;
                            expect(res.status).to.equal(200);

                            var responseObject = JSON.parse(res.text);

                            expect(responseObject.message).to.equal('User details were successfully updated.');
                            expect(responseObject.data.user_id).to.equal('testpatient1');
                            expect(responseObject.data.email).to.equal('testpatient1@domain.com');
                            expect(responseObject.data.username).to.equal('testpatient1username');
                            expect(responseObject.data.userType).to.equal('patient');

                            //create the second test patient
                            api.post('/users/sync')
                                .send(testPatient2)
                                .end(function (err, res) {

                                    expect(res).not.to.be.null;
                                    expect(res.status).to.equal(201);

                                    var responseObject = JSON.parse(res.text);

                                    expect(responseObject.isNewUser).to.equal(true);
                                    expect(responseObject.data.user_id).to.equal('testpatient2');
                                    expect(responseObject.data.email).to.equal('testpatient2@domain.com');
                                    expect(responseObject.data.username).to.equal('testpatient2username');

                                    var newUserData = {
                                        userType: "patient"
                                    };

                                    _.extend(responseObject.data, newUserData);

                                    //set this user to be a carer
                                    api.post('/users/' + responseObject.data.user_id + '/update')
                                        .send(responseObject.data)
                                        .end(function (err, res) {
                                            expect(res).not.to.be.null;
                                            expect(res.status).to.equal(200);

                                            var responseObject = JSON.parse(res.text);

                                            expect(responseObject.message).to.equal('User details were successfully updated.');
                                            expect(responseObject.data.user_id).to.equal('testpatient2');
                                            expect(responseObject.data.email).to.equal('testpatient2@domain.com');
                                            expect(responseObject.data.username).to.equal('testpatient2username');
                                            expect(responseObject.data.userType).to.equal('patient');

                                            done();
                                        });
                                });
                        });
                });

        });

        after(function (done) {

            //delete both the test patients
            api.delete('/users/testpatient1/delete/')
                .end(function (err, res) {

                    expect(err).to.be.null;
                    expect(res.status).to.equal(200);

                    var responseObject = JSON.parse(res.text);
                    expect(responseObject.message).to.equal('User was successfully deleted');

                    api.delete('/users/testpatient2/delete')
                        .end(function (err, res) {

                            expect(err).to.be.null;
                            expect(res.status).to.equal(200);

                            var responseObject = JSON.parse(res.text);
                            expect(responseObject.message).to.equal('User was successfully deleted');

                            done();
                        });
                })
        });

        //todo: how to make each created temp account different? Use some form of counter/random number?
        //beforeEach(function (done) {
        //    done()
        //});
        //
        //afterEach(function (done) {
        //    done()
        //});

        //NOT DEPENDENT
        it('should be able to connect to the api', function (done) {

            api.get('/')
                .set('Accept', 'application/json')
                .end(function (err, res) {
                    expect(res.status).to.equal(200);
                    expect(res.body).to.have.property('status');
                    expect(res.body.status).to.equal('Running');
                    done();
                });
        });

        //NOT DEPENDENT
        it('should\'t be able to send an invitation from an invalid patient', function (done) {

            var invalidPatientId = 'xxxyyy', validCarerEmail = {
                email: "newtestuser@domain.com"
            };

            api.post('/users/' + invalidPatientId + '/invite')
                .send(validCarerEmail)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.status).to.equal(404);
                    expect(res.text).not.to.be.null;

                    //even though errors, sends back res object with json attached to text property
                    var error = JSON.parse(res.text);

                    //error is sent back is attached to the error property
                    expect(error.error).to.equal('Could not find inviting user. Please restart the app and sign in again.');

                    done();
                });

        });

        //NOT DEPENDENT
        it('shouldn\'t be able to send an invitation to an invalid carer', function (done) {

            var validPatientId = testPatient1.user_id, invalidCarerEmail = {
                email: "invalidcarer@domain.com"
            };

            api.post('/users/' + validPatientId + '/invite')
                .send(invalidCarerEmail)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.status).to.equal(404);
                    expect(res.text).not.to.be.null;

                    //even though errors, sends back res object with json attached to text property
                    var error = JSON.parse(res.text);

                    //error is sent back is attached to the error property
                    expect(error.error).to.equal('No carer was found using the supplied email address. Please ensure that the user exists.');

                    done();
                });

        });

        //NOT DEPENDENT
        it('shouldn\'t be able to invite themselves', function (done) {

            var validPatientId = testPatient1.user_id, invalidCarerEmail = {
                email: testPatient1.email
            };

            api.post('/users/' + validPatientId + '/invite')
                .send(invalidCarerEmail)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.status).to.equal(409);
                    expect(res.text).not.to.be.null;

                    //even though errors, sends back res object with json attached to text property
                    var error = JSON.parse(res.text);

                    //error is sent back is attached to the error property
                    expect(error.error).to.equal('You can\'t invite yourself to connect!');

                    done();
                });

        });

        //NOT DEPENDENT
        it('shouldn\'t be able to send an invitation to an another patient', function (done) {

            var validPatientId = testPatient1.user_id, invalidCarerEmail = {
                email: testPatient2.email
            };

            api.post('/users/' + validPatientId + '/invite')
                .send(invalidCarerEmail)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.status).to.equal(500);
                    expect(res.text).not.to.be.null;

                    //even though errors, sends back res object with json attached to text property
                    var error = JSON.parse(res.text);

                    //error is sent back is attached to the error property
                    expect(error.error).to.equal('The person you are inviting is also a patient! There can only be one patient to a number of carers.');

                    done();
                });

        });

        //CREATES AND DESTROYS TEMP CARER - FIXED
        describe('sending an invitation', function () {

            //Create a new temporary carer
            var tempUser = {
                user_id: "testnewuser",
                email: "testnewuser@domain.com",
                nickname: "testy"
            };

            //create carer
            before(function (done) {

                api.post("/users/sync")
                    .send(tempUser)
                    .end(function (err, res) {

                        expect(res).not.to.be.null;
                        expect(res.status).to.equal(201);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.isNewUser).to.equal(true);
                        expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                        expect(responseObject.data.email).to.equal(tempUser.email);
                        expect(responseObject.data.username).to.equal(tempUser.nickname);

                        var newUserData = {
                            userType: "carer"
                        };

                        _.extend(responseObject.data, newUserData);

                        //set this user to be a carer
                        api.post('/users/' + responseObject.data.user_id + '/update')
                            .send(responseObject.data)
                            .end(function (err, res) {
                                expect(res).not.to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject.message).to.equal('User details were successfully updated.');
                                expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                                expect(responseObject.data.email).to.equal(tempUser.email);
                                expect(responseObject.data.username).to.equal(tempUser.nickname);
                                expect(responseObject.data.userType).to.equal('carer');

                                done();
                            });
                    });

            });

            after(function (done) {

                //now clean up by deleting the temporary user
                api.delete('/users/' + tempUser.user_id + '/delete')
                    .end(function (err, res) {

                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.message).to.equal('User was successfully deleted');

                        done();
                    });

            });

            it('should be able to send an invitation to a carer', function (done) {

                //Now attempt to send an invitation to this new temporary test user
                var validPatientId = testPatient1.user_id,
                    validCarerEmail = {
                        email: tempUser.email
                    };

                api.post('/users/' + validPatientId + '/invite')
                    .send(validCarerEmail)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);
                        expect(res.text).not.to.be.null;

                        //even though errors, sends back res object with json attached to text property
                        var response = JSON.parse(res.text);

                        //error is sent back is attached to the error property
                        expect(response.message).to.equal('Invitation sent successfully.');

                        done();
                    });
            })
        });

//CREATES AND DESTROYS TEMP CARER - FIXED
        describe('checking for pre-existing invitation', function () {

            //Create a new temporary carer
            var tempUser = {
                user_id: "testnewuser4",
                email: "testnewuser4@domain.com",
                nickname: "testy4"
            };

            //create carer
            before(function (done) {

                api.post("/users/sync")
                    .send(tempUser)
                    .end(function (err, res) {

                        expect(res).not.to.be.null;
                        expect(res.status).to.equal(201);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.isNewUser).to.equal(true);
                        expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                        expect(responseObject.data.email).to.equal(tempUser.email);
                        expect(responseObject.data.username).to.equal(tempUser.nickname);

                        var newUserData = {
                            userType: "carer"
                        };

                        _.extend(responseObject.data, newUserData);

                        //set this user to be a carer
                        api.post('/users/' + responseObject.data.user_id + '/update')
                            .send(responseObject.data)
                            .end(function (err, res) {
                                expect(res).not.to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject.message).to.equal('User details were successfully updated.');
                                expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                                expect(responseObject.data.email).to.equal(tempUser.email);
                                expect(responseObject.data.username).to.equal(tempUser.nickname);
                                expect(responseObject.data.userType).to.equal('carer');

                                done();
                            });
                    });

            });

            after(function (done) {

                //now clean up by deleting the temporary user
                api.delete('/users/' + tempUser.user_id + '/delete')
                    .end(function (err, res) {

                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.message).to.equal('User was successfully deleted');

                        done();
                    });

            });

            it('should reject if pre-existing invite found and return error', function (done) {

                var validPatientId = testPatient1.user_id,
                    validCarerEmail = {
                        email: tempUser.email
                    };

                //send the first, original invite which should work fine
                api.post('/users/' + validPatientId + '/invite')
                    .send(validCarerEmail)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);
                        expect(res.text).not.to.be.null;

                        //even though errors, sends back res object with json attached to text property
                        var response = JSON.parse(res.text);

                        //error is sent back is attached to the error property
                        expect(response.message).to.equal('Invitation sent successfully.');

                        //Now attempt to send the invite again and expect to see an error message
                        api.post('/users/' + validPatientId + '/invite')
                            .send(validCarerEmail)
                            .end(function (err, res) {
                                expect(err).to.be.null;
                                expect(res.status).to.equal(409);
                                expect(res.text).not.to.be.null;

                                //even though errors, sends back res object with json attached to text property
                                var error = JSON.parse(res.text);

                                //error is sent back is attached to the error property
                                expect(error.error).to.equal('An invitation from this patient to this carer already existed.');

                                done();
                            });
                    });
            });

        });

//NOT DEPENDENT
        it('should not be able to reject an invitation using in invalid patient id', function (done) {

            var invalidPatientId = 'xxxyyy',
                validCarerId = 'testnewuser'

            api.get('/users/invite/reject/' + invalidPatientId + '/' + validCarerId)
                .end(function (err, res) {

                    expect(err).to.be.null;
                    expect(res.status).to.equal(404);

                    var error = JSON.parse(res.text);

                    expect(error.error).to.equal('Could not find patient to connect to. User may have been deleted.');

                    done();
                });

        });

//NOT DEPENDENT
        it('should not be able to accept an invitation using an invalid patient id', function (done) {

            var invalidPatientId = 'xxxyyy',
                validCarerId = 'testnewuser'

            api.get('/users/invite/accept/' + invalidPatientId + '/' + validCarerId)
                .end(function (err, res) {

                    expect(err).to.be.null;
                    expect(res.status).to.equal(404);

                    var error = JSON.parse(res.text);

                    expect(error.error).to.equal('Could not find patient to connect to. User may have been deleted.');

                    done();
                });

        });

//NOT DEPENDENT
        it('should check an invitation exists before accepting and reject if invitation doesn\'t exist', function (done) {

            //need to attempt to accept an invitation from a carer who did not send an invitation
            var invalidAcceptingCarerId = "titsmcgee";
            var validPatientId = testPatient1.user_id;

            //attempt to accept the non-existent invitation
            api.get('/users/invite/accept/' + validPatientId + '/' + invalidAcceptingCarerId)
                .end(function (err, res) {
                    expect(err).to.be.null;
                    expect(res.status).to.equal(404);

                    var error = JSON.parse(res.text);

                    expect(error.error).to.equal("No corresponding invitation to connect to carer was found");

                    done();
                });
        });

//CREATES AND DESTROYS TEMP CARER - FIXED
        describe('accepting an invitation', function () {

            //Create a new temporary carer
            var tempUser = {
                user_id: "testnewuser5",
                email: "testnewuser5@domain.com",
                nickname: "testy5"
            };

            //create carer
            before(function (done) {

                api.post("/users/sync")
                    .send(tempUser)
                    .end(function (err, res) {

                        expect(res).not.to.be.null;
                        expect(res.status).to.equal(201);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.isNewUser).to.equal(true);
                        expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                        expect(responseObject.data.email).to.equal(tempUser.email);
                        expect(responseObject.data.username).to.equal(tempUser.nickname);

                        var newUserData = {
                            userType: "carer"
                        };

                        _.extend(responseObject.data, newUserData);

                        //set this user to be a carer
                        api.post('/users/' + responseObject.data.user_id + '/update')
                            .send(responseObject.data)
                            .end(function (err, res) {
                                expect(res).not.to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject.message).to.equal('User details were successfully updated.');
                                expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                                expect(responseObject.data.email).to.equal(tempUser.email);
                                expect(responseObject.data.username).to.equal(tempUser.nickname);
                                expect(responseObject.data.userType).to.equal('carer');

                                done();
                            });
                    });

            });

            after(function (done) {

                //now clean up by deleting the temporary user
                api.delete('/users/' + tempUser.user_id + '/delete')
                    .end(function (err, res) {

                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.message).to.equal('User was successfully deleted');

                        done();
                    });

            });

            //CREATES AND DESTROYS TEMP CARER - FIXED
            it('should accept a user invitation', function (done) {


                var validPatientId = testPatient1.user_id,
                    validCarerEmail = {
                        email: tempUser.email
                    };

                api.post('/users/' + validPatientId + '/invite')
                    .send(validCarerEmail)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);
                        expect(res.text).not.to.be.null;

                        //even though errors, sends back res object with json attached to text property
                        var responseObject = JSON.parse(res.text);

                        expect(responseObject).not.to.have.property('error');

                        //error is sent back is attached to the error property
                        expect(responseObject).to.have.property('message');
                        expect(responseObject.message).to.equal('Invitation sent successfully.');

                        console.log("Issued invitations are: " + JSON.stringify(responseObject.data[0].issuedInvitations));

                        //test to see that invitations are properly deleted once accepted
                        var invitationFromPatientExists = false;

                        _.some(responseObject.data[0].issuedInvitations, function (invitation) {
                            if (invitation.recipient.user_id == tempUser.user_id) {
                                return invitationFromPatientExists = true;
                            }
                        });

                        expect(invitationFromPatientExists).to.be.true;

                        var invitationToCarerExists = false;

                        _.some(responseObject.data[1].careConnectInvitations, function (invitation) {
                            if (invitation.sender.user_id == validPatientId) {
                                return invitationToCarerExists = true;
                            }
                        });

                        expect(invitationToCarerExists).to.be.true;

                        //Now accept this invitation
                        //create a temporary carer, send them an invite and then accept this invite
                        //accept previously made test invitation from test carer to actual patient
                        var acceptingCarerId = tempUser.user_id;
                        var invitingPatientId = testPatient1.user_id;

                        api.get('/users/invite/accept/' + invitingPatientId + '/' + acceptingCarerId)
                            .end(function (err, res) {
                                expect(err).to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject).not.to.have.property('error');
                                expect(responseObject).to.have.property('message');
                                expect(responseObject.message).to.equal('Successfully accepted invitation, connected carer to patient');
                                expect(responseObject.data[0].user_id).to.equal(invitingPatientId);

                                //test to see that invitations are properly deleted once accepted
                                var invitationFromPatientExists = false;

                                _.some(responseObject.data[0].issuedInvitations, function (invitation) {
                                    if (invitation.recipient.user_id == acceptingCarerId) {
                                        return invitationFromPatientExists = true;
                                    }
                                });

                                expect(invitationFromPatientExists).to.be.false;

                                var invitationToCarerExists = false;

                                _.some(responseObject.data[1].careConnectInvitations, function (invitation) {
                                    if (invitation.sender.user_id == acceptingCarerId) {
                                        return invitationToCarerExists = true;
                                    }
                                });

                                expect(invitationToCarerExists).to.be.false;

                                //check that this carer has now marked their profile as complete
                                expect(responseObject.data[1].profileCompleted).to.be.true;

                                done();
                            });
                    });
            });

        });

//CREATES AND DESTROYS TEMP CARER - FIXED
        describe('checking for existing patient', function () {

            //Create a new temporary carer
            var tempUser = {
                user_id: "testnewuser6",
                email: "testnewuser6@domain.com",
                nickname: "testy6"
            };

            //create carer
            before(function (done) {

                api.post("/users/sync")
                    .send(tempUser)
                    .end(function (err, res) {

                        expect(res).not.to.be.null;
                        expect(res.status).to.equal(201);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.isNewUser).to.equal(true);
                        expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                        expect(responseObject.data.email).to.equal(tempUser.email);
                        expect(responseObject.data.username).to.equal(tempUser.nickname);

                        var newUserData = {
                            userType: "carer"
                        };

                        _.extend(responseObject.data, newUserData);

                        //set this user to be a carer
                        api.post('/users/' + responseObject.data.user_id + '/update')
                            .send(responseObject.data)
                            .end(function (err, res) {
                                expect(res).not.to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject.message).to.equal('User details were successfully updated.');
                                expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                                expect(responseObject.data.email).to.equal(tempUser.email);
                                expect(responseObject.data.username).to.equal(tempUser.nickname);
                                expect(responseObject.data.userType).to.equal('carer');

                                done();
                            });
                    });

            });

            after(function (done) {

                //now clean up by deleting the temporary user
                api.delete('/users/' + tempUser.user_id + '/delete')
                    .end(function (err, res) {

                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.message).to.equal('User was successfully deleted');

                        done();
                    });

            });

            it('should not be able to accept an invitation if already connected to a patient', function (done) {

                var validPatientId = testPatient1.user_id,
                    validCarerEmail = {
                        email: tempUser.email
                    };

                api.post('/users/' + validPatientId + '/invite')
                    .send(validCarerEmail)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);
                        expect(res.text).not.to.be.null;

                        //even though errors, sends back res object with json attached to text property
                        var response = JSON.parse(res.text);

                        //error is sent back is attached to the error property
                        expect(response.message).to.equal('Invitation sent successfully.');

                        //Now accept this invitation
                        var acceptingCarerId = tempUser.user_id;
                        var invitingPatientId = testPatient1.user_id;

                        api.get('/users/invite/accept/' + invitingPatientId + '/' + acceptingCarerId)
                            .end(function (err, res) {
                                expect(err).to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject.message).to.equal('Successfully accepted invitation, connected carer to patient');
                                expect(responseObject.data[0].user_id).to.equal(invitingPatientId);

                                //test to see that invitations are properly deleted once accepted
                                var invitationFromPatientExists = false;

                                _.some(responseObject.data[0].issuedInvitations, function (invitation) {
                                    if (invitation.recipient.user_id == acceptingCarerId) {
                                        return invitationFromPatientExists = true;
                                    }
                                });

                                expect(invitationFromPatientExists).to.be.false;

                                var invitationToCarerExists = false;

                                _.some(responseObject.data[1].careConnectInvitations, function (invitation) {
                                    if (invitation.sender.user_id == acceptingCarerId) {
                                        return invitationToCarerExists = true;
                                    }
                                });

                                expect(invitationToCarerExists).to.be.false;

                                //now invite from different patient
                                var validPatientId = testPatient2.user_id,
                                    validCarerEmail = {
                                        email: tempUser.email
                                    };

                                api.post('/users/' + validPatientId + '/invite')
                                    .send(validCarerEmail)
                                    .end(function (err, res) {
                                        expect(err).to.be.null;
                                        expect(res.status).to.equal(200);
                                        expect(res.text).not.to.be.null;

                                        //even though errors, sends back res object with json attached to text property
                                        var response = JSON.parse(res.text);

                                        //error is sent back is attached to the error property
                                        expect(response.message).to.equal('Invitation sent successfully.');

                                        //attempt to accept from this patient, should encounter an error
                                        var acceptingCarerId = tempUser.user_id;
                                        var invitingPatientId = testPatient2.user_id;

                                        api.get('/users/invite/accept/' + invitingPatientId + '/' + acceptingCarerId)
                                            .end(function (err, res) {
                                                expect(err).to.be.null;
                                                expect(res.status).to.equal(409);

                                                var error = JSON.parse(res.text);

                                                expect(error.error).to.equal("Carer is already connected to a patient. Please disconnect from current patient before attempting to connect to another.");

                                                done();
                                            });
                                    });
                            });
                    });
            });
        });

//NOT DEPENDENT
        describe('rejecting an invitation', function () {

            //Create a new temporary carer
            var tempUser = {
                user_id: "testnewuser2",
                email: "testnewuser2@domain.com",
                nickname: "testy2"
            };

            //create carer
            before(function (done) {

                api.post("/users/sync")
                    .send(tempUser)
                    .end(function (err, res) {

                        expect(res).not.to.be.null;
                        expect(res.status).to.equal(201);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.isNewUser).to.equal(true);
                        expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                        expect(responseObject.data.email).to.equal(tempUser.email);
                        expect(responseObject.data.username).to.equal(tempUser.nickname);

                        var newUserData = {
                            userType: "carer"
                        };

                        _.extend(responseObject.data, newUserData);

                        //set this user to be a carer
                        api.post('/users/' + responseObject.data.user_id + '/update')
                            .send(responseObject.data)
                            .end(function (err, res) {
                                expect(res).not.to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject.message).to.equal('User details were successfully updated.');
                                expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                                expect(responseObject.data.email).to.equal(tempUser.email);
                                expect(responseObject.data.username).to.equal(tempUser.nickname);
                                expect(responseObject.data.userType).to.equal('carer');

                                done();
                            });
                    });

            });

            after(function (done) {

                //now clean up by deleting the temporary user
                api.delete('/users/' + tempUser.user_id + '/delete')
                    .end(function (err, res) {

                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.message).to.equal('User was successfully deleted');

                        done();
                    });

            });

            it('should reject', function (done) {

                //Now invite this carer to connect from a patient
                //Now attempt to send an invitation to this new temporary test user
                var validPatientId = testPatient1.user_id,
                    validCarerEmail = {
                        email: tempUser.email
                    };

                api.post('/users/' + validPatientId + '/invite')
                    .send(validCarerEmail)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);
                        expect(res.text).not.to.be.null;

                        //even though errors, sends back res object with json attached to text property
                        var response = JSON.parse(res.text);

                        //error is sent back is attached to the error property
                        expect(response.message).to.equal('Invitation sent successfully.');

                        var rejectingCarerId = tempUser.user_id,
                            invitingPatientId = validPatientId;

                        //Now reject this invitation from as the carer
                        api.get('/users/invite/reject/' + invitingPatientId + '/' + rejectingCarerId)
                            .end(function (err, res) {

                                expect(err).to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject.message).to.equal('Successfully rejected invitation');
                                expect(responseObject.data[0].user_id).to.equal(invitingPatientId);

                                //test to see that invitations are properly deleted once accepted
                                var invitationFromPatientExists = false;

                                _.some(responseObject.data[0].issuedInvitations, function (invitation) {
                                    if (invitation.recipient.user_id == rejectingCarerId) {
                                        return invitationFromPatientExists = true;
                                    }
                                });

                                //expect that this invitation shows as rejected by the carer on the patient
                                expect(invitationFromPatientExists).to.be.false;

                                var invitationToCarerExists = false;

                                _.some(responseObject.data[1].careConnectInvitations, function (invitation) {
                                    if (invitation.recipient.user_id == rejectingCarerId) {
                                        return invitationToCarerExists = true;
                                    }
                                });

                                expect(invitationToCarerExists).to.be.false;

                                done();
                            });
                    });
            })
        });

//NOT DEPENDENT
        describe('deleting a carer and then attempting to accept an invite', function () {

            //Create a new temporary carer
            var tempUser = {
                user_id: "testnewuser3",
                email: "testnewuser3@domain.com",
                nickname: "testy3"
            };

            //create carer
            before(function (done) {

                api.post("/users/sync")
                    .send(tempUser)
                    .end(function (err, res) {

                        expect(res).not.to.be.null;
                        expect(res.status).to.equal(201);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.isNewUser).to.equal(true);
                        expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                        expect(responseObject.data.email).to.equal(tempUser.email);
                        expect(responseObject.data.username).to.equal(tempUser.nickname);

                        var newUserData = {
                            userType: "carer"
                        };

                        _.extend(responseObject.data, newUserData);

                        //set this user to be a carer
                        api.post('/users/' + responseObject.data.user_id + '/update')
                            .send(responseObject.data)
                            .end(function (err, res) {
                                expect(res).not.to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject.message).to.equal('User details were successfully updated.');
                                expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                                expect(responseObject.data.email).to.equal(tempUser.email);
                                expect(responseObject.data.username).to.equal(tempUser.nickname);
                                expect(responseObject.data.userType).to.equal('carer');

                                done();
                            });
                    });

            });

            after(function (done) {

                //now clean up by deleting the temporary user
                api.delete('/users/' + tempUser.user_id + '/delete')
                    .end(function (err, res) {

                        expect(err).to.be.null;
                        done();

                    });

            });

            it('should not allow a deleted carer to accept an invitation', function (done) {

                //Now attempt to send an invitation to this new temporary test carer
                var validPatientId = testPatient1.user_id,
                    validCarerEmail = {
                        email: "testnewuser3@domain.com"
                    };

                api.post('/users/' + validPatientId + '/invite')
                    .send(validCarerEmail)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);
                        expect(res.text).not.to.be.null;

                        //even though errors, sends back res object with json attached to text property
                        var response = JSON.parse(res.text);

                        //error is sent back is attached to the error property
                        expect(response.message).to.equal('Invitation sent successfully.');

                        //delete the carer
                        api.delete('/users/testnewuser3/delete')
                            .end(function (err, res) {
                                expect(err).to.be.null;
                                expect(res.status).to.equal(200);

                                //todo: repeat this statement wherever an error is not expected!!!
                                var responseObject = JSON.parse(res.text);
                                //expect(responseObject.error).to.be.null;

                                expect(responseObject.message).to.equal('User was successfully deleted');

                                //attempt to accept the invitation from deleted carer, should error
                                api.get('/users/invite/accept/' + validPatientId + '/testnewuser3')
                                    .end(function (err, res) {
                                        expect(err).to.be.null;
                                        expect(res.status).to.equal(404);
                                        var error = JSON.parse(res.text);
                                        expect(error.error).to.equal("Could not find carer to connect to. User may have been deleted.");

                                        done();
                                    });
                            });
                    });
            })
        });

//NOT DEPENDENT
        describe('deleting a carer and then attempting to reject an invite', function () {

            //Create a new temporary carer
            var tempUser = {
                user_id: "testnewuser3.5",
                email: "testnewuser3.5@domain.com",
                nickname: "testy3.5"
            };

            //create carer
            before(function (done) {

                api.post("/users/sync")
                    .send(tempUser)
                    .end(function (err, res) {

                        expect(res).not.to.be.null;
                        expect(res.status).to.equal(201);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.isNewUser).to.equal(true);
                        expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                        expect(responseObject.data.email).to.equal(tempUser.email);
                        expect(responseObject.data.username).to.equal(tempUser.nickname);

                        var newUserData = {
                            userType: "carer"
                        };

                        _.extend(responseObject.data, newUserData);

                        //set this user to be a carer
                        api.post('/users/' + responseObject.data.user_id + '/update')
                            .send(responseObject.data)
                            .end(function (err, res) {
                                expect(res).not.to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject.message).to.equal('User details were successfully updated.');
                                expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                                expect(responseObject.data.email).to.equal(tempUser.email);
                                expect(responseObject.data.username).to.equal(tempUser.nickname);
                                expect(responseObject.data.userType).to.equal('carer');

                                done();
                            });
                    });

            });

            after(function (done) {

                //now clean up by deleting the temporary user
                api.delete('/users/' + tempUser.user_id + '/delete')
                    .end(function (err, res) {

                        expect(err).to.be.null;
                        done();

                    });

            });

            it('should not allow a deleted carer to reject an invitation', function (done) {

                //Now attempt to send an invitation to this new temporary test carer
                var validPatientId = testPatient1.user_id,
                    validCarerEmail = {
                        email: tempUser.email
                    };

                api.post('/users/' + validPatientId + '/invite')
                    .send(validCarerEmail)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);
                        expect(res.text).not.to.be.null;

                        //even though errors, sends back res object with json attached to text property
                        var response = JSON.parse(res.text);

                        //error is sent back is attached to the error property
                        expect(response.message).to.equal('Invitation sent successfully.');

                        //delete the patient user who sent the invitation
                        api.delete('/users/testnewuser3/delete')
                            .end(function (err, res) {
                                expect(err).to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);
                                expect(responseObject.message).to.equal('User was successfully deleted');

                                //attempt to reject the invitation from deleted carer, should error
                                api.get('/users/invite/reject/' + validPatientId + '/testnewuser3')
                                    .end(function (err, res) {
                                        expect(err).to.be.null;
                                        expect(res.status).to.equal(404);
                                        var error = JSON.parse(res.text);
                                        expect(error.error).to.equal("Could not find carer. User may have been deleted.");

                                        done();
                                    });
                            });
                    });
            })
        });

        describe('removing a connection between a patient and a carer', function () {

            //Create new temporary carer
            //Create a new temporary carer
            var tempUser = {
                user_id: "testnewuser3.5",
                email: "testnewuser3.6@domain.com",
                nickname: "testy3.6"
            };

            //create carer
            before(function (done) {

                api.post("/users/sync")
                    .send(tempUser)
                    .end(function (err, res) {

                        expect(res).not.to.be.null;
                        expect(res.status).to.equal(201);

                        var responseObject = JSON.parse(res.text);

                        expect(responseObject.isNewUser).to.equal(true);
                        expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                        expect(responseObject.data.email).to.equal(tempUser.email);
                        expect(responseObject.data.username).to.equal(tempUser.nickname);

                        var newUserData = {
                            userType: "carer"
                        };

                        _.extend(responseObject.data, newUserData);

                        //set this user to be a carer
                        api.post('/users/' + responseObject.data.user_id + '/update')
                            .send(responseObject.data)
                            .end(function (err, res) {
                                expect(res).not.to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject.message).to.equal('User details were successfully updated.');
                                expect(responseObject.data.user_id).to.equal(tempUser.user_id);
                                expect(responseObject.data.email).to.equal(tempUser.email);
                                expect(responseObject.data.username).to.equal(tempUser.nickname);
                                expect(responseObject.data.userType).to.equal('carer');

                                done();
                            });
                    });

            });

            after(function (done) {

                //now clean up by deleting the temporary user
                api.delete('/users/' + tempUser.user_id + '/delete')
                    .end(function (err, res) {

                        expect(err).to.be.null;
                        done();

                    });

            });

            it('should allow a carer to disconnect from a patient', function (done) {


                //Now attempt to send an invitation to this new temporary test carer
                var validPatientId = testPatient2.user_id,
                    validCarerEmail = {
                        email: tempUser.email
                    };

                //invite carer
                var validPatientId = testPatient2.user_id,
                    validCarerEmail = {
                        email: tempUser.email
                    };

                api.post('/users/' + validPatientId + '/invite')
                    .send(validCarerEmail)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.status).to.equal(200);
                        expect(res.text).not.to.be.null;

                        //even though errors, sends back res object with json attached to text property
                        var responseObject = JSON.parse(res.text);

                        expect(responseObject).not.to.have.property('error');

                        //error is sent back is attached to the error property
                        expect(responseObject).to.have.property('message');
                        expect(responseObject.message).to.equal('Invitation sent successfully.');

                        console.log("Issued invitations are: " + JSON.stringify(responseObject.data[0].issuedInvitations));

                        //test to see that invitations are properly deleted once accepted
                        var invitationFromPatientExists = false;

                        _.some(responseObject.data[0].issuedInvitations, function (invitation) {
                            if (invitation.recipient.user_id == tempUser.user_id) {
                                return invitationFromPatientExists = true;
                            }
                        });

                        expect(invitationFromPatientExists).to.be.true;

                        var invitationToCarerExists = false;

                        _.some(responseObject.data[1].careConnectInvitations, function (invitation) {
                            if (invitation.sender.user_id == validPatientId) {
                                return invitationToCarerExists = true;
                            }
                        });

                        expect(invitationToCarerExists).to.be.true;

                        //Now accept this invitation
                        var acceptingCarerId = tempUser.user_id;
                        var invitingPatientId = testPatient2.user_id;

                        api.get('/users/invite/accept/' + invitingPatientId + '/' + acceptingCarerId)
                            .end(function (err, res) {
                                expect(err).to.be.null;
                                expect(res.status).to.equal(200);

                                var responseObject = JSON.parse(res.text);

                                expect(responseObject).not.to.have.property('error');
                                expect(responseObject).to.have.property('message');
                                expect(responseObject.message).to.equal('Successfully accepted invitation, connected carer to patient');
                                expect(responseObject.data[0].user_id).to.equal(invitingPatientId);

                                //test to see that invitations are properly deleted once accepted
                                var invitationFromPatientExists = false;

                                _.some(responseObject.data[0].issuedInvitations, function (invitation) {
                                    if (invitation.recipient.user_id == acceptingCarerId) {
                                        return invitationFromPatientExists = true;
                                    }
                                });

                                expect(invitationFromPatientExists).to.be.false;

                                var invitationToCarerExists = false;

                                _.some(responseObject.data[1].careConnectInvitations, function (invitation) {
                                    if (invitation.sender.user_id == acceptingCarerId) {
                                        return invitationToCarerExists = true;
                                    }
                                });

                                expect(invitationToCarerExists).to.be.false;

                                //check that this carer has now marked their profile as complete
                                expect(responseObject.data[1].profileCompleted).to.be.true;

                                //attempt to disconnect patient from carer FROM carer
                                api.get('/users/carers/disconnect/' + tempUser.user_id + '/' + testPatient2.user_id + '/')
                                    .end(function (err, res) {

                                        //check all is as expected
                                        expect(err).to.be.null;
                                        expect(res.status).to.equal(200);
                                        var responseObject = JSON.parse(res.text);

                                        expect(responseObject).not.to.have.property('error');
                                        expect(responseObject).to.have.property('message');
                                        expect(responseObject.message).to.equal('Successfully disconnected patient from carer.');
                                        expect(responseObject.data[0].user_id).to.equal(invitingPatientId);

                                        //test that carer no longer exists on patient
                                        var carerExistsOnPatient = false;

                                        _.some(responseObject.data[0].connectedCarers, function (connectedCarer) {
                                            if (connectedCarer.user_id == tempUser.user_id) {
                                                return carerExistsOnPatient = true;
                                            }
                                        });

                                        expect(carerExistsOnPatient).to.be.false;

                                        //test that patiend no longer exists on carer
                                        var patientExistsOnCarer = false;

                                        if (responseObject.data[1].connectedPatient) {
                                            if (responseObject.data[1].connectedPatient.user_id == testPatient2.user_id) {
                                                return patientExistsOnCarer = true;
                                            }
                                        }

                                        expect(patientExistsOnCarer).to.be.false;

                                        //end the test
                                        done();
                                    });
                            });
                    });
            });
        });
    });
});