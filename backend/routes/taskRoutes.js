const express = require('express');
const router = express.Router();
const { createTask, getMyTasks, getAllTasks, updateTask, deleteTask } = require('../controllers/taskController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', protect, adminOnly, createTask);
router.get('/my', protect, getMyTasks);
router.get('/', protect, adminOnly, getAllTasks);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, adminOnly, deleteTask);

module.exports = router;