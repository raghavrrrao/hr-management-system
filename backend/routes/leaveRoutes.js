const express = require('express');
const router = express.Router();
const { applyLeave, getMyLeaves, getAllLeaves, updateLeaveStatus, deleteLeave } = require('../controllers/leaveController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', protect, applyLeave);
router.get('/my', protect, getMyLeaves);
router.get('/', protect, adminOnly, getAllLeaves);
router.put('/:id', protect, adminOnly, updateLeaveStatus);
router.delete('/:id', protect, adminOnly, deleteLeave);

module.exports = router;