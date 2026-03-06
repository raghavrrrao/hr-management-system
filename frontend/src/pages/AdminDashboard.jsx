import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const Card = ({ children, style = {} }) => (
    <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '1.5rem', ...style
    }}>{children}</div>
);

const Badge = ({ children, color }) => (
    <span style={{
        padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem',
        fontWeight: 600, background: `${color}20`, color, border: `1px solid ${color}40`
    }}>{children}</span>
);

const Input = ({ label, ...props }) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <label style={{
            display: 'block', fontSize: '0.8rem', fontWeight: 600,
            color: 'var(--text-secondary)', marginBottom: '0.5rem',
            textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>{label}</label>
        <input {...props} style={{
            width: '100%', padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
            colorScheme: 'dark', ...props.style
        }} />
    </div>
);

const handleExport = async (type) => {
    try {
        const token = localStorage.getItem('token');
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${baseURL}/reports/${type}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        showMessage(`✅ ${type} report downloaded!`);
    } catch (err) {
        showMessage(`❌ Export failed`);
    }
};

const TABS = ['analytics', 'attendance', 'employees', 'tasks', 'leaves', 'salary', 'productivity'];
const COLORS = ['#2e7df7', '#10b981', '#f59e0b', '#ef4444'];

const AdminDashboard = () => {
    const [tab, setTab] = useState('analytics');
    const [attendance, setAttendance] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [productivityData, setProductivityData] = useState([]);
    const [message, setMessage] = useState('');

    const [taskForm, setTaskForm] = useState({ employee: '', date: '', description: '' });
    const [salaryForm, setSalaryForm] = useState({ employee: '', month: '', basicSalary: '', bonus: '', deductions: '' });

    const fetchData = async () => {
        try {
            const [attRes, taskRes, empRes, leaveRes, salaryRes] = await Promise.all([
                API.get('/attendance'),
                API.get('/tasks'),
                API.get('/employees'),
                API.get('/leaves'),
                API.get('/salary'),
            ]);
            setAttendance(attRes.data);
            setTasks(taskRes.data);
            setEmployees(empRes.data);
            setLeaves(leaveRes.data);
            setSalaries(salaryRes.data);

            // Fetch productivity for each employee
            const prodScores = await Promise.all(
                empRes.data.map(emp =>
                    API.get(`/productivity/${emp._id}`)
                        .then(r => ({ ...r.data, name: emp.name, email: emp.email }))
                        .catch(() => ({ name: emp.name, email: emp.email, productivityScore: 0, completedTasks: 0, totalWorkingHours: '0.00' }))
                )
            );
            setProductivityData(prodScores);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, []);

    const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await API.post('/tasks', taskForm);
            showMessage('✅ Task assigned!');
            setTaskForm({ employee: '', date: '', description: '' });
            fetchData();
        } catch (err) { showMessage(`❌ ${err.response?.data?.message || 'Error'}`); }
    };

    const handleCreateSalary = async (e) => {
        e.preventDefault();
        try {
            await API.post('/salary', {
                ...salaryForm,
                basicSalary: Number(salaryForm.basicSalary),
                bonus: Number(salaryForm.bonus),
                deductions: Number(salaryForm.deductions),
            });
            showMessage('✅ Salary record created!');
            setSalaryForm({ employee: '', month: '', basicSalary: '', bonus: '', deductions: '' });
            fetchData();
        } catch (err) { showMessage(`❌ ${err.response?.data?.message || 'Error'}`); }
    };

    const handleLeaveStatus = async (id, status) => {
        try {
            await API.put(`/leaves/${id}`, { status });
            showMessage(`✅ Leave ${status}!`);
            fetchData();
        } catch (err) { showMessage(`❌ Error`); }
    };

    const handleSalaryStatus = async (id, status) => {
        try {
            await API.put(`/salary/${id}`, { status });
            showMessage(`✅ Salary marked ${status}!`);
            fetchData();
        } catch (err) { showMessage(`❌ Error`); }
    };

    const handleDeleteEmployee = async (id) => {
        if (!confirm('Delete this employee?')) return;
        try {
            await API.delete(`/employees/${id}`);
            showMessage('✅ Employee deleted!');
            fetchData();
        } catch (err) { showMessage(`❌ Error`); }
    };

    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today);
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
    const pendingSalaries = salaries.filter(s => s.status === 'pending').length;

    const attendanceChartData = (() => {
        const map = {};
        attendance.forEach(a => { map[a.date] = (map[a.date] || 0) + 1; });
        return Object.entries(map).slice(-7).map(([date, count]) => ({ date: date.slice(5), count }));
    })();

    const taskPieData = [
        { name: 'Completed', value: tasks.filter(t => t.completed).length },
        { name: 'Pending', value: tasks.filter(t => !t.completed).length },
    ];

    const leavePieData = [
        { name: 'Approved', value: leaves.filter(l => l.status === 'approved').length },
        { name: 'Pending', value: leaves.filter(l => l.status === 'pending').length },
        { name: 'Rejected', value: leaves.filter(l => l.status === 'rejected').length },
    ];

    const btnStyle = (active) => ({
        padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
        background: active ? 'var(--accent)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        color: active ? 'white' : 'var(--text-secondary)',
        textTransform: 'capitalize', transition: 'all 0.2s', cursor: 'pointer',
    });

    return (
        <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
            <Navbar />
            <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '2rem' }}>

                {message && (
                    <div style={{
                        background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${message.includes('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: message.includes('✅') ? '#6ee7b7' : '#fca5a5',
                        padding: '0.875rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 500,
                    }}>{message}</div>
                )}

                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Admin Dashboard</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Manage your team</p>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    {[
                        { label: 'Employees', value: employees.length, color: 'var(--accent)' },
                        { label: 'Present Today', value: todayAttendance.length, color: 'var(--success)' },
                        { label: 'Total Tasks', value: tasks.length, color: 'var(--warning)' },
                        { label: 'Pending Tasks', value: tasks.filter(t => !t.completed).length, color: 'var(--danger)' },
                        { label: 'Pending Leaves', value: pendingLeaves, color: '#a78bfa' },
                        { label: 'Pending Salaries', value: pendingSalaries, color: '#fb923c' },
                    ].map(({ label, value, color }) => (
                        <Card key={label} style={{ padding: '1.25rem' }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{value}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{label}</div>
                        </Card>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={btnStyle(tab === t)}>{t}</button>)}
                </div>

                {/* ANALYTICS TAB */}
                {tab === 'analytics' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <Card style={{ gridColumn: 'span 2' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.5rem', fontSize: '1rem' }}>Attendance (Last 7 Days)</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={attendanceChartData}>
                                    <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                                    <YAxis stroke="var(--text-secondary)" fontSize={12} allowDecimals={false} />
                                    <Tooltip contentStyle={{ background: 'var(--navy-mid)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                                    <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.5rem', fontSize: '1rem' }}>Task Status</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}>
                                        {taskPieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--navy-mid)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                    <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card style={{ gridColumn: 'span 2' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.5rem', fontSize: '1rem' }}>Leave Requests Overview</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={leavePieData} cx="50%" cy="50%" outerRadius={85} dataKey="value" paddingAngle={4}>
                                        {leavePieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--navy-mid)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                    <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>Quick Stats</h3>
                            {[
                                { label: 'Total Payroll', value: `₹${salaries.reduce((s, r) => s + r.netSalary, 0).toLocaleString()}` },
                                { label: 'Paid Salaries', value: salaries.filter(s => s.status === 'paid').length },
                                { label: 'Approved Leaves', value: leaves.filter(l => l.status === 'approved').length },
                                { label: 'Attendance Records', value: attendance.length },
                            ].map(({ label, value }) => (
                                <div key={label} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.75rem 0', borderBottom: '1px solid var(--border)',
                                }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{label}</span>
                                    <span style={{ fontWeight: 600, fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>{value}</span>
                                </div>
                            ))}
                        </Card>
                        <Card style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem' }}>📥 Export Reports</h3>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {[
                                    { type: 'attendance', label: '📋 Attendance Report', color: 'var(--accent)' },
                                    { type: 'salary', label: '💰 Salary Report', color: 'var(--success)' },
                                    { type: 'productivity', label: '📊 Productivity Report', color: '#a78bfa' },
                                ].map(({ type, label, color }) => (
                                    <button key={type} onClick={() => handleExport(type)} style={{
                                        padding: '0.75rem 1.5rem',
                                        background: `${color}15`,
                                        border: `1px solid ${color}40`,
                                        color, borderRadius: '10px',
                                        fontWeight: 600, fontSize: '0.875rem',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}>{label}</button>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}

                {/* ATTENDANCE TAB */}
                {tab === 'attendance' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>All Attendance Records</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        {['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'].map(h => (
                                            <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.map(record => (
                                        <tr key={record._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '0.875rem 1rem' }}>
                                                <div style={{ fontWeight: 500 }}>{record.employee?.name || 'Unknown'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{record.employee?.email}</div>
                                            </td>
                                            <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{record.date}</td>
                                            <td style={{ padding: '0.875rem 1rem', color: 'var(--success)', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>
                                                {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}
                                            </td>
                                            <td style={{ padding: '0.875rem 1rem', color: 'var(--danger)', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>
                                                {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}
                                            </td>
                                            <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{record.workingHours}h</td>
                                            <td style={{ padding: '0.875rem 1rem' }}>
                                                <Badge color={record.checkOut ? 'var(--success)' : 'var(--warning)'}>
                                                    {record.checkOut ? 'Complete' : 'Incomplete'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* EMPLOYEES TAB */}
                {tab === 'employees' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>All Employees</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {employees.map(emp => (
                                <div key={emp._id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px', border: '1px solid var(--border)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: 'var(--accent)', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontWeight: 700, fontSize: '1rem',
                                        }}>{emp.name[0]}</div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{emp.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{emp.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <Badge color={emp.role === 'admin' ? 'var(--accent)' : 'var(--success)'}>{emp.role}</Badge>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--mono)' }}>
                                            {emp._id.slice(-6)}
                                        </div>
                                        <button onClick={() => handleDeleteEmployee(emp._id)} style={{
                                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                            color: 'var(--danger)', padding: '0.4rem 0.75rem', borderRadius: '7px',
                                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                        }}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* TASKS TAB */}
                {tab === 'tasks' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem' }}>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>All Tasks</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {tasks.map(task => (
                                    <div key={task._id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '1rem', background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '10px', border: '1px solid var(--border)',
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{task.description}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                {task.employee?.name} • {task.date}
                                            </div>
                                        </div>
                                        <Badge color={task.completed ? 'var(--success)' : 'var(--warning)'}>
                                            {task.completed ? 'Done' : 'Pending'}
                                        </Badge>
                                    </div>
                                ))}
                                {tasks.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No tasks yet</p>}
                            </div>
                        </Card>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.5rem' }}>Assign Task</h3>
                            <form onSubmit={handleCreateTask}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</label>
                                    <select value={taskForm.employee} onChange={e => setTaskForm({ ...taskForm, employee: e.target.value })} required
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}>
                                        <option value="" style={{ background: '#0f1c2e' }}>Select employee</option>
                                        {employees.map(e => <option key={e._id} value={e._id} style={{ background: '#0f1c2e' }}>{e.name}</option>)}
                                    </select>
                                </div>
                                <Input label="Date" type="date" value={taskForm.date} onChange={e => setTaskForm({ ...taskForm, date: e.target.value })} required />
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                                    <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} required rows={3}
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'var(--font)' }} />
                                </div>
                                <button type="submit" style={{ width: '100%', padding: '0.875rem', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>Assign Task</button>
                            </form>
                        </Card>
                    </div>
                )}

                {/* LEAVES TAB */}
                {tab === 'leaves' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Leave Requests</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {leaves.map(leave => (
                                <div key={leave._id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px', border: '1px solid var(--border)',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{leave.employee?.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                            {leave.type} • {leave.startDate} → {leave.endDate}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{leave.reason}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Badge color={leave.status === 'approved' ? 'var(--success)' : leave.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'}>
                                            {leave.status}
                                        </Badge>
                                        {leave.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleLeaveStatus(leave._id, 'approved')} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: 'var(--success)', padding: '0.4rem 0.75rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                                                <button onClick={() => handleLeaveStatus(leave._id, 'rejected')} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', padding: '0.4rem 0.75rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {leaves.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No leave requests</p>}
                        </div>
                    </Card>
                )}

                {/* SALARY TAB */}
                {tab === 'salary' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem' }}>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Salary Records</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            {['Employee', 'Month', 'Basic', 'Bonus', 'Deductions', 'Net', 'Status', ''].map(h => (
                                                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salaries.map(s => (
                                            <tr key={s._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <div style={{ fontWeight: 500 }}>{s.employee?.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.employee?.email}</div>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{s.month}</td>
                                                <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>₹{s.basicSalary.toLocaleString()}</td>
                                                <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--success)' }}>+₹{s.bonus.toLocaleString()}</td>
                                                <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--danger)' }}>-₹{s.deductions.toLocaleString()}</td>
                                                <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>₹{s.netSalary.toLocaleString()}</td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    <Badge color={s.status === 'paid' ? 'var(--success)' : 'var(--warning)'}>{s.status}</Badge>
                                                </td>
                                                <td style={{ padding: '0.875rem 1rem' }}>
                                                    {s.status === 'pending' && (
                                                        <button onClick={() => handleSalaryStatus(s._id, 'paid')} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: 'var(--success)', padding: '0.4rem 0.75rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Mark Paid</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {salaries.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No salary records</p>}
                            </div>
                        </Card>

                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.5rem' }}>Add Salary Record</h3>
                            <form onSubmit={handleCreateSalary}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</label>
                                    <select value={salaryForm.employee} onChange={e => setSalaryForm({ ...salaryForm, employee: e.target.value })} required
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}>
                                        <option value="" style={{ background: '#0f1c2e' }}>Select employee</option>
                                        {employees.map(e => <option key={e._id} value={e._id} style={{ background: '#0f1c2e' }}>{e.name}</option>)}
                                    </select>
                                </div>
                                <Input label="Month (e.g. 2026-03)" type="month" value={salaryForm.month} onChange={e => setSalaryForm({ ...salaryForm, month: e.target.value })} required />
                                <Input label="Basic Salary (₹)" type="number" value={salaryForm.basicSalary} onChange={e => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })} required placeholder="50000" />
                                <Input label="Bonus (₹)" type="number" value={salaryForm.bonus} onChange={e => setSalaryForm({ ...salaryForm, bonus: e.target.value })} placeholder="0" />
                                <Input label="Deductions (₹)" type="number" value={salaryForm.deductions} onChange={e => setSalaryForm({ ...salaryForm, deductions: e.target.value })} placeholder="0" />
                                <button type="submit" style={{ width: '100%', padding: '0.875rem', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>Add Record</button>
                            </form>
                        </Card>
                    </div>
                )}

                {/* PRODUCTIVITY TAB */}
                {tab === 'productivity' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Employee Productivity Scores</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            Score = Tasks Completed ÷ Working Hours
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {['Employee', 'Working Hours', 'Tasks Completed', 'Productivity Score', 'Performance'].map(h => (
                                        <th key={h} style={{
                                            padding: '0.75rem 1rem', textAlign: 'left',
                                            color: 'var(--text-secondary)', fontWeight: 600,
                                            fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {productivityData.map((p, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '34px', height: '34px', borderRadius: '50%',
                                                    background: 'var(--accent)', display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                                                }}>{p.name?.[0]}</div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)' }}>{p.totalWorkingHours}h</td>
                                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)' }}>{p.completedTasks}</td>
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <span style={{
                                                padding: '0.35rem 0.85rem', borderRadius: '999px',
                                                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '0.85rem',
                                                background: p.productivityScore >= 1 ? 'rgba(16,185,129,0.15)' : p.productivityScore > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.1)',
                                                color: p.productivityScore >= 1 ? 'var(--success)' : p.productivityScore > 0 ? 'var(--warning)' : 'var(--danger)',
                                                border: `1px solid ${p.productivityScore >= 1 ? 'rgba(16,185,129,0.4)' : p.productivityScore > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.3)'}`,
                                            }}>{p.productivityScore}</span>
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <Badge color={p.productivityScore >= 1 ? 'var(--success)' : p.productivityScore > 0 ? 'var(--warning)' : 'var(--danger)'}>
                                                {p.productivityScore >= 1 ? '🔥 High' : p.productivityScore > 0 ? '⚡ Medium' : '📉 Low'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {productivityData.length === 0 && (
                                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No data yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </Card>
                )}

            </div>
        </div>
    );
};

export default AdminDashboard;