const Task = require('../models/Task');
const { emitToUser, emitToAdmins } = require('../socket/socketManager');

const createTask = async (req, res) => {
    try {
        const { employee, date, description } = req.body;
        const task = await Task.create({ employee, date, description });

        // ── Notify the assigned employee in real-time ─────────────────────────
        emitToUser(req, employee.toString(), 'task:assigned', {
            taskId: task._id,
            description: task.description,
            date: task.date,
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ employee: req.user.id }).sort({ date: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('employee', 'name email')
            .sort({ date: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.completed = req.body.completed ?? task.completed;
        task.description = req.body.description ?? task.description;
        await task.save();

        // ── Notify all admins when an employee marks a task done/undone ───────
        emitToAdmins(req, 'task:updated', {
            taskId: task._id,
            description: task.description,
            completed: task.completed,
            employeeId: task.employee,
        });

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

module.exports = { createTask, getMyTasks, getAllTasks, updateTask, deleteTask };