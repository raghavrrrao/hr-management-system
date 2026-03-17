const BurnoutScore = require("../models/BurnoutScore");
const Attendance = require("../models/Attendance");
const Task = require("../models/Task");
const Leave = require("../models/Leave");
const User = require("../models/User");

const getWeekBounds = (offsetWeeks = 0) => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() - offsetWeeks * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
};

const toDateStr = (d) => d.toISOString().split("T")[0];

const getRiskLevel = (score) => {
    if (score >= 61) return "High";
    if (score >= 31) return "Moderate";
    return "Low";
};

const buildSuggestions = (signals) => {
    const tips = [];
    if (signals.avgDailyHours > 9)
        tips.push("Average daily working hours exceed 9hrs — consider enforcing log-off policies.");
    if (signals.consecutiveLongDays >= 3)
        tips.push(`Employee has worked long hours for ${signals.consecutiveLongDays} consecutive days — suggest a lighter day.`);
    if (signals.hoursIncreasing)
        tips.push("Working hours are trending up week-over-week — review workload distribution.");
    if (signals.lowCompletionHighHours)
        tips.push("High hours but low task completion — may indicate cognitive fatigue or unclear priorities.");
    if (signals.recentSickLeaves >= 2)
        tips.push(`${signals.recentSickLeaves} sick leaves in the last 30 days — monitor for stress-related absenteeism.`);
    if (signals.lateCheckouts >= 3)
        tips.push(`Checked out after 8 PM on ${signals.lateCheckouts} occasions this week — encourage healthy boundaries.`);
    if (tips.length === 0)
        tips.push("No significant burnout indicators detected. Keep maintaining a healthy work-life balance.");
    return tips;
};

const calculateBurnoutForEmployee = async (employeeId) => {
    const { weekStart, weekEnd } = getWeekBounds(0);
    const prevWeek = getWeekBounds(1);

    const weekStartStr = toDateStr(weekStart);
    const weekEndStr = toDateStr(weekEnd);
    const prevStartStr = toDateStr(prevWeek.weekStart);
    const prevEndStr = toDateStr(prevWeek.weekEnd);

    // Attendance — date is a String in your model
    const thisWeekAttendance = await Attendance.find({
        employee: employeeId,
        date: { $gte: weekStartStr, $lte: weekEndStr },
        checkOut: { $exists: true, $ne: null },
    }).sort({ date: 1 });

    const prevWeekAttendance = await Attendance.find({
        employee: employeeId,
        date: { $gte: prevStartStr, $lte: prevEndStr },
        checkOut: { $exists: true, $ne: null },
    });

    const dailyHours = thisWeekAttendance.map((a) => a.workingHours || 0);
    const avgDailyHours = dailyHours.length > 0
        ? dailyHours.reduce((s, h) => s + h, 0) / dailyHours.length : 0;

    let consecutiveLongDays = 0, maxConsecutive = 0;
    for (const h of dailyHours) {
        if (h > 9) { consecutiveLongDays++; maxConsecutive = Math.max(maxConsecutive, consecutiveLongDays); }
        else { consecutiveLongDays = 0; }
    }
    consecutiveLongDays = maxConsecutive;

    const prevAvg = prevWeekAttendance.length > 0
        ? prevWeekAttendance.reduce((s, a) => s + (a.workingHours || 0), 0) / prevWeekAttendance.length : 0;
    const hoursIncreasing = avgDailyHours > prevAvg + 0.5;

    const lateCheckouts = thisWeekAttendance.filter(
        (a) => a.checkOut && new Date(a.checkOut).getHours() >= 20
    ).length;

    // Tasks — field is "employee" (not assignedTo), "completed" boolean, "date" String
    const allTasksThisWeek = await Task.find({
        employee: employeeId,
        date: { $gte: weekStartStr, $lte: weekEndStr },
    });

    const completedTasks = allTasksThisWeek.filter((t) => t.completed === true).length;
    const taskCompletionRate = allTasksThisWeek.length > 0
        ? (completedTasks / allTasksThisWeek.length) * 100 : 100;
    const lowCompletionHighHours = taskCompletionRate < 50 && avgDailyHours > 8;

    // Leaves — startDate is a String in your model
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = toDateStr(thirtyDaysAgo);

    const recentSickLeaves = await Leave.countDocuments({
        employee: employeeId,
        type: "sick",
        status: "approved",
        startDate: { $gte: thirtyDaysAgoStr },
    });

    // Score
    let score = 0;
    if (avgDailyHours > 9) score += 20;
    else if (avgDailyHours > 8) score += 10;
    if (consecutiveLongDays >= 5) score += 20;
    else if (consecutiveLongDays >= 3) score += 15;
    else if (consecutiveLongDays >= 2) score += 8;
    if (hoursIncreasing) score += 15;
    if (lowCompletionHighHours) score += 20;
    else if (taskCompletionRate < 50) score += 10;
    if (recentSickLeaves >= 3) score += 15;
    else if (recentSickLeaves >= 2) score += 10;
    else if (recentSickLeaves === 1) score += 5;
    if (lateCheckouts >= 4) score += 10;
    else if (lateCheckouts >= 3) score += 8;
    else if (lateCheckouts >= 2) score += 5;
    score = Math.min(score, 100);

    const signals = {
        avgDailyHours: parseFloat(avgDailyHours.toFixed(2)),
        consecutiveLongDays,
        hoursIncreasing,
        taskCompletionRate: parseFloat(taskCompletionRate.toFixed(2)),
        lowCompletionHighHours,
        recentSickLeaves,
        lateCheckouts,
    };

    const suggestions = buildSuggestions(signals);
    const riskLevel = getRiskLevel(score);

    const burnoutRecord = await BurnoutScore.findOneAndUpdate(
        { employee: employeeId, weekStart },
        { employee: employeeId, score, riskLevel, signals, suggestions, weekStart, weekEnd, calculatedAt: new Date() },
        { upsert: true, new: true }
    );

    return burnoutRecord;
};

exports.getMyBurnoutScore = async (req, res) => {
    try {
        const score = await calculateBurnoutForEmployee(req.user.id);
        const history = await BurnoutScore.find({ employee: req.user.id })
            .sort({ weekStart: -1 }).limit(4).lean();
        res.json({ success: true, current: score, history: history.reverse() });
    } catch (err) {
        console.error("getMyBurnoutScore:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllBurnoutScores = async (req, res) => {
    try {
        const employees = await User.find({ role: "employee" }).select("_id name email department");
        const results = await Promise.allSettled(
            employees.map((emp) => calculateBurnoutForEmployee(emp._id))
        );
        const scores = results
            .filter((r) => r.status === "fulfilled")
            .map((r) => r.value)
            .sort((a, b) => b.score - a.score);

        await BurnoutScore.populate(scores, { path: "employee", select: "name email department" });

        const summary = {
            total: scores.length,
            high: scores.filter((s) => s.riskLevel === "High").length,
            moderate: scores.filter((s) => s.riskLevel === "Moderate").length,
            low: scores.filter((s) => s.riskLevel === "Low").length,
            avgScore: scores.length > 0
                ? parseFloat((scores.reduce((s, r) => s + r.score, 0) / scores.length).toFixed(1)) : 0,
        };

        res.json({ success: true, summary, scores });
    } catch (err) {
        console.error("getAllBurnoutScores:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getEmployeeBurnoutScore = async (req, res) => {
    try {
        const current = await calculateBurnoutForEmployee(req.params.id);
        const history = await BurnoutScore.find({ employee: req.params.id })
            .sort({ weekStart: -1 }).limit(6).lean();
        const employee = await User.findById(req.params.id).select("name email department");
        res.json({ success: true, employee, current, history: history.reverse() });
    } catch (err) {
        console.error("getEmployeeBurnoutScore:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};