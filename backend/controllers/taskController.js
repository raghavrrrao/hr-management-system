const Task = require('../models/Task');
const { emitToUser, emitToAdmins } = require('../socket/socketManager');

const checkAndUpdateOverdue = async (taskId) => {
    const task = await Task.findById(taskId);
    if (!task) return;
    const now = new Date();
    if (task.dueDate < now && task.progress < 100 && task.status !== 'completed') {
        if (task.status !== 'overdue') {
            task.status = 'overdue';
            await task.save();
        }
    }
};

const createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, startDate, dueDate, estimatedHours, priority, complexity } = req.body;
        if (new Date(startDate) > new Date(dueDate)) {
            return res.status(400).json({ message: 'Start date must be before due date' });
        }
        const task = await Task.create({
            title, description, assignedTo, createdBy: req.user.id,
            startDate, dueDate, estimatedHours,
            priority: priority || 'medium', complexity: complexity || 'medium',
            status: 'pending', progress: 0, workLogs: []
        });
        emitToUser(req, assignedTo, 'task:assigned', { taskId: task._id, title: task.title, dueDate: task.dueDate });
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyTasks = async (req, res) => {
    try {
        await Task.updateOverdueTasks();
        const tasks = await Task.find({ assignedTo: req.user.id }).sort({ dueDate: 1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllTasks = async (req, res) => {
    try {
        await Task.updateOverdueTasks();
        const tasks = await Task.find()
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name')
            .sort({ dueDate: 1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTaskProgress = async (req, res) => {
    try {
        const { progress, hoursWorked, notes } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        if (task.assignedTo.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const newProgress = Math.min(100, Math.max(0, progress));
        task.progress = newProgress;
        task.workLogs.push({ date: new Date(), progress: newProgress, hoursWorked: hoursWorked || 0, notes: notes || '' });
        if (newProgress === 100 && task.status !== 'completed') task.status = 'review';
        else if (newProgress > 0 && task.status === 'pending') task.status = 'in-progress';
        await task.save();
        await checkAndUpdateOverdue(task._id);
        emitToAdmins(req, 'task:updated', { taskId: task._id, title: task.title, progress: task.progress, status: task.status, employeeId: task.assignedTo });
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'in-progress', 'review', 'completed', 'blocked', 'on-hold'];
        if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        if (req.user.role !== 'admin' && task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        task.status = status;
        if (status === 'completed') { task.progress = 100; task.completedAt = new Date(); }
        await task.save();
        await checkAndUpdateOverdue(task._id);
        emitToAdmins(req, 'task:status-updated', { taskId: task._id, title: task.title, status: task.status, employeeId: task.assignedTo });
        if (task.assignedTo.toString() !== req.user.id) {
            emitToUser(req, task.assignedTo.toString(), 'task:updated', { taskId: task._id, title: task.title, status: task.status });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createTask, getMyTasks, getAllTasks, updateTaskProgress, updateTaskStatus, deleteTask };