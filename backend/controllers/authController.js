const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// LOGIN (unchanged, but added mustChangePassword flag in response)
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        // Check if account is active
        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Account is inactive. Contact admin.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            token: generateToken(user),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CHANGE PASSWORD (for mustChangePassword flow)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // If mustChangePassword is true, we don't require current password verification
        if (user.mustChangePassword) {
            // Just set the new password
            const hashed = await bcrypt.hash(newPassword, 10);
            user.password = hashed;
            user.mustChangePassword = false;
            await user.save();
            return res.json({ message: 'Password changed successfully' });
        } else {
            // Normal password change – verify current password
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
            const hashed = await bcrypt.hash(newPassword, 10);
            user.password = hashed;
            await user.save();
            return res.json({ message: 'Password changed successfully' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { login, changePassword, getMe };