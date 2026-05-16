const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    employeeId: { type: String, unique: true, sparse: true }, // optional for existing, required for new
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    
    // New enterprise fields
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    mustChangePassword: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);