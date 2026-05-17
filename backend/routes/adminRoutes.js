const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { promoteEmployee, createEmployee, getAllEmployees } = require('../controllers/adminController');

router.put('/promote/:id', protect, adminOnly, promoteEmployee);
router.post('/employees', protect, adminOnly, createEmployee);
router.get('/employees', protect, adminOnly, getAllEmployees);

module.exports = router;