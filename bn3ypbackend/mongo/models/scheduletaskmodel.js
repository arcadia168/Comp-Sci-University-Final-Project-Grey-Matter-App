var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var scheduleTaskSchema = new Schema({
    name: {type: String, required: true},
    details: {type: String, default: 'Any extra details that might be useful'},
    time: {type: Date, default: Date.now, required: true},
    user_id: {type: String, required: true},
    completedToday: {type: Boolean, default: false, required: true}
});

var ScheduleTask = mongoose.model('ScheduleTask', scheduleTaskSchema);