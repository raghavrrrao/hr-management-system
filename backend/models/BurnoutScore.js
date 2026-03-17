const mongoose = require("mongoose");

const burnoutScoreSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Computed weekly score (0–100)
        score: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },

        // Low | Moderate | High
        riskLevel: {
            type: String,
            enum: ["Low", "Moderate", "High"],
            required: true,
        },

        // Raw signals used to compute the score (for transparency)
        signals: {
            avgDailyHours: { type: Number, default: 0 },          // avg working hrs last 7 days
            consecutiveLongDays: { type: Number, default: 0 },    // days with >9 hrs in a row
            hoursIncreasing: { type: Boolean, default: false },   // week-over-week hrs trend
            taskCompletionRate: { type: Number, default: 0 },     // % tasks completed last 7 days
            lowCompletionHighHours: { type: Boolean, default: false },
            recentSickLeaves: { type: Number, default: 0 },       // sick leaves in last 30 days
            lateCheckouts: { type: Number, default: 0 },          // checkouts after 20:00 last 7 days
        },

        // Auto-generated suggestions based on signals
        suggestions: [{ type: String }],

        // The week this score was computed for
        weekStart: { type: Date, required: true },
        weekEnd: { type: Date, required: true },

        calculatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// One score record per employee per week
burnoutScoreSchema.index({ employee: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model("BurnoutScore", burnoutScoreSchema);