const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    workingHours: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);