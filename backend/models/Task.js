const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    progress: { type: Number, min: 0, max: 100, required: true },
    hoursWorked: { type: Number, min: 0, default: 0 },
    notes: { type: String, default: '' },
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'review', 'completed', 'overdue', 'blocked', 'on-hold'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    estimatedHours: { type: Number, required: true, min: 0.5 },
    
    complexity: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'critical'],
        default: 'medium'
    },
    workloadWeight: { type: Number, default: 1 },
    
    workLogs: [workLogSchema],
    completedAt: { type: Date },
    
}, { timestamps: true });

taskSchema.pre('save', function(next) {
    const complexityWeight = { easy: 1, medium: 2, hard: 3, critical: 5 };
    const priorityWeight = { low: 1, medium: 2, high: 3, critical: 4 };
    this.workloadWeight = (complexityWeight[this.complexity] || 2) + (priorityWeight[this.priority] || 2);
    next();
});

taskSchema.statics.updateOverdueTasks = async function() {
    const now = new Date();
    return await this.updateMany(
        {
            dueDate: { $lt: now },
            progress: { $lt: 100 },
            status: { $nin: ['completed', 'overdue'] }
        },
        { status: 'overdue' }
    );
};

module.exports = mongoose.model('Task', taskSchema);