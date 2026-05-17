const BurnoutScore = require('../models/BurnoutScore');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Leave = require('../models/Leave');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper: get week start (Sunday) and end (Saturday) for a given date
const getWeekBounds = (date = new Date()) => {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
};

// Helper: format date as YYYY-MM-DD (for attendance query)
const toDateStr = (d) => d.toISOString().split('T')[0];

// Helper: get expected progress for a task based on current date
const getExpectedProgress = (task, currentDate) => {
    const start = new Date(task.startDate);
    const due = new Date(task.dueDate);
    if (currentDate <= start) return 0;
    if (currentDate >= due) return 100;
    const totalDuration = due - start;
    const elapsed = currentDate - start;
    return (elapsed / totalDuration) * 100;
};

// Main burnout calculation for one employee, for the current week
const calculateBurnoutForEmployee = async (employeeId, targetDate = new Date()) => {
    const { weekStart, weekEnd } = getWeekBounds(targetDate);
    const weekStartStr = toDateStr(weekStart);
    const weekEndStr = toDateStr(weekEnd);

    // Convert employeeId to ObjectId for reliable query (if it is a string)
    const employeeObjectId = mongoose.Types.ObjectId.isValid(employeeId)
        ? new mongoose.Types.ObjectId(employeeId)
        : employeeId;

    // --- Attendance (this week) – match using ObjectId, also fallback to string version if needed
    let thisWeekAttendance = await Attendance.find({
        employee: employeeObjectId,
        date: { $gte: weekStartStr, $lte: weekEndStr },
        checkOut: { $ne: null }
    }).sort({ date: 1 });

    // If no records found and employeeId is a string, try as string (for legacy data)
    if (thisWeekAttendance.length === 0 && typeof employeeId === 'string') {
        thisWeekAttendance = await Attendance.find({
            employee: employeeId,
            date: { $gte: weekStartStr, $lte: weekEndStr },
            checkOut: { $ne: null }
        }).sort({ date: 1 });
    }

    const dailyHours = thisWeekAttendance.map(a => a.workingHours || 0);
    const avgDailyHours = dailyHours.length
        ? dailyHours.reduce((a, b) => a + b, 0) / dailyHours.length
        : 0;

    let consecutiveLongDays = 0;
    let maxConsecutive = 0;
    for (const h of dailyHours) {
        if (h > 9) {
            consecutiveLongDays++;
            maxConsecutive = Math.max(maxConsecutive, consecutiveLongDays);
        } else {
            consecutiveLongDays = 0;
        }
    }

    const lateCheckouts = thisWeekAttendance.filter(a => {
        if (!a.checkOut) return false;
        const hour = new Date(a.checkOut).getHours();
        return hour >= 20;
    }).length;

    // --- Active tasks (pending, in-progress, review) – convert assignedTo as well
    let activeTasks = await Task.find({
        assignedTo: employeeObjectId,
        status: { $in: ['pending', 'in-progress', 'review'] }
    });

    if (activeTasks.length === 0 && typeof employeeId === 'string') {
        activeTasks = await Task.find({
            assignedTo: employeeId,
            status: { $in: ['pending', 'in-progress', 'review'] }
        });
    }

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

    const progressEfficiency = totalExpectedProgress > 0
        ? totalActualProgress / totalExpectedProgress
        : 1;

    // --- Sick leaves in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = toDateStr(thirtyDaysAgo);
    const recentSickLeaves = await Leave.countDocuments({
        employee: employeeObjectId,
        type: 'sick',
        status: 'approved',
        startDate: { $gte: thirtyDaysAgoStr }
    });

    // --- Score calculation (0-100) ---
    let score = 0;

    // Overtime (>9h average)
    if (avgDailyHours > 9) score += 20;
    else if (avgDailyHours > 8.5) score += 10;

    // Consecutive long days
    if (maxConsecutive >= 5) score += 20;
    else if (maxConsecutive >= 3) score += 15;
    else if (maxConsecutive >= 2) score += 8;

    // Workload weight
    if (totalWorkloadWeight > 20) score += 15;
    else if (totalWorkloadWeight > 15) score += 10;
    else if (totalWorkloadWeight > 10) score += 5;

    // Overdue tasks
    if (overdueTasksCount >= 3) score += 20;
    else if (overdueTasksCount === 2) score += 12;
    else if (overdueTasksCount === 1) score += 6;

    // Critical tasks
    if (criticalTasksCount >= 2) score += 15;
    else if (criticalTasksCount === 1) score += 8;

    // Progress efficiency (low efficiency = higher burnout risk)
    if (progressEfficiency < 0.5) score += 25;
    else if (progressEfficiency < 0.7) score += 18;
    else if (progressEfficiency < 0.85) score += 10;

    // Recent sick leaves
    if (recentSickLeaves >= 3) score += 15;
    else if (recentSickLeaves === 2) score += 10;
    else if (recentSickLeaves === 1) score += 5;

    // Late checkouts
    if (lateCheckouts >= 4) score += 10;
    else if (lateCheckouts === 3) score += 7;
    else if (lateCheckouts === 2) score += 4;

    score = Math.min(100, Math.max(0, score));

    // Risk level (only Low, Moderate, High – as per schema)
    let riskLevel = 'Low';
    if (score >= 61) riskLevel = 'High';
    else if (score >= 31) riskLevel = 'Moderate';

    // Signals object (for frontend display)
    const signals = {
        avgDailyHours: parseFloat(avgDailyHours.toFixed(1)),
        consecutiveLongDays: maxConsecutive,
        hoursIncreasing: false,
        taskCompletionRate: parseFloat(
            ((totalActualProgress / (totalExpectedProgress || 1)) * 100).toFixed(1)
        ),
        lowCompletionHighHours: progressEfficiency < 0.7 && avgDailyHours > 8,
        recentSickLeaves,
        lateCheckouts,
        overdueTasksCount,
        workloadWeight: totalWorkloadWeight,
        progressEfficiency: parseFloat(progressEfficiency.toFixed(2))
    };

    // Generate personalised suggestions
    const suggestions = [];
    if (avgDailyHours > 9) suggestions.push('Average daily hours exceed 9hrs — consider workload balance.');
    if (maxConsecutive >= 3) suggestions.push(`Worked long hours for ${maxConsecutive} consecutive days — take a break.`);
    if (overdueTasksCount > 0) suggestions.push(`Has ${overdueTasksCount} overdue task(s) — reprioritise.`);
    if (progressEfficiency < 0.7) suggestions.push(`Task progress efficiency is low (${Math.round(progressEfficiency * 100)}%) — may need clearer milestones.`);
    if (totalWorkloadWeight > 15) suggestions.push('Total workload weight is high — consider redistributing tasks.');
    if (recentSickLeaves > 1) suggestions.push(`${recentSickLeaves} sick leaves recently — monitor wellness.`);
    if (lateCheckouts > 2) suggestions.push(`Late checkouts (after 8 PM) on ${lateCheckouts} days — encourage boundaries.`);
    if (suggestions.length === 0) suggestions.push('Workload seems balanced. Keep it up.');

    // Upsert burnout score for this week
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
        { upsert: true, new: true }
    );
    return burnoutRecord;
};

// Get current user's burnout score (employee dashboard)
exports.getMyBurnoutScore = async (req, res) => {
    try {
        const current = await calculateBurnoutForEmployee(req.user.id);
        const history = await BurnoutScore.find({ employee: req.user.id })
            .sort({ weekStart: -1 })
            .limit(5)
            .lean();
        res.json({
            success: true,
            current,
            history: history.reverse()
        });
    } catch (err) {
        console.error('getMyBurnoutScore error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all employees' burnout scores (admin dashboard)
exports.getAllBurnoutScores = async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' }).select('_id name email department');
        const scores = [];

        for (const emp of employees) {
            const scoreDoc = await calculateBurnoutForEmployee(emp._id);
            // Enrich with employee details
            const enriched = scoreDoc.toObject();
            enriched.employee = {
                _id: emp._id,
                name: emp.name,
                email: emp.email,
                department: emp.department
            };
            scores.push(enriched);
        }

        // Sort by score descending (highest risk first)
        scores.sort((a, b) => b.score - a.score);

        const summary = {
            total: scores.length,
            low: scores.filter(s => s.riskLevel === 'Low').length,
            moderate: scores.filter(s => s.riskLevel === 'Moderate').length,
            high: scores.filter(s => s.riskLevel === 'High').length,
            avgScore: scores.length
                ? (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1)
                : 0
        };

        res.json({ success: true, summary, scores });
    } catch (err) {
        console.error('getAllBurnoutScores error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get a single employee's burnout details (admin only)
exports.getEmployeeBurnoutScore = async (req, res) => {
    try {
        const current = await calculateBurnoutForEmployee(req.params.id);
        const history = await BurnoutScore.find({ employee: req.params.id })
            .sort({ weekStart: -1 })
            .limit(6)
            .lean();
        const employee = await User.findById(req.params.id).select('name email department');
        res.json({
            success: true,
            employee,
            current,
            history: history.reverse()
        });
    } catch (err) {
        console.error('getEmployeeBurnoutScore error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};