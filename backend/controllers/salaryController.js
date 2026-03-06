const Salary = require('../models/Salary');

const createSalary = async (req, res) => {
    try {
        const { employee, month, basicSalary, bonus, deductions } = req.body;
        const netSalary = basicSalary + (bonus || 0) - (deductions || 0);
        const salary = await Salary.create({ employee, month, basicSalary, bonus, deductions, netSalary });
        res.status(201).json(salary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllSalaries = async (req, res) => {
    try {
        const salaries = await Salary.find()
            .populate('employee', 'name email')
            .sort({ createdAt: -1 });
        res.json(salaries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMySalaries = async (req, res) => {
    try {
        const salaries = await Salary.find({ employee: req.user.id }).sort({ createdAt: -1 });
        res.json(salaries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSalaryStatus = async (req, res) => {
    try {
        const salary = await Salary.findById(req.params.id);
        if (!salary) return res.status(404).json({ message: 'Salary record not found' });
        salary.status = req.body.status;
        await salary.save();
        res.json(salary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteSalary = async (req, res) => {
    try {
        await Salary.findByIdAndDelete(req.params.id);
        res.json({ message: 'Salary record deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createSalary, getAllSalaries, getMySalaries, updateSalaryStatus, deleteSalary };