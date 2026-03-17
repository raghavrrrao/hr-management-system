const Leave = require('../models/Leave');
const { emitToAdmins, emitToUser } = require('../socket/socketManager');

const applyLeave = async (req, res) => {
    try {
        const { type, startDate, endDate, reason } = req.body;
        const leave = await Leave.create({
            employee: req.user.id, type, startDate, endDate, reason,
        });

        // ── Notify all admins a new leave request has arrived ─────────────────
        emitToAdmins(req, 'leave:requested', {
            employeeId: req.user.id,
            employeeName: req.user.name || 'An employee',
            leaveType: type,
            startDate,
            endDate,
            leaveId: leave._id,
        });

        res.status(201).json(leave);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ employee: req.user.id }).sort({ createdAt: -1 });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find()
            .populate('employee', 'name email')
            .sort({ createdAt: -1 });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateLeaveStatus = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: 'Leave not found' });

        leave.status = req.body.status;
        await leave.save();

        // ── Notify the employee their leave was approved or rejected ──────────
        const event = leave.status === 'approved' ? 'leave:approved' : 'leave:rejected';
        emitToUser(req, leave.employee.toString(), event, {
            leaveType: leave.type,
            startDate: leave.startDate,
            endDate: leave.endDate,
            status: leave.status,
            leaveId: leave._id,
        });

        res.json(leave);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteLeave = async (req, res) => {
    try {
        await Leave.findByIdAndDelete(req.params.id);
        res.json({ message: 'Leave deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { applyLeave, getMyLeaves, getAllLeaves, updateLeaveStatus, deleteLeave };