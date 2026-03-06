const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getProductivityScore,
    getFilteredProductivity
} = require('../controllers/productivityController');

// Employee can see their own score
router.get('/:employeeId', protect, getProductivityScore);

// Admin can filter by weekly/monthly
router.get('/:employeeId/filter', protect, adminOnly, getFilteredProductivity);

module.exports = router;