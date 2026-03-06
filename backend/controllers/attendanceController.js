const Attendance = require('../models/Attendance');

const checkIn = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const existing = await Attendance.findOne({ employee: req.user.id, date: today });
        if (existing) return res.status(400).json({ message: 'Already checked in today' });

        const { lat, lng } = req.body;
        if (!lat || !lng) return res.status(400).json({ message: 'Location is required to check in' });

        const officeLat = parseFloat(process.env.OFFICE_LAT);
        const officeLng = parseFloat(process.env.OFFICE_LNG);

        if (officeLat === 0 && officeLng === 0) {
            return res.status(400).json({ message: 'Office location has not been set by admin yet' });
        }

        const distance = getDistanceMeters(lat, lng, officeLat, officeLng);
        const radius = parseFloat(process.env.CHECKIN_RADIUS_METERS) || 50;

        if (distance > radius) {
            return res.status(403).json({
                message: `You are ${Math.round(distance)}m away from the office. Must be within ${radius}m to check in.`
            });
        }

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

// Haversine formula — distance between two lat/lng points in meters
const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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