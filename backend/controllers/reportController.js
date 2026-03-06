const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Salary = require('../models/Salary');
const User = require('../models/User');

// Convert JSON to CSV string
const toCSV = (headers, rows) => {
    const headerRow = headers.join(',');
    const dataRows = rows.map(row =>
        headers.map(h => `"${row[h] ?? ''}"`).join(',')
    );
    return [headerRow, ...dataRows].join('\n');
};

// Attendance Report
const getAttendanceReport = async (req, res) => {
    try {
        const records = await Attendance.find()
            .populate('employee', 'name email')
            .sort({ date: -1 });

        const rows = records.map(r => ({
            Name: r.employee?.name || 'Unknown',
            Email: r.employee?.email || '',
            Date: r.date,
            'Check In': r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '-',
            'Check Out': r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '-',
            'Working Hours': r.workingHours,
            Status: r.checkOut ? 'Complete' : 'Incomplete',
        }));

        const csv = toCSV(['Name', 'Email', 'Date', 'Check In', 'Check Out', 'Working Hours', 'Status'], rows);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Salary Report
const getSalaryReport = async (req, res) => {
    try {
        const records = await Salary.find()
            .populate('employee', 'name email')
            .sort({ createdAt: -1 });

        const rows = records.map(s => ({
            Name: s.employee?.name || 'Unknown',
            Email: s.employee?.email || '',
            Month: s.month,
            'Basic Salary': s.basicSalary,
            Bonus: s.bonus,
            Deductions: s.deductions,
            'Net Salary': s.netSalary,
            Status: s.status,
        }));

        const csv = toCSV(['Name', 'Email', 'Month', 'Basic Salary', 'Bonus', 'Deductions', 'Net Salary', 'Status'], rows);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=salary-report.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Productivity Report
const getProductivityReport = async (req, res) => {
    try {
        const employees = await User.find().select('-password');

        const rows = await Promise.all(employees.map(async (emp) => {
            const attendance = await Attendance.find({ employee: emp._id });
            const totalHours = attendance.reduce((acc, r) => acc + (r.workingHours || 0), 0);
            const completedTasks = await Task.countDocuments({ employee: emp._id, completed: true });
            const score = totalHours > 0 ? (completedTasks / totalHours).toFixed(2) : 0;

            return {
                Name: emp.name,
                Email: emp.email,
                Role: emp.role,
                'Total Working Hours': totalHours.toFixed(2),
                'Tasks Completed': completedTasks,
                'Productivity Score': score,
                Performance: score >= 1 ? 'High' : score > 0 ? 'Medium' : 'Low',
            };
        }));

        const csv = toCSV(['Name', 'Email', 'Role', 'Total Working Hours', 'Tasks Completed', 'Productivity Score', 'Performance'], rows);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=productivity-report.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAttendanceReport, getSalaryReport, getProductivityReport };