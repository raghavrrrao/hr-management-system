const express = require('express');
const router = express.Router();
const {
    createTask, getMyTasks, getAllTasks,
    updateTaskProgress, updateTaskStatus, deleteTask
} = require('../controllers/taskController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', protect, adminOnly, createTask);
router.get('/my', protect, getMyTasks);
router.get('/', protect, adminOnly, getAllTasks);
router.put('/:id/progress', protect, updateTaskProgress);
router.put('/:id/status', protect, updateTaskStatus);
router.delete('/:id', protect, adminOnly, deleteTask);

module.exports = router;