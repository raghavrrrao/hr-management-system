const mongoose = require('mongoose');
const BurnoutScore = require('../models/BurnoutScore');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Leave = require('../models/Leave');
const User = require('../models/User');

// Helper: get week bounds (Sunday to Saturday)
const getWeekBounds = (date = new Date()) => {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
};

const toDateStr = (d) => d.toISOString().split('T')[0];

// Helper: safe attendance fetch (handles ObjectId or string)
const fetchAttendance = async (employeeId, dateFilter, extraFilter = {}) => {
    const baseFilter = { date: dateFilter, ...extraFilter };
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
        const records = await Attendance.find({ employee: new mongoose.Types.ObjectId(employeeId), ...baseFilter }).sort({ date: 1 });
        if (records.length) return records;
    }
    return Attendance.find({ employee: employeeId.toString(), ...baseFilter }).sort({ date: 1 });
};

// Helper: expected progress for a task
const getExpectedProgress = (task, currentDate) => {
    const start = new Date(task.startDate);
    const due = new Date(task.dueDate);
    if (currentDate <= start) return 0;
    if (currentDate >= due) return 100;
    const totalDuration = due - start;
    const elapsed = currentDate - start;
    return (elapsed / totalDuration) * 100;
};

// Main calculation function
const calculateBurnoutForEmployee = async (employeeId) => {
    const { weekStart, weekEnd } = getWeekBounds();
    const prevWeek = getWeekBounds(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    const weekStartStr = toDateStr(weekStart);
    const weekEndStr = toDateStr(weekEnd);
    const prevStartStr = toDateStr(prevWeek.weekStart);
    const prevEndStr = toDateStr(prevWeek.weekEnd);

    // --- Attendance this week ---
    const thisWeekAttendance = await fetchAttendance(employeeId, { $gte: weekStartStr, $lte: weekEndStr }, { checkOut: { $ne: null } });
    const prevWeekAttendance = await fetchAttendance(employeeId, { $gte: prevStartStr, $lte: prevEndStr }, { checkOut: { $ne: null } });

    const dailyHours = thisWeekAttendance.map(a => parseFloat(a.workingHours) || 0);
    const avgDailyHours = dailyHours.length ? dailyHours.reduce((a, b) => a + b, 0) / dailyHours.length : 0;

    let consecutiveLongDays = 0, maxConsecutive = 0;
    for (const h of dailyHours) {
        if (h > 9) { consecutiveLongDays++; maxConsecutive = Math.max(maxConsecutive, consecutiveLongDays); }
        else { consecutiveLongDays = 0; }
    }

    const prevAvg = prevWeekAttendance.length ? prevWeekAttendance.reduce((s, a) => s + (parseFloat(a.workingHours) || 0), 0) / prevWeekAttendance.length : 0;
    const hoursIncreasing = avgDailyHours > prevAvg + 0.5;

    const lateCheckouts = thisWeekAttendance.filter(a => a.checkOut && new Date(a.checkOut).getHours() >= 20).length;

    // --- Active tasks ---
    const employeeObjectId = mongoose.Types.ObjectId.isValid(employeeId) ? new mongoose.Types.ObjectId(employeeId) : employeeId;
    const activeTasks = await Task.find({
        assignedTo: employeeObjectId,
        status: { $in: ['pending', 'in-progress', 'review'] }
    });

    let totalWorkloadWeight = 0;
    let overdueTasksCount = 0;
    let criticalTasksCount = 0;
    let totalExpectedProgress = 0;
    let totalActualProgress = 0;
    const now = new Date();

    for (const task of activeTasks) {
        totalWorkloadWeight += task.workloadWeight || 1;
        if (task.priority === 'critical') criticalTasksCount++;

        const expected = getExpectedProgress(task, now);
        totalExpectedProgress += expected * (task.workloadWeight || 1);
        totalActualProgress += task.progress * (task.workloadWeight || 1);

        if (task.dueDate < now && task.progress < 100) {
            overdueTasksCount++;
        }
    }

    const progressEfficiency = totalExpectedProgress > 0 ? totalActualProgress / totalExpectedProgress : 1;

    // --- Sick leaves last 30 days ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = toDateStr(thirtyDaysAgo);
    let recentSickLeaves = 0;
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
        recentSickLeaves = await Leave.countDocuments({
            employee: employeeObjectId,
            type: 'sick',
            status: 'approved',
            startDate: { $gte: thirtyDaysAgoStr }
        });
    } else {
        recentSickLeaves = await Leave.countDocuments({
            employee: employeeId.toString(),
            type: 'sick',
            status: 'approved',
            startDate: { $gte: thirtyDaysAgoStr }
        });
    }

    // --- Score calculation (0-100) ---
    let score = 0;
    if (avgDailyHours > 9) score += 20;
    else if (avgDailyHours > 8.5) score += 10;

    if (maxConsecutive >= 5) score += 20;
    else if (maxConsecutive >= 3) score += 15;
    else if (maxConsecutive >= 2) score += 8;

    if (totalWorkloadWeight > 20) score += 15;
    else if (totalWorkloadWeight > 15) score += 10;
    else if (totalWorkloadWeight > 10) score += 5;

    if (overdueTasksCount >= 3) score += 20;
    else if (overdueTasksCount === 2) score += 12;
    else if (overdueTasksCount === 1) score += 6;

    if (criticalTasksCount >= 2) score += 15;
    else if (criticalTasksCount === 1) score += 8;

    if (progressEfficiency < 0.5) score += 25;
    else if (progressEfficiency < 0.7) score += 18;
    else if (progressEfficiency < 0.85) score += 10;

    if (recentSickLeaves >= 3) score += 15;
    else if (recentSickLeaves === 2) score += 10;
    else if (recentSickLeaves === 1) score += 5;

    if (lateCheckouts >= 4) score += 10;
    else if (lateCheckouts === 3) score += 7;
    else if (lateCheckouts === 2) score += 4;

    score = Math.min(100, Math.max(0, score));

    const riskLevel = score >= 61 ? 'High' : (score >= 31 ? 'Moderate' : 'Low');

    const signals = {
        avgDailyHours: parseFloat(avgDailyHours.toFixed(1)),
        consecutiveLongDays: maxConsecutive,
        hoursIncreasing,
        taskCompletionRate: parseFloat((totalActualProgress / (totalExpectedProgress || 1) * 100).toFixed(1)),
        lowCompletionHighHours: (progressEfficiency < 0.7 && avgDailyHours > 8),
        recentSickLeaves,
        lateCheckouts,
        overdueTasksCount,
        workloadWeight: totalWorkloadWeight,
        progressEfficiency: parseFloat(progressEfficiency.toFixed(2))
    };

    const suggestions = [];
    if (avgDailyHours > 9) suggestions.push('Average daily working hours exceed 9hrs — consider workload balance.');
    if (maxConsecutive >= 3) suggestions.push(`Worked long hours for ${maxConsecutive} consecutive days — take a break.`);
    if (overdueTasksCount > 0) suggestions.push(`Has ${overdueTasksCount} overdue task(s) — reprioritise.`);
    if (progressEfficiency < 0.7) suggestions.push(`Task progress efficiency is low (${Math.round(progressEfficiency * 100)}%) — may need clearer milestones.`);
    if (totalWorkloadWeight > 15) suggestions.push('Total workload weight is high — consider redistributing tasks.');
    if (recentSickLeaves > 1) suggestions.push(`${recentSickLeaves} sick leaves recently — monitor wellness.`);
    if (lateCheckouts > 2) suggestions.push(`Late checkouts (after 8 PM) on ${lateCheckouts} days — encourage boundaries.`);
    if (suggestions.length === 0) suggestions.push('Workload seems balanced. Keep it up.');

    // ✅ Fix: use a single variable (const) for the upsert operation, not a duplicate declaration
    const burnoutRecord = await BurnoutScore.findOneAndUpdate(
        { employee: employeeObjectId, weekStart },
        {
            employee: employeeObjectId,
            score,
            riskLevel,
            signals,
            suggestions,
            weekStart,
            weekEnd,
            calculatedAt: new Date()
        },
        { upsert: true, returnDocument: 'after' }
    );

    return burnoutRecord;
};

exports.getMyBurnoutScore = async (req, res) => {
    try {
        const current = await calculateBurnoutForEmployee(req.user.id);
        const history = await BurnoutScore.find({ employee: req.user.id })
            .sort({ weekStart: -1 }).limit(4).lean();
        res.json({ success: true, current, history: history.reverse() });
    } catch (err) {
        console.error('getMyBurnoutScore:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllBurnoutScores = async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' }).select('_id name email department');
        const results = await Promise.allSettled(
            employees.map((emp) => calculateBurnoutForEmployee(emp._id))
        );
        const scores = results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value)
            .sort((a, b) => b.score - a.score);

        await BurnoutScore.populate(scores, { path: 'employee', select: 'name email department' });

        const summary = {
            total: scores.length,
            high: scores.filter((s) => s.riskLevel === 'High').length,
            moderate: scores.filter((s) => s.riskLevel === 'Moderate').length,
            low: scores.filter((s) => s.riskLevel === 'Low').length,
            avgScore: scores.length > 0
                ? parseFloat((scores.reduce((s, r) => s + r.score, 0) / scores.length).toFixed(1))
                : 0,
        };

        res.json({ success: true, summary, scores });
    } catch (err) {
        console.error('getAllBurnoutScores:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getEmployeeBurnoutScore = async (req, res) => {
    try {
        const current = await calculateBurnoutForEmployee(req.params.id);
        const history = await BurnoutScore.find({ employee: req.params.id })
            .sort({ weekStart: -1 }).limit(6).lean();
        const employee = await User.findById(req.params.id).select('name email department');
        res.json({ success: true, employee, current, history: history.reverse() });
    } catch (err) {
        console.error('getEmployeeBurnoutScore:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};