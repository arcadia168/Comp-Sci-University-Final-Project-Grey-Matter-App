var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var thingSchema = new Schema({
    name: {type: String, required: true},
    location: { type: String, required: true},
    note: {type: String},
    userId: {type: String, required: true},
    pic: {originalFileName: String, uploadedFileName: String, location: String}
});

var Thing = mongoose.model('Thing', thingSchema);