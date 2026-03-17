const express = require("express");
const router = express.Router();

const {
    getMyBurnoutScore,
    getAllBurnoutScores,
    getEmployeeBurnoutScore,
} = require("../controllers/burnoutController");

const { protect, adminOnly } = require("../middleware/auth");
// ↑ Adjust import to match your existing auth middleware names

// Employee: view own score
router.get("/my-score", protect, getMyBurnoutScore);

// Admin: all employees' scores + org summary
router.get("/all", protect, adminOnly, getAllBurnoutScores);

// Admin: single employee score + history
router.get("/employee/:id", protect, adminOnly, getEmployeeBurnoutScore);

module.exports = router;