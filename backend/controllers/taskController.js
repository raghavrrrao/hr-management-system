const Task = require('../models/Task');
const { emitToUser, emitToAdmins } = require('../socket/socketManager');

const createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, startDate, dueDate, estimatedHours, priority, complexity, status } = req.body;
        if (new Date(startDate) > new Date(dueDate)) {
            return res.status(400).json({ success: false, message: 'Start date must be before due date' });
        }
        const task = await Task.create({
            title, description, assignedTo, createdBy: req.user.id,
            startDate, dueDate, estimatedHours,
            priority: priority || 'medium',
            complexity: complexity || 'medium',
            status: status || 'pending',
            progress: 0,
            workLogs: []
        });
        emitToUser(req, assignedTo, 'task:assigned', {
            taskId: task._id,
            title: task.title,
            dueDate: task.dueDate,
        });
        res.status(201).json({ success: true, task });
    } catch (error) {
        console.error('createTask error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

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

const getAllTasks = async (req, res) => {
    try {
        await Task.updateOverdueTasks();
        const tasks = await Task.find()
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name')
            .sort({ dueDate: 1 });
        res.json({ success: true, tasks });
    } catch (error) {
        console.error('getAllTasks error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateTaskProgress = async (req, res) => {
    try {
        const { progress, hoursWorked, notes } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        if (task.assignedTo.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const newProgress = Math.min(100, Math.max(0, progress));
        task.progress = newProgress;
        task.workLogs.push({
            date: new Date(),
            progress: newProgress,
            hoursWorked: hoursWorked || 0,
            notes: notes || ''
        });
        if (newProgress === 100 && task.status !== 'completed') task.status = 'review';
        else if (newProgress > 0 && task.status === 'pending') task.status = 'in-progress';
        await task.save();
        await Task.updateOverdueTasks();
        const updated = await Task.findById(task._id);
        emitToAdmins(req, 'task:updated', {
            taskId: updated._id,
            title: updated.title,
            progress: updated.progress,
            status: updated.status,
            employeeId: updated.assignedTo
        });
        res.json({ success: true, task: updated });
    } catch (error) {
        console.error('updateTaskProgress error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'in-progress', 'review', 'completed', 'blocked', 'on-hold'];

        // Validate status
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed: ${validStatuses.join(', ')}`
            });
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Authorization: admin or assigned employee
        if (req.user.role !== 'admin' && task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Update status
        task.status = status;

        // If completing, set progress to 100 and record completion time
        if (status === 'completed') {
            task.progress = 100;
            task.completedAt = new Date();
        }

        await task.save();

        // Re-evaluate overdue tasks (in case due date passed)
        await Task.updateOverdueTasks();

        // Fetch updated task to get fresh data (especially overdue status)
        const updatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name');

        // Emit real‑time events
        emitToAdmins(req, 'task:status-updated', {
            taskId: updatedTask._id,
            title: updatedTask.title,
            status: updatedTask.status,
            employeeId: updatedTask.assignedTo._id
        });
        if (task.assignedTo.toString() !== req.user.id) {
            emitToUser(req, task.assignedTo.toString(), 'task:updated', {
                taskId: updatedTask._id,
                title: updatedTask.title,
                status: updatedTask.status
            });
        }

        return res.json({
            success: true,
            task: updatedTask
        });
    } catch (error) {
        console.error('Error in updateTaskStatus:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

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