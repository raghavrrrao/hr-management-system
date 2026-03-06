const fs = require('fs');
const path = require('path');
const User = require('../models/User');

// Set office location — writes to .env file
const setOfficeLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });

        const envPath = path.resolve(__dirname, '../.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        envContent = envContent
            .replace(/OFFICE_LAT=.*/,  `OFFICE_LAT=${lat}`)
            .replace(/OFFICE_LNG=.*/,  `OFFICE_LNG=${lng}`);

        fs.writeFileSync(envPath, envContent);

        // Update in-memory process.env too
        process.env.OFFICE_LAT = String(lat);
        process.env.OFFICE_LNG = String(lng);

        res.json({ message: 'Office location updated ✅', lat, lng });
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