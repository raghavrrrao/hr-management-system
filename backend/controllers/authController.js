const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role, name: user.name, employeeId: user.employeeId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ message: 'Employee ID/Email and password required' });
        }

        const user = await User.findOne({
            $or: [{ email: identifier }, { employeeId: identifier }]
        });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Account inactive. Contact admin.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        res.json({
            success: true,
            _id: user._id,
            name: user.name,
            email: user.email,
            employeeId: user.employeeId,
            role: user.role,
            department: user.department,
            designation: user.designation,
            mustChangePassword: user.mustChangePassword,
            token: generateToken(user),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.mustChangePassword) {
            const hashed = await bcrypt.hash(newPassword, 10);
            user.password = hashed;
            user.mustChangePassword = false;
            await user.save();
            return res.json({ message: 'Password changed successfully' });
        } else {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
            const hashed = await bcrypt.hash(newPassword, 10);
            user.password = hashed;
            await user.save();
            return res.json({ message: 'Password changed successfully' });
        }
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { login, changePassword, getMe };