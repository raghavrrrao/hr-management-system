const User = require('../models/User');
const { emitToUser } = require('../socket/socketManager');
const bcrypt = require('bcryptjs');

// Helper: auto-generate employee ID
const generateEmployeeId = async () => {
    const lastEmployee = await User.findOne({ role: 'employee' })
        .sort({ employeeId: -1 })
        .lean();
    if (!lastEmployee || !lastEmployee.employeeId) {
        return 'EMP1001';
    }
    const match = lastEmployee.employeeId.match(/^EMP(\d+)$/);
    if (!match) return 'EMP1001';
    const nextNumber = parseInt(match[1], 10) + 1;
    return `EMP${nextNumber.toString().padStart(4, '0')}`;
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
        emitToUser(req, user._id.toString(), 'role:updated', { newRole: user.role, name: user.name });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createEmployee = async (req, res) => {
    try {
        const { name, email, department, designation, joiningDate, role = 'employee' } = req.body;

        // Check if email already exists
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already registered' });

        // Generate unique employee ID
        const employeeId = await generateEmployeeId();

        // Generate temporary password
        const tempPassword = 'Temp@1234'; // secure default
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newEmployee = await User.create({
            employeeId,
            name,
            email,
            password: hashedPassword,
            department: department || '',
            designation: designation || '',
            joiningDate: joiningDate || new Date(),
            role,
            status: 'active',
            mustChangePassword: true,
        });

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
            tempPassword,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllEmployees = async (req, res) => {
    try {
        const employees = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { promoteEmployee, createEmployee, getAllEmployees };