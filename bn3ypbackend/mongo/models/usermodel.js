var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    user_id: {type: String, required: true},
    username: {type: String, required: true, index: true}, //nickname
    email: {type: String, required: true},
    firstName: String, //todo: remove
    lastName: String, //todo: remove
    name: String,
    showTutorials: {type: Boolean, default: true},
    profileCompleted: {type: Boolean, default: false},
    pic: {type: String, default: 'none'}, //string url to a user picture from Auth0
    issuedInvitations: [
        {
            recipient: {
                user_id: String,
                name: String,
                pic: String,
                email: String,
                dOB: String
            },
            status: {type: String, default: "pending", required: true},
            invitationIssued: {type: Date, default: new Date(), required: true}
        }],
    careConnectInvitations: [
        {
            sender: {
                user_id: String,
                name: String,
                pic: String,
                email: String,
                dOB: String
            },
            status: {type: String, default: "pending", required: true},
            invitationIssued: {type: Date, default: new Date(), required: true}
        }],
    homeAddress: {
        houseNameNo: String,
        firstLineAddress: String,
        secondLineAddress: String,
        city: String,
        county: String,
        postCode: String,
        country: String,
        homeLat: Number,
        homeLong: Number
    },
    maritalStatus: String,
    dateOfBirth: Date,
    children: [
        {
            name: String,
            relation: String,
            dateOfBirth: Date,
            picture: String
        }
    ],
    spouse: String,
    userType: String, //denotes if user is a patient or a carer
    connectedCarers: [
        {
            user_id: String,
            carer_name: String,
            carer_pic: String,
            carer_dob: Date,
            carer_location: {
                name: String,
                lat: Number,
                long: Number,
                accuracy: Number
            }
        }
    ],
    connectedPatient: {
        user_id: String,
        patient_name: String,
        patient_pic: String,
        patient_location: {
            name: String,
            lat: Number,
            long: Number,
            accuracy: Number
        }
    },
    status: {type: String, default: 'OK'},
    userDeviceTokens: [{type: String}],
    location: {
        name: String,
        lat: Number,
        long: Number,
        accuracy: Number
    },
    patientGeofences:[ //list of geofences created on patient's by carers
        {
            latitude: Number,
            longitude: Number,
            identifier: String,
            radius: Number,
            notifyOnEntry: Boolean,
            notifyOnExit: Boolean,
            notifyOnDwell: Boolean,
            loiteringDelay: Number
        }
    ],
    notifications: [{
        timestamp: Date,
        message: String,
        read: { type: Boolean, default: false}
    }]
});

var User = mongoose.model('User', userSchema);
