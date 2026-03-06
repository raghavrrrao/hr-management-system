const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { setOfficeLocation, promoteEmployee } = require('../controllers/adminController');

router.post('/office-location', protect, adminOnly, setOfficeLocation);
router.put('/promote/:id', protect, adminOnly, promoteEmployee);

module.exports = router;