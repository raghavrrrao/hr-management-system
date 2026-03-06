const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const { predictProductivityRisk } = require("../controllers/predictionController");

router.get("/:employeeId", protect, adminOnly, predictProductivityRisk);

module.exports = router;