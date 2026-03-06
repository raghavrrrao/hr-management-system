const Attendance = require('../models/Attendance');

const checkIn = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const existing = await Attendance.findOne({ employee: req.user.id, date: today });
        if (existing) return res.status(400).json({ message: 'Already checked in today' });

        const attendance = await Attendance.create({
            employee: req.user.id,
            date: today,
            checkIn: new Date(),
        });

        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const checkOut = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const attendance = await Attendance.findOne({ employee: req.user.id, date: today });
        if (!attendance) return res.status(404).json({ message: 'No check-in found for today' });
        if (attendance.checkOut) return res.status(400).json({ message: 'Already checked out today' });

        attendance.checkOut = new Date();
        attendance.workingHours = ((attendance.checkOut - attendance.checkIn) / 3600000).toFixed(2);
        await attendance.save();

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyAttendance = async (req, res) => {
    try {
        const records = await Attendance.find({ employee: req.user.id }).sort({ date: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllAttendance = async (req, res) => {
    try {
        const records = await Attendance.find()
            .populate('employee', 'name email')
            .sort({ date: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { checkIn, checkOut, getMyAttendance, getAllAttendance };