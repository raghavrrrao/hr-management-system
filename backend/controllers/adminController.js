const User = require('../models/User');
const { emitToUser } = require('../socket/socketManager');
const bcrypt = require('bcryptjs');

// Promote/demote employee (existing)
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

        emitToUser(req, user._id.toString(), 'role:updated', {
            newRole: user.role,
            name: user.name,
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CREATE EMPLOYEE (new enterprise feature)
const createEmployee = async (req, res) => {
    try {
        const { employeeId, name, email, department, designation, joiningDate, role = 'employee' } = req.body;

        // Check if email already exists
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already registered' });

        // Check if employeeId already exists (if provided)
        if (employeeId) {
            const existingId = await User.findOne({ employeeId });
            if (existingId) return res.status(400).json({ message: 'Employee ID already exists' });
        }

        // Generate random temporary password (8 characters alphanumeric)
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newEmployee = await User.create({
            employeeId: employeeId || `EMP${Date.now()}`,
            name,
            email,
            password: hashedPassword,
            department,
            designation,
            joiningDate: joiningDate || new Date(),
            role,
            status: 'active',
            mustChangePassword: true,
        });

        // Return the temporary password (only once, admin should share it securely)
        res.status(201).json({
            message: 'Employee created successfully',
            employee: {
                _id: newEmployee._id,
                employeeId: newEmployee.employeeId,
                name: newEmployee.name,
                email: newEmployee.email,
                department: newEmployee.department,
                designation: newEmployee.designation,
                role: newEmployee.role,
            },
            tempPassword, // Admin will see this once
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all employees (including new fields)
const getAllEmployees = async (req, res) => {
    try {
        const employees = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { promoteEmployee, createEmployee, getAllEmployees };