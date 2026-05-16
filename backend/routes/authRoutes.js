const express = require('express');
const router = express.Router();
const { login, changePassword, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

// Public registration removed

module.exports = router;