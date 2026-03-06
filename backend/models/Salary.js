const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true },
    basicSalary: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    status: { type: String, enum: ['paid', 'pending'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Salary', salarySchema);