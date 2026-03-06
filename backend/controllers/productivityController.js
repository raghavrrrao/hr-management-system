const Attendance = require('../models/Attendance');
const Task = require('../models/Task');

// Get productivity score for an employee
const getProductivityScore = async (req, res) => {
    try {
        const employeeId = req.params.employeeId;

        // Get all attendance records for employee
        const attendanceRecords = await Attendance.find({ employee: employeeId });

        // Calculate total working hours
        const totalWorkingHours = attendanceRecords.reduce((acc, record) => {
            return acc + (record.workingHours || 0);
        }, 0);

        // Get completed tasks count
        const completedTasks = await Task.countDocuments({
            employee: employeeId,
            completed: true
        });

        // Calculate productivity score
        const productivityScore = totalWorkingHours > 0
            ? (completedTasks / totalWorkingHours).toFixed(2)
            : 0;

        res.json({
            employeeId,
            totalWorkingHours: totalWorkingHours.toFixed(2),
            completedTasks,
            productivityScore: parseFloat(productivityScore)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get productivity score filtered by week or month
const getFilteredProductivity = async (req, res) => {
    try {
        const employeeId = req.params.employeeId;
        const { filter } = req.query; // 'weekly' or 'monthly'

        const now = new Date();
        let startDate;

        if (filter === 'weekly') {
            startDate = new Date(now.setDate(now.getDate() - 7));
        } else if (filter === 'monthly') {
            startDate = new Date(now.setMonth(now.getMonth() - 1));
        } else {
            startDate = new Date(0); // all time
        }

        const startDateStr = startDate.toISOString().split('T')[0];

        // Get filtered attendance
        const attendanceRecords = await Attendance.find({
            employee: employeeId,
            date: { $gte: startDateStr }
        });

        const totalWorkingHours = attendanceRecords.reduce((acc, record) => {
            return acc + (record.workingHours || 0);
        }, 0);

        // Get filtered tasks
        const completedTasks = await Task.countDocuments({
            employee: employeeId,
            completed: true,
            date: { $gte: startDateStr }
        });

        const productivityScore = totalWorkingHours > 0
            ? (completedTasks / totalWorkingHours).toFixed(2)
            : 0;

        res.json({
            employeeId,
            filter: filter || 'all-time',
            totalWorkingHours: totalWorkingHours.toFixed(2),
            completedTasks,
            productivityScore: parseFloat(productivityScore)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getProductivityScore, getFilteredProductivity };