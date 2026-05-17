const mongoose = require('mongoose');

const burnoutScoreSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['Low', 'Moderate', 'High'], required: true },
    signals: {
        avgDailyHours: { type: Number, default: 0 },
        consecutiveLongDays: { type: Number, default: 0 },
        hoursIncreasing: { type: Boolean, default: false },
        taskCompletionRate: { type: Number, default: 0 },
        lowCompletionHighHours: { type: Boolean, default: false },
        recentSickLeaves: { type: Number, default: 0 },
        lateCheckouts: { type: Number, default: 0 },
        overdueTasksCount: { type: Number, default: 0 },
        workloadWeight: { type: Number, default: 0 },
        progressEfficiency: { type: Number, default: 1 },
    },
    suggestions: [{ type: String }],
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    calculatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

burnoutScoreSchema.index({ employee: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model('BurnoutScore', burnoutScoreSchema);