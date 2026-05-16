const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { promoteEmployee } = require('../controllers/adminController');

router.put('/promote/:id', protect, adminOnly, promoteEmployee);

module.exports = router;