const Task = require('../models/Task');
const { emitToUser, emitToAdmins } = require('../socket/socketManager');

// ========== CREATE TASK ==========
const createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, startDate, dueDate, estimatedHours, priority, complexity } = req.body;
        if (new Date(startDate) > new Date(dueDate)) {
            return res.status(400).json({ success: false, message: 'Start date must be before due date' });
        }
        const task = await Task.create({
            title, description, assignedTo, createdBy: req.user.id,
            startDate, dueDate, estimatedHours,
            priority: priority || 'medium',
            complexity: complexity || 'medium',
            status: 'pending', progress: 0, workLogs: []
        });
        emitToUser(req, assignedTo, 'task:assigned', {
            taskId: task._id, title: task.title, dueDate: task.dueDate
        });
        res.status(201).json({ success: true, task });
    } catch (error) {
        console.error('createTask error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========== GET MY TASKS (EMPLOYEE) ==========
const getMyTasks = async (req, res) => {
    try {
        await Task.updateOverdueTasks();
        const tasks = await Task.find({ assignedTo: req.user.id }).sort({ dueDate: 1 });
        res.json({ success: true, tasks });
    } catch (error) {
        console.error('getMyTasks error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========== GET ALL TASKS (ADMIN) – SAFE VERSION (NO POPULATE) ==========
const getAllTasks = async (req, res) => {
    try {
        await Task.updateOverdueTasks();
        const tasks = await Task.find().sort({ dueDate: 1 });
        // Remove populate for now – add back only after data is clean
        res.json({ success: true, tasks });
    } catch (error) {
        console.error('getAllTasks error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========== UPDATE PROGRESS ==========
const updateTaskProgress = async (req, res) => {
    try {
        const { progress, hoursWorked = 0, notes = '' } = req.body;
        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
            return res.status(400).json({ success: false, message: 'Progress must be 0–100' });
        }
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        if (req.user.role !== 'admin' && task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        task.progress = progress;
        task.workLogs.push({ date: new Date(), progress, hoursWorked, notes });
        if (progress === 100 && task.status !== 'completed') {
            task.status = 'completed';
            task.completedAt = new Date();
        } else if (progress > 0 && task.status === 'pending') {
            task.status = 'in-progress';
        }
        await task.save();
        await Task.updateOverdueTasks();
        // Optional: emit socket event (safe)
        try {
            emitToAdmins(req, 'task:updated', {
                taskId: task._id, title: task.title, progress: task.progress, status: task.status
            });
        } catch (e) { console.warn('Socket emit failed', e.message); }
        res.json({ success: true, task });
    } catch (error) {
        console.error('updateTaskProgress error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========== UPDATE STATUS (FIXED) ==========
const updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'in-progress', 'review', 'completed', 'overdue', 'blocked', 'on-hold'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
        }

        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        if (req.user.role !== 'admin' && task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        task.status = status;
        if (status === 'completed') {
            task.progress = 100;
            task.completedAt = new Date();
        }
        await task.save();
        await Task.updateOverdueTasks();

        // Safe socket emit (no crash if socket manager fails)
        try {
            emitToAdmins(req, 'task:status-updated', {
                taskId: task._id, title: task.title, status: task.status, employeeId: task.assignedTo
            });
            if (task.assignedTo.toString() !== req.user.id) {
                emitToUser(req, task.assignedTo.toString(), 'task:updated', {
                    taskId: task._id, title: task.title, status: task.status
                });
            }
        } catch (e) { console.warn('Socket emit failed', e.message); }

        res.json({ success: true, task });
    } catch (error) {
        console.error('updateTaskStatus error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========== DELETE TASK ==========
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, message: 'Task deleted' });
    } catch (error) {
        console.error('deleteTask error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createTask,
    getMyTasks,
    getAllTasks,
    updateTaskProgress,
    updateTaskStatus,
    deleteTask,
};