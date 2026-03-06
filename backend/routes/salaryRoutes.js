const express = require('express');
const router = express.Router();
const { createSalary, getAllSalaries, getMySalaries, updateSalaryStatus, deleteSalary } = require('../controllers/salaryController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', protect, adminOnly, createSalary);
router.get('/', protect, adminOnly, getAllSalaries);
router.get('/my', protect, getMySalaries);
router.put('/:id', protect, adminOnly, updateSalaryStatus);
router.delete('/:id', protect, adminOnly, deleteSalary);

module.exports = router;