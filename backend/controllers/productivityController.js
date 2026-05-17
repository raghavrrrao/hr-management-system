const Attendance = require('../models/Attendance');
const Task = require('../models/Task');

const getExpectedProgress = (task, currentDate) => {
    const start = new Date(task.startDate);
    const due = new Date(task.dueDate);
    if (currentDate <= start) return 0;
    if (currentDate >= due) return 100;
    const totalDuration = due - start;
    const elapsed = currentDate - start;
    return (elapsed / totalDuration) * 100;
};

const getProductivityScore = async (req, res) => {
    try {
        const employeeId = req.params.employeeId;
        const attendanceRecords = await Attendance.find({ employee: employeeId });
        const totalWorkingHours = attendanceRecords.reduce((acc, r) => acc + (r.workingHours || 0), 0);
        const tasks = await Task.find({ assignedTo: employeeId });
        let totalExpected = 0, totalActual = 0, totalWeight = 0, overdue = 0;
        const now = new Date();
        for (const task of tasks) {
            const expected = getExpectedProgress(task, now);
            totalExpected += expected * (task.workloadWeight || 1);
            totalActual += task.progress * (task.workloadWeight || 1);
            totalWeight += task.workloadWeight || 1;
            if (task.dueDate < now && task.progress < 100 && task.status !== 'completed') overdue++;
        }
        const efficiency = totalExpected > 0 ? totalActual / totalExpected : 1;
        let score = efficiency * 100;
        score = Math.max(0, score - (overdue * 5));
        score = Math.min(100, score);
        res.json({
            employeeId,
            totalWorkingHours: totalWorkingHours.toFixed(2),
            completedTasks: tasks.filter(t => t.progress === 100).length,
            productivityScore: parseFloat(score.toFixed(2)),
            overdueTasks: overdue,
            efficiency: parseFloat(efficiency.toFixed(2))
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