const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
    getAttendanceReport,
    getSalaryReport,
    getProductivityReport
} = require('../controllers/reportController');

router.get('/attendance', protect, adminOnly, getAttendanceReport);
router.get('/salary', protect, adminOnly, getSalaryReport);
router.get('/productivity', protect, adminOnly, getProductivityReport);

module.exports = router;