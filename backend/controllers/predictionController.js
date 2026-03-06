const Attendance = require("../models/Attendance");
const Task = require("../models/Task");

const predictProductivityRisk = async (req, res) => {
    try {
        const employeeId = req.params.employeeId;

        // last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const startDate = weekAgo.toISOString().split("T")[0];

        // attendance
        const attendance = await Attendance.find({
            employee: employeeId,
            date: { $gte: startDate }
        });

        const totalHours = attendance.reduce(
            (sum, a) => sum + (parseFloat(a.workingHours) || 0),
            0
        );

        // tasks
        const totalTasks = await Task.countDocuments({
            employee: employeeId,
            date: { $gte: startDate }
        });

        const completedTasks = await Task.countDocuments({
            employee: employeeId,
            completed: true,
            date: { $gte: startDate }
        });

        const completionRate =
            totalTasks === 0 ? 1 : completedTasks / totalTasks;

        // simple prediction score
        let riskScore = 0;

        if (totalHours < 30) riskScore += 40;
        if (completionRate < 0.6) riskScore += 40;
        if (totalTasks > 5 && completedTasks < totalTasks / 2) riskScore += 20;

        let prediction;

        if (riskScore >= 60) {
            prediction = "High risk of missing deadlines";
        } else if (riskScore >= 30) {
            prediction = "Moderate risk";
        } else {
            prediction = "Low risk";
        }

        res.json({
            employeeId,
            totalHours,
            totalTasks,
            completedTasks,
            completionRate,
            riskScore,
            prediction
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { predictProductivityRisk };