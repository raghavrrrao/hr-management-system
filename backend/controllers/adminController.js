const User = require('../models/User');
const Settings = require('../models/Settings');
const { emitToUser } = require('../socket/socketManager');

const setOfficeLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) return res.status(400).json({ message: 'Latitude and longitude required' });

        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({ officeLat: lat, officeLng: lng });
        } else {
            settings.officeLat = lat;
            settings.officeLng = lng;
            await settings.save();
        }

        res.json({ message: 'Office location updated', lat, lng });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const promoteEmployee = async (req, res) => {
    try {
        const { role } = req.body;
        if (!['admin', 'employee'].includes(role)) {
            return res.status(400).json({ message: 'Role must be admin or employee' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found' });

        // ── Tell the affected user their role changed so their UI updates ─────
        // The frontend will update localStorage and redirect them appropriately
        emitToUser(req, user._id.toString(), 'role:updated', {
            newRole: user.role,
            name: user.name,
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { setOfficeLocation, promoteEmployee };