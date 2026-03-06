const User = require('../models/User');

const getAllEmployees = async (req, res) => {
    try {
        const employees = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteEmployee = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateEmployee = async (req, res) => {
    try {
        const employee = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        res.json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAllEmployees, deleteEmployee, updateEmployee };