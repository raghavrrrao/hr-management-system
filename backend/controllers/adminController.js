const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Settings = require("../models/Settings");
// Set office location — writes to .env file
const setOfficeLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;

        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create({ officeLat: lat, officeLng: lng });
        } else {
            settings.officeLat = lat;
            settings.officeLng = lng;
            await settings.save();
        }

        res.json({ message: "Office location updated", lat, lng });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Promote or demote employee
const promoteEmployee = async (req, res) => {
    try {
        const { role } = req.body; // 'admin' or 'employee'
        if (!['admin', 'employee'].includes(role)) {
            return res.status(400).json({ message: 'Role must be admin or employee' });
        }
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { setOfficeLocation, promoteEmployee };