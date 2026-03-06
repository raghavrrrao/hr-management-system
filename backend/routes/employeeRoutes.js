const express = require('express');
const router = express.Router();
const { getAllEmployees, deleteEmployee, updateEmployee } = require('../controllers/employeeController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, getAllEmployees);
router.put('/:id', protect, adminOnly, updateEmployee);
router.delete('/:id', protect, adminOnly, deleteEmployee);

module.exports = router;