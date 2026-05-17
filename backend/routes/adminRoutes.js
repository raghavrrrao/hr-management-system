const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { promoteEmployee, createEmployee, getAllEmployeesAdmin } = require('../controllers/adminController');

// router.post('/office-location', ...) → DELETED

router.put('/promote/:id', protect, adminOnly, promoteEmployee);
router.post('/employees', protect, adminOnly, createEmployee);
router.get('/employees', protect, adminOnly, getAllEmployeesAdmin);

module.exports = router;