// generateTestData.js
// Run with: node generateTestData.js
// WARNING: This will DELETE existing test data (employees, attendance, tasks, leaves, salaries, burnout scores)
// Admin users (role: admin) will be preserved.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/User');
const Attendance = require('./models/Attendance');
const Task = require('./models/Task');
const Leave = require('./models/Leave');
const Salary = require('./models/Salary');
const BurnoutScore = require('./models/BurnoutScore');

// ==================== CONFIGURATION ====================
const EMPLOYEE_COUNT = 30;
const DAYS_BACK = 90; // attendance & tasks for last 90 days
const SALARY_MONTHS = 6; // last 6 months
const WEEKS_BACK = 12; // burnout scores for last 12 weeks

// Helper: random between min and max (inclusive)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper: random float between min and max
const randFloat = (min, max) => min + Math.random() * (max - min);

// Helper: random date between start and end
const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper: format date as YYYY-MM-DD
const formatDate = (date) => date.toISOString().split('T')[0];

// ==================== REALISTIC DATA SETS ====================
const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Shaurya', 'Krishna',
    'Ishaan', 'Anaya', 'Diya', 'Sara', 'Aanya', 'Ananya', 'Navya', 'Myra', 'Kiara', 'Saanvi',
    'Rohan', 'Siddharth', 'Kunal', 'Priya', 'Neha', 'Rahul', 'Amit', 'Deepak', 'Pooja', 'Manish'
];
const lastNames = [
    'Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Gupta', 'Joshi', 'Nair', 'Iyer',
    'Rao', 'Naidu', 'Shetty', 'Khan', 'Das', 'Mishra', 'Choudhary', 'Yadav', 'Mehta', 'Bose'
];
const departments = [
    'Engineering', 'Sales', 'Human Resources', 'Finance', 'Product', 'Marketing',
    'Operations', 'Legal', 'IT Support', 'Customer Success'
];
const designations = {
    'Engineering': ['Junior Engineer', 'Software Engineer', 'Senior Engineer', 'Tech Lead', 'Engineering Manager'],
    'Sales': ['Sales Associate', 'Sales Executive', 'Senior Sales Executive', 'Sales Manager', 'Regional Sales Director'],
    'Human Resources': ['HR Associate', 'HR Generalist', 'HR Business Partner', 'HR Manager', 'HR Head'],
    'Finance': ['Finance Associate', 'Accountant', 'Senior Accountant', 'Finance Manager', 'Finance Controller'],
    'Product': ['Product Analyst', 'Product Manager', 'Senior Product Manager', 'Product Lead', 'Product Director'],
    'Marketing': ['Marketing Associate', 'Marketing Specialist', 'Marketing Manager', 'Senior Marketing Manager', 'Marketing Director'],
    'Operations': ['Operations Associate', 'Operations Manager', 'Senior Operations Manager', 'Operations Head'],
    'Legal': ['Legal Associate', 'Legal Counsel', 'Senior Legal Counsel', 'Legal Director'],
    'IT Support': ['Support Associate', 'Support Engineer', 'Senior Support Engineer', 'IT Support Manager'],
    'Customer Success': ['Customer Success Associate', 'Customer Success Manager', 'Senior CSM', 'Customer Success Lead']
};

// Helper to get salary range from designation
const getSalaryRange = (designation) => {
    if (designation.includes('Junior')) return [30000, 45000];
    if (designation.includes('Software Engineer')) return [50000, 70000];
    if (designation.includes('Senior')) return [70000, 90000];
    if (designation.includes('Lead')) return [90000, 120000];
    if (designation.includes('Manager')) return [100000, 150000];
    if (designation.includes('Director')) return [150000, 200000];
    return [40000, 80000];
};

// Helper to get productivity factor (0.5 to 1.5) based on employeeId hash
const getProductivityFactor = (employeeId) => {
    const hash = employeeId.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
    return 0.6 + (hash % 100) / 100; // 0.6 to 1.6
};

// ==================== GENERATE EMPLOYEES ====================
const generateEmployees = async () => {
    const employees = [];
    const usedEmails = new Set();

    for (let i = 0; i < EMPLOYEE_COUNT; i++) {
        const firstName = firstNames[i % firstNames.length];
        const lastName = lastNames[i % lastNames.length];
        const name = `${firstName} ${lastName}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(i/10)}@hrms.com`;
        if (usedEmails.has(email)) continue;
        usedEmails.add(email);

        const department = departments[i % departments.length];
        const possibleDesignations = designations[department];
        const designation = possibleDesignations[i % possibleDesignations.length];
        const salaryRange = getSalaryRange(designation);
        const basicSalary = rand(salaryRange[0], salaryRange[1]);
        const joiningDate = randomDate(new Date(2023, 0, 1), new Date(2025, 3, 1));
        const employeeId = `EMP${String(1001 + i).slice(1)}`;

        const hashedPassword = await bcrypt.hash('Test@123', 10);

        employees.push({
            employeeId,
            name,
            email,
            password: hashedPassword,
            department,
            designation,
            role: 'employee',
            status: 'active',
            joiningDate,
            mustChangePassword: false,
            createdAt: joiningDate,
            updatedAt: joiningDate
        });
    }
    return employees;
};

// ==================== GENERATE ATTENDANCE ====================
const generateAttendance = (employee, startDate, endDate) => {
    const attendanceRecords = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    const employeeProductivity = getProductivityFactor(employee.employeeId);
    const attendanceRate = Math.min(0.98, 0.7 + employeeProductivity * 0.2);
    const overtimeProbability = 0.15 + employeeProductivity * 0.1;

    while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        let present = false;
        if (!isWeekend) {
            present = Math.random() < attendanceRate;
        } else {
            present = Math.random() < 0.1;
        }

        if (present) {
            const checkInHour = 9 + Math.floor(Math.random() * 2);
            const checkInMinute = Math.floor(Math.random() * 60);
            let checkIn = new Date(currentDate);
            checkIn.setHours(checkInHour, checkInMinute, 0, 0);
            let checkoutHour = 18;
            if (Math.random() < overtimeProbability) checkoutHour += rand(0, 2);
            const checkoutMinute = Math.floor(Math.random() * 60);
            let checkOut = new Date(currentDate);
            checkOut.setHours(checkoutHour, checkoutMinute, 0, 0);
            if (checkOut <= checkIn) checkOut.setHours(checkIn.getHours() + 8);
            const workingHours = (checkOut - checkIn) / 3600000;

            attendanceRecords.push({
                employee: employee._id,
                date: formatDate(currentDate),
                checkIn,
                checkOut,
                workingHours: parseFloat(workingHours.toFixed(2))
            });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return attendanceRecords;
};

// ==================== GENERATE TASKS (multi‑day, new schema) ====================
const generateTasks = (employee, startDate, endDate) => {
    const tasks = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    const employeeProductivity = getProductivityFactor(employee.employeeId);

    while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        if (isWeekend) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
        }
        const numTasks = Math.floor(Math.random() * (4 - 1 + 1)) + 1;
        for (let i = 0; i < numTasks; i++) {
            // Multi‑day task: start today, due in 1‑5 days
            const start = new Date(currentDate);
            const due = new Date(currentDate);
            due.setDate(currentDate.getDate() + rand(1, 5));
            const estimatedHours = rand(2, 20);
            const priority = ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)];
            const complexity = ['easy', 'medium', 'hard', 'critical'][Math.floor(Math.random() * 4)];
            let progress = 0;
            let status = 'pending';
            // If due date is in the past, set some progress or overdue
            const now = new Date();
            if (due < now) {
                progress = rand(0, 100);
                if (progress === 100) status = 'completed';
                else status = 'overdue';
            } else {
                progress = rand(0, 80);
                if (progress > 0) status = 'in-progress';
            }
            tasks.push({
                title: `Task ${i+1}: ${['Update database schema', 'Fix login bug', 'Write documentation', 'Review pull request', 'Prepare presentation', 'Call client', 'Run tests', 'Deploy update', 'Meeting with team', 'Analyse metrics'][Math.floor(Math.random()*10)]}`,
                description: `Detailed description for this task.`,
                assignedTo: employee._id,
                createdBy: employee._id,
                status,
                priority,
                progress,
                startDate: start,
                dueDate: due,
                estimatedHours,
                complexity,
                workloadWeight: (complexity === 'easy' ? 1 : complexity === 'medium' ? 2 : complexity === 'hard' ? 3 : 5) + 
                               (priority === 'low' ? 1 : priority === 'medium' ? 2 : priority === 'high' ? 3 : 4),
                workLogs: progress > 0 ? [{
                    date: new Date(),
                    progress,
                    hoursWorked: rand(1, estimatedHours),
                    notes: 'Progress updated'
                }] : [],
                completedAt: progress === 100 ? new Date() : null
            });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return tasks;
};

// ==================== GENERATE LEAVES ====================
const generateLeaves = (employee, joiningDate) => {
    const leaves = [];
    const leaveTypes = ['sick', 'casual', 'annual', 'other'];
    const numLeaves = rand(2, 8);
    const start = new Date(joiningDate);
    const end = new Date();

    for (let i = 0; i < numLeaves; i++) {
        const startDate = randomDate(start, end);
        const duration = rand(1, 5);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + duration);
        const type = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
        const status = Math.random() > 0.2 ? 'approved' : 'pending';
        leaves.push({
            employee: employee._id,
            type,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            reason: `${type.charAt(0).toUpperCase() + type.slice(1)} leave`,
            status
        });
    }
    return leaves;
};

// ==================== GENERATE SALARIES ====================
const generateSalaries = (employee, joiningDate, basicSalary) => {
    const salaries = [];
    const now = new Date();
    let currentMonth = new Date(joiningDate);
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let months = 0;
    while (currentMonth <= endMonth && months < SALARY_MONTHS + 6) {
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth()+1).padStart(2,'0')}`;
        let salaryAmount = basicSalary;
        const monthsSinceJoin = (currentMonth.getFullYear() - joiningDate.getFullYear()) * 12 + (currentMonth.getMonth() - joiningDate.getMonth());
        if (monthsSinceJoin > 6) salaryAmount = Math.floor(salaryAmount * (1 + 0.03 * Math.floor(monthsSinceJoin/6)));
        const bonus = rand(0, salaryAmount * 0.2);
        const deductions = rand(0, salaryAmount * 0.1);
        const netSalary = salaryAmount + bonus - deductions;
        salaries.push({
            employee: employee._id,
            month: monthStr,
            basicSalary: salaryAmount,
            bonus,
            deductions,
            netSalary,
            status: currentMonth < new Date(now.getFullYear(), now.getMonth(), 1) ? 'paid' : 'pending'
        });
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        months++;
        if (months >= SALARY_MONTHS + 3) break;
    }
    return salaries.slice(-SALARY_MONTHS);
};

// ==================== GENERATE BURNOUT SCORES (WEEKLY) ====================
const generateBurnoutScores = (employee, attendanceRecords, tasks, leaves) => {
    const burnoutScores = [];
    // Group attendance by week
    const weeksMap = new Map();
    for (const att of attendanceRecords) {
        const date = new Date(att.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0,0,0,0);
        const key = weekStart.toISOString();
        if (!weeksMap.has(key)) weeksMap.set(key, { attendance: [], tasks: [], leaves: [] });
        weeksMap.get(key).attendance.push(att);
    }
    // Group tasks by week
    for (const task of tasks) {
        const date = new Date(task.startDate);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0,0,0,0);
        const key = weekStart.toISOString();
        if (!weeksMap.has(key)) weeksMap.set(key, { attendance: [], tasks: [], leaves: [] });
        weeksMap.get(key).tasks.push(task);
    }
    // Group sick leaves by week
    for (const leave of leaves) {
        if (leave.type === 'sick' && leave.status === 'approved') {
            const start = new Date(leave.startDate);
            const weekStart = new Date(start);
            weekStart.setDate(start.getDate() - start.getDay());
            weekStart.setHours(0,0,0,0);
            const key = weekStart.toISOString();
            if (!weeksMap.has(key)) weeksMap.set(key, { attendance: [], tasks: [], leaves: [] });
            weeksMap.get(key).leaves.push(leave);
        }
    }

    for (const [weekStartStr, data] of weeksMap.entries()) {
        const weekStart = new Date(weekStartStr);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        if (weekStart > new Date()) continue;

        const dailyHours = data.attendance.map(a => a.workingHours);
        const avgDailyHours = dailyHours.length ? dailyHours.reduce((a,b) => a+b,0) / dailyHours.length : 0;
        let consecutiveLongDays = 0, maxConsecutive = 0;
        for (const h of dailyHours) {
            if (h > 9) { consecutiveLongDays++; maxConsecutive = Math.max(maxConsecutive, consecutiveLongDays); }
            else { consecutiveLongDays = 0; }
        }
        let totalWorkloadWeight = 0, overdueTasksCount = 0, criticalTasksCount = 0;
        let totalExpectedProgress = 0, totalActualProgress = 0;
        const now = new Date();
        for (const task of data.tasks) {
            if (task.status === 'completed') continue;
            totalWorkloadWeight += task.workloadWeight || 1;
            if (task.priority === 'critical') criticalTasksCount++;
            const start = new Date(task.startDate);
            const due = new Date(task.dueDate);
            let expected = 0;
            if (now > due) expected = 100;
            else if (now > start) {
                const totalDuration = due - start;
                const elapsed = now - start;
                expected = (elapsed / totalDuration) * 100;
            }
            totalExpectedProgress += expected * (task.workloadWeight || 1);
            totalActualProgress += task.progress * (task.workloadWeight || 1);
            if (task.dueDate < now && task.progress < 100) overdueTasksCount++;
        }
        const progressEfficiency = totalExpectedProgress > 0 ? totalActualProgress / totalExpectedProgress : 1;
        const recentSickLeaves = data.leaves.length;
        const lateCheckouts = data.attendance.filter(a => {
            if (!a.checkOut) return false;
            const hour = new Date(a.checkOut).getHours();
            return hour >= 20;
        }).length;

        let score = 0;
        if (avgDailyHours > 9) score += 20;
        else if (avgDailyHours > 8.5) score += 10;
        if (maxConsecutive >= 5) score += 20;
        else if (maxConsecutive >= 3) score += 15;
        else if (maxConsecutive >= 2) score += 8;
        if (totalWorkloadWeight > 20) score += 15;
        else if (totalWorkloadWeight > 15) score += 10;
        else if (totalWorkloadWeight > 10) score += 5;
        if (overdueTasksCount >= 3) score += 20;
        else if (overdueTasksCount === 2) score += 12;
        else if (overdueTasksCount === 1) score += 6;
        if (criticalTasksCount >= 2) score += 15;
        else if (criticalTasksCount === 1) score += 8;
        if (progressEfficiency < 0.5) score += 25;
        else if (progressEfficiency < 0.7) score += 18;
        else if (progressEfficiency < 0.85) score += 10;
        if (recentSickLeaves >= 3) score += 15;
        else if (recentSickLeaves === 2) score += 10;
        else if (recentSickLeaves === 1) score += 5;
        if (lateCheckouts >= 4) score += 10;
        else if (lateCheckouts === 3) score += 7;
        else if (lateCheckouts === 2) score += 4;
        score = Math.min(100, Math.max(0, score));

        // Risk level – only use allowed values: Low, Moderate, High
        let riskLevel = 'Low';
        if (score >= 61) riskLevel = 'High';
        else if (score >= 31) riskLevel = 'Moderate';

        const signals = {
            avgDailyHours: parseFloat(avgDailyHours.toFixed(1)),
            consecutiveLongDays: maxConsecutive,
            hoursIncreasing: false,
            taskCompletionRate: parseFloat((totalActualProgress / (totalExpectedProgress || 1) * 100).toFixed(1)),
            lowCompletionHighHours: (progressEfficiency < 0.7 && avgDailyHours > 8),
            recentSickLeaves,
            lateCheckouts,
            overdueTasksCount,
            workloadWeight: totalWorkloadWeight,
            progressEfficiency: parseFloat(progressEfficiency.toFixed(2))
        };
        const suggestions = [];
        if (avgDailyHours > 9) suggestions.push("Average daily hours exceed 9hrs — consider workload balance.");
        if (maxConsecutive >= 3) suggestions.push(`Worked long hours for ${maxConsecutive} consecutive days — take a break.`);
        if (overdueTasksCount > 0) suggestions.push(`Has ${overdueTasksCount} overdue task(s) — reprioritise.`);
        if (progressEfficiency < 0.7) suggestions.push(`Task progress efficiency is low (${Math.round(progressEfficiency*100)}%) — may need clearer milestones.`);
        if (totalWorkloadWeight > 15) suggestions.push("Total workload weight is high — consider redistributing tasks.");
        if (recentSickLeaves > 1) suggestions.push(`${recentSickLeaves} sick leaves recently — monitor wellness.`);
        if (lateCheckouts > 2) suggestions.push(`Late checkouts (after 8 PM) on ${lateCheckouts} days — encourage boundaries.`);
        if (suggestions.length === 0) suggestions.push("Workload seems balanced. Keep it up.");

        burnoutScores.push({
            employee: employee._id,
            score,
            riskLevel,
            signals,
            suggestions,
            weekStart,
            weekEnd,
            calculatedAt: new Date()
        });
    }
    return burnoutScores.slice(-WEEKS_BACK);
};

// ==================== MAIN SCRIPT ====================
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            family: 4,
            serverSelectionTimeoutMS: 10000,
        });
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
};

const clearCollections = async (preserveAdmin = true) => {
    if (preserveAdmin) {
        await User.deleteMany({ role: { $ne: 'admin' } });
        console.log('🗑️ Deleted all non-admin users');
    } else {
        await User.deleteMany({});
        console.log('🗑️ Deleted all users');
    }
    await Attendance.deleteMany({});
    await Task.deleteMany({});
    await Leave.deleteMany({});
    await Salary.deleteMany({});
    await BurnoutScore.deleteMany({});
    console.log('🗑️ Cleared attendance, tasks, leaves, salaries, burnout scores');
};

const run = async () => {
    await connectDB();

    console.log('⚠️  This will delete existing test data (employees, attendance, tasks, leaves, salaries, burnout scores).');
    console.log('⚠️  Admin users (role: admin) will be preserved.');
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const answer = await new Promise(resolve => {
        readline.question('Type "YES" to continue: ', resolve);
    });
    readline.close();
    if (answer !== 'YES') {
        console.log('Aborted.');
        process.exit(0);
    }

    await clearCollections(true);

    console.log('👥 Generating employees...');
    const employees = await generateEmployees();
    const insertedEmployees = await User.insertMany(employees);
    console.log(`✅ Inserted ${insertedEmployees.length} employees`);

    let allAttendance = [];
    let allTasks = [];
    let allLeaves = [];
    let allSalaries = [];
    let allBurnoutScores = [];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - DAYS_BACK);

    for (const emp of insertedEmployees) {
        console.log(`📊 Generating data for ${emp.name}...`);
        const attendance = generateAttendance(emp, startDate, endDate);
        const tasks = generateTasks(emp, startDate, endDate);
        const leaves = generateLeaves(emp, emp.joiningDate);
        const basicSalary = getSalaryRange(emp.designation)[0];
        const salaries = generateSalaries(emp, emp.joiningDate, basicSalary);
        const burnoutScores = generateBurnoutScores(emp, attendance, tasks, leaves);

        allAttendance.push(...attendance);
        allTasks.push(...tasks);
        allLeaves.push(...leaves);
        allSalaries.push(...salaries);
        allBurnoutScores.push(...burnoutScores);
    }

    console.log(`📋 Inserting ${allAttendance.length} attendance records...`);
    await Attendance.insertMany(allAttendance);
    console.log(`📋 Inserting ${allTasks.length} task records...`);
    await Task.insertMany(allTasks);
    console.log(`📋 Inserting ${allLeaves.length} leave records...`);
    await Leave.insertMany(allLeaves);
    console.log(`📋 Inserting ${allSalaries.length} salary records...`);
    await Salary.insertMany(allSalaries);
    console.log(`📋 Inserting ${allBurnoutScores.length} burnout scores...`);
    await BurnoutScore.insertMany(allBurnoutScores);

    console.log('\n✅ DATA GENERATION COMPLETE!');
    console.log('====================================');
    console.log(`Employees created: ${insertedEmployees.length}`);
    console.log(`Attendance records: ${allAttendance.length}`);
    console.log(`Tasks: ${allTasks.length}`);
    console.log(`Leaves: ${allLeaves.length}`);
    console.log(`Salary records: ${allSalaries.length}`);
    console.log(`Burnout scores: ${allBurnoutScores.length}`);
    console.log('\n🔑 Login credentials:');
    console.log('Email: any employee email (e.g., aarav.sharma0@hrms.com)');
    console.log('Password: Test@123');
    console.log('\n✅ All done!');
    process.exit(0);
};

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});