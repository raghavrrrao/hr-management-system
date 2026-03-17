import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { getAllBurnoutScores } from '../api/burnout';
import BurnoutDashboard from './BurnoutDashboard';

// ── Responsive hook ──────────────────────────────────────────────────────────
const useWindowWidth = () => {
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handler = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return width;
};

// ── Shared components ────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
    <div style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.85)',
        borderRadius: '16px', padding: '1.5rem',
        boxShadow: '0 4px 24px rgba(46,125,247,0.08)',
        ...style
    }}>{children}</div>
);

const Badge = ({ children, color }) => (
    <span style={{
        padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem',
        fontWeight: 600, background: `${color}18`, color, border: `1px solid ${color}35`,
        whiteSpace: 'nowrap',
    }}>{children}</span>
);

const TABS = [
    'analytics', 'attendance', 'employees', 'tasks',
    'leaves', 'salary', 'productivity', 'predictions', 'burnout'
];
const COLORS = ['#2e7df7', '#10b981', '#f59e0b', '#ef4444'];

// ── Mobile card renderer for tables ─────────────────────────────────────────
const MobileAttendanceCard = ({ record }) => (
    <div style={{
        padding: '1rem', background: 'rgba(241,245,249,0.7)',
        borderRadius: '12px', border: '1px solid rgba(226,232,240,0.7)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{record.employee?.name || 'Unknown'}</div>
            <Badge color={record.checkOut ? '#10b981' : '#f59e0b'}>{record.checkOut ? 'Complete' : 'Incomplete'}</Badge>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{record.employee?.email}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
            {[
                { label: 'Date', value: record.date },
                { label: 'In', value: record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-' },
                { label: 'Out', value: record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-' },
            ].map(({ label, value }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '0.4rem 0.6rem' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>{value}</div>
                </div>
            ))}
        </div>
    </div>
);

// ── Main component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const width = useWindowWidth();
    const isMobile = width < 640;
    const isTablet = width < 1024;

    const [tab, setTab] = useState('analytics');
    const [attendance, setAttendance] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [productivityData, setProductivityData] = useState([]);
    const [burnoutSummary, setBurnoutSummary] = useState(null);
    const [message, setMessage] = useState('');
    const [settingOffice, setSettingOffice] = useState(false);

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

            const predResults = await Promise.all(
                empRes.data.map(emp =>
                    API.get(`/predictions/${emp._id}`)
                        .then(r => ({ ...r.data, name: emp.name, email: emp.email }))
                        .catch(() => ({ name: emp.name, email: emp.email, prediction: 'Unavailable', riskScore: 0 }))
                )
            );
            setPredictions(predResults);
            setLeaves(leaveRes.data);
            setSalaries(salaryRes.data);

            const prodScores = await Promise.all(
                empRes.data.map(emp =>
                    API.get(`/productivity/${emp._id}`)
                        .then(r => ({ ...r.data, name: emp.name, email: emp.email }))
                        .catch(() => ({ name: emp.name, email: emp.email, productivityScore: 0, completedTasks: 0, totalWorkingHours: '0.00' }))
                )
            );
            setProductivityData(prodScores);

            // Fetch burnout summary for the stat card
            getAllBurnoutScores()
                .then(res => setBurnoutSummary(res.data.summary))
                .catch(() => { });
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, []);

    const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3500); };

    const handleSetOfficeLocation = () => {
        if (!navigator.geolocation) { showMessage('❌ Geolocation not supported'); return; }
        setSettingOffice(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude: lat, longitude: lng } = position.coords;
                try {
                    await API.post('/admin/office-location', { lat, lng });
                    showMessage(`✅ Office location set! (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
                } catch (err) { showMessage(`❌ ${err.response?.data?.message || 'Failed'}`); }
                setSettingOffice(false);
            },
            () => { showMessage('❌ Could not get location. Allow access and retry.'); setSettingOffice(false); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handlePromote = async (id, currentRole) => {
        const newRole = currentRole === 'admin' ? 'employee' : 'admin';
        if (!confirm(`Change role to ${newRole}?`)) return;
        try {
            await API.put(`/admin/promote/${id}`, { role: newRole });
            showMessage(`✅ Role updated to ${newRole}`); fetchData();
        } catch (err) { showMessage(`❌ ${err.response?.data?.message || 'Error'}`); }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await API.post('/tasks', taskForm);
            showMessage('✅ Task assigned!');
            setTaskForm({ employee: '', date: '', description: '' }); fetchData();
        } catch (err) { showMessage(`❌ ${err.response?.data?.message || 'Error'}`); }
    };

    const handleCreateSalary = async (e) => {
        e.preventDefault();
        try {
            await API.post('/salary', { ...salaryForm, basicSalary: Number(salaryForm.basicSalary), bonus: Number(salaryForm.bonus), deductions: Number(salaryForm.deductions) });
            showMessage('✅ Salary record created!');
            setSalaryForm({ employee: '', month: '', basicSalary: '', bonus: '', deductions: '' }); fetchData();
        } catch (err) { showMessage(`❌ ${err.response?.data?.message || 'Error'}`); }
    };

    const handleLeaveStatus = async (id, status) => {
        try { await API.put(`/leaves/${id}`, { status }); showMessage(`✅ Leave ${status}!`); fetchData(); }
        catch { showMessage('❌ Error'); }
    };

    const handleSalaryStatus = async (id, status) => {
        try { await API.put(`/salary/${id}`, { status }); showMessage(`✅ Salary marked ${status}!`); fetchData(); }
        catch { showMessage('❌ Error'); }
    };

    const handleDeleteEmployee = async (id) => {
        if (!confirm('Delete this employee?')) return;
        try { await API.delete(`/employees/${id}`); showMessage('✅ Employee deleted!'); fetchData(); }
        catch { showMessage('❌ Error'); }
    };

    const handleExport = async (type) => {
        try {
            const token = localStorage.getItem('token');
            const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${baseURL}/reports/${type}`, { headers: { Authorization: `Bearer ${token}` } });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${type}-report.csv`; a.click();
            window.URL.revokeObjectURL(url);
            showMessage(`✅ ${type} report downloaded!`);
        } catch { showMessage('❌ Export failed'); }
    };

    // ── Derived data ─────────────────────────────────────────────────────────
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

    // ── Styles ────────────────────────────────────────────────────────────────
    const btnStyle = (active) => ({
        padding: '0.55rem 1rem', borderRadius: '8px',
        fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 600,
        background: active ? '#2e7df7' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${active ? '#2e7df7' : 'rgba(203,213,225,0.8)'}`,
        color: active ? 'white' : '#64748b',
        backdropFilter: 'blur(8px)',
        textTransform: 'capitalize', transition: 'all 0.2s', cursor: 'pointer',
        whiteSpace: 'nowrap',
    });

    const inputStyle = {
        width: '100%', padding: '0.75rem 1rem',
        background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(203,213,225,0.8)',
        borderRadius: '10px', color: '#0f172a', fontSize: '0.875rem', outline: 'none',
        boxSizing: 'border-box',
    };
    const labelStyle = {
        display: 'block', fontSize: '0.75rem', fontWeight: 700,
        color: '#64748b', marginBottom: '0.4rem',
        textTransform: 'uppercase', letterSpacing: '0.06em',
    };
    const thStyle = {
        padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b',
        fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase',
        letterSpacing: '0.05em', whiteSpace: 'nowrap',
    };
    const tdStyle = { padding: '0.875rem 1rem', whiteSpace: 'nowrap' };

    // Stats cards config — includes burnout high-risk card
    const statCards = [
        { label: 'Employees', value: employees.length, color: '#2e7df7' },
        { label: 'Present Today', value: todayAttendance.length, color: '#10b981' },
        { label: 'Total Tasks', value: tasks.length, color: '#f59e0b' },
        { label: 'Pending Tasks', value: tasks.filter(t => !t.completed).length, color: '#ef4444' },
        { label: 'Pending Leaves', value: pendingLeaves, color: '#a78bfa' },
        { label: 'Pending Salaries', value: pendingSalaries, color: '#fb923c' },
        { label: '🔥 High Risk', value: burnoutSummary?.high ?? '—', color: '#ef4444', tab: 'burnout' },
    ];

    // Grid columns responsive helper
    const statCols = isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(4, 1fr)' : 'repeat(7, 1fr)';
    const analyticsCols = isMobile ? '1fr' : isTablet ? '1fr' : '1fr 1fr 1fr';

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 60%, #e0e7ff 100%)' }}>
            <Navbar />
            <div style={{ maxWidth: '1300px', margin: '0 auto', padding: isMobile ? '1rem' : '2rem' }}>

                {/* Toast message */}
                {message && (
                    <div style={{
                        background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${message.includes('✅') ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
                        color: message.includes('✅') ? '#059669' : '#dc2626',
                        padding: '0.875rem 1.25rem', borderRadius: '12px',
                        marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 500,
                        backdropFilter: 'blur(8px)',
                    }}>{message}</div>
                )}

                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    marginBottom: '1.5rem', gap: '0.75rem',
                }}>
                    <div>
                        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a', margin: 0 }}>
                            Admin Dashboard
                        </h2>
                        <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.875rem' }}>Manage your team</p>
                    </div>
                    <button
                        onClick={handleSetOfficeLocation}
                        disabled={settingOffice}
                        style={{
                            padding: '0.65rem 1.25rem', alignSelf: isMobile ? 'flex-start' : 'auto',
                            background: settingOffice ? 'rgba(241,245,249,0.8)' : 'rgba(46,125,247,0.1)',
                            border: '1px solid rgba(46,125,247,0.3)',
                            color: settingOffice ? '#94a3b8' : '#2e7df7',
                            borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem',
                            cursor: settingOffice ? 'not-allowed' : 'pointer',
                            backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
                        }}>
                        {settingOffice ? '📍 Detecting...' : '📍 Set Office Location'}
                    </button>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: statCols, gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {statCards.map(({ label, value, color, tab: cardTab }) => (
                        <Card
                            key={label}
                            style={{
                                padding: '1rem',
                                cursor: cardTab ? 'pointer' : 'default',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                ...(cardTab === 'burnout' ? { border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(255,242,242,0.7)' } : {}),
                            }}
                            onClick={cardTab ? () => setTab(cardTab) : undefined}
                        >
                            <div style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 700, color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{value}</div>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.4rem', fontWeight: 500 }}>{label}</div>
                        </Card>
                    ))}
                </div>

                {/* Tabs — horizontally scrollable on mobile */}
                <div style={{
                    display: 'flex', gap: '0.4rem', marginBottom: '1.5rem',
                    overflowX: 'auto', paddingBottom: '4px',
                    scrollbarWidth: 'none', msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {TABS.map(t => (
                        <button key={t} onClick={() => setTab(t)} style={btnStyle(tab === t)}>
                            {t === 'burnout' ? '🧠 Burnout' : t}
                        </button>
                    ))}
                </div>

                {/* ── ANALYTICS TAB ── */}
                {tab === 'analytics' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: analyticsCols, gap: '1.25rem' }}>

                            {/* Attendance chart — full width on mobile, spans 2 on desktop */}
                            <Card style={!isMobile && !isTablet ? { gridColumn: 'span 2' } : {}}>
                                <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', color: '#0f172a' }}>Attendance (Last 7 Days)</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={attendanceChartData}>
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                                        <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} width={24} />
                                        <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }} />
                                        <Bar dataKey="count" fill="#2e7df7" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>

                            {/* Task Status pie */}
                            <Card>
                                <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', color: '#0f172a' }}>Task Status</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={4}>
                                            {taskPieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                        <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#64748b' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Card>

                            {/* Leave Overview — full width on mobile, spans 2 on desktop */}
                            <Card style={!isMobile && !isTablet ? { gridColumn: 'span 2' } : {}}>
                                <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', color: '#0f172a' }}>Leave Requests Overview</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={leavePieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={4}>
                                            {leavePieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                        <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#64748b' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Card>

                            {/* Quick Stats */}
                            <Card>
                                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem', color: '#0f172a' }}>Quick Stats</h3>
                                {[
                                    { label: 'Total Payroll', value: `₹${salaries.reduce((s, r) => s + r.netSalary, 0).toLocaleString()}` },
                                    { label: 'Paid Salaries', value: salaries.filter(s => s.status === 'paid').length },
                                    { label: 'Approved Leaves', value: leaves.filter(l => l.status === 'approved').length },
                                    { label: 'Attendance Records', value: attendance.length },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid rgba(226,232,240,0.7)' }}>
                                        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{label}</span>
                                        <span style={{ fontWeight: 600, fontFamily: 'var(--mono)', fontSize: '0.9rem', color: '#0f172a' }}>{value}</span>
                                    </div>
                                ))}
                            </Card>
                        </div>

                        {/* Export Reports */}
                        <Card style={{ marginTop: '1.25rem' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', color: '#0f172a' }}>📥 Export Reports</h3>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {[
                                    { type: 'attendance', label: '📋 Attendance Report', color: '#2e7df7' },
                                    { type: 'salary', label: '💰 Salary Report', color: '#10b981' },
                                    { type: 'productivity', label: '📊 Productivity Report', color: '#a78bfa' },
                                ].map(({ type, label, color }) => (
                                    <button key={type} onClick={() => handleExport(type)} style={{
                                        padding: '0.7rem 1.25rem',
                                        background: `${color}12`, border: `1px solid ${color}35`,
                                        color, borderRadius: '10px', fontWeight: 600,
                                        fontSize: '0.875rem', cursor: 'pointer',
                                        flex: isMobile ? '1 1 calc(50% - 0.375rem)' : 'none',
                                    }}>{label}</button>
                                ))}
                            </div>
                        </Card>
                    </>
                )}

                {/* ── ATTENDANCE TAB ── */}
                {tab === 'attendance' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a' }}>All Attendance Records</h3>
                        {isMobile ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {attendance.map(record => <MobileAttendanceCard key={record._id} record={record} />)}
                                {attendance.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No records yet</p>}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
                                            {['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.map(record => (
                                            <tr key={record._id} style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 500, color: '#0f172a' }}>{record.employee?.name || 'Unknown'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{record.employee?.email}</div>
                                                </td>
                                                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#0f172a' }}>{record.date}</td>
                                                <td style={{ ...tdStyle, color: '#10b981', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}</td>
                                                <td style={{ ...tdStyle, color: '#ef4444', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}</td>
                                                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#0f172a' }}>{record.workingHours}h</td>
                                                <td style={tdStyle}><Badge color={record.checkOut ? '#10b981' : '#f59e0b'}>{record.checkOut ? 'Complete' : 'Incomplete'}</Badge></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {/* ── EMPLOYEES TAB ── */}
                {tab === 'employees' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a' }}>All Employees</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {employees.map(emp => (
                                <div key={emp._id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1rem', background: 'rgba(241,245,249,0.7)',
                                    borderRadius: '12px', border: '1px solid rgba(226,232,240,0.7)',
                                    flexWrap: 'wrap', gap: '0.75rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                        <div style={{
                                            width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                                            background: emp.role === 'admin' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#2e7df7,#1a6ae0)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: '1rem', color: 'white',
                                        }}>{emp.name[0]}</div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{emp.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '160px' : 'none' }}>{emp.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <Badge color={emp.role === 'admin' ? '#ef4444' : '#10b981'}>{emp.role}</Badge>
                                        <button onClick={() => handlePromote(emp._id, emp.role)} style={{
                                            background: emp.role === 'admin' ? 'rgba(239,68,68,0.08)' : 'rgba(46,125,247,0.08)',
                                            border: `1px solid ${emp.role === 'admin' ? 'rgba(239,68,68,0.25)' : 'rgba(46,125,247,0.25)'}`,
                                            color: emp.role === 'admin' ? '#ef4444' : '#2e7df7',
                                            padding: '0.35rem 0.75rem', borderRadius: '7px',
                                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                        }}>
                                            {emp.role === 'admin' ? '⬇ Demote' : '⬆ Promote'}
                                        </button>
                                        <button onClick={() => handleDeleteEmployee(emp._id)} style={{
                                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                                            color: '#ef4444', padding: '0.35rem 0.75rem', borderRadius: '7px',
                                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                        }}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* ── TASKS TAB ── */}
                {tab === 'tasks' && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : '1fr 380px', gap: '1.25rem' }}>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a' }}>All Tasks</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {tasks.map(task => (
                                    <div key={task._id} style={{
                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                                        padding: '0.875rem 1rem', background: 'rgba(241,245,249,0.7)',
                                        borderRadius: '10px', border: '1px solid rgba(226,232,240,0.7)',
                                        gap: '0.75rem', flexWrap: 'wrap',
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#0f172a' }}>{task.description}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{task.employee?.name} • {task.date}</div>
                                        </div>
                                        <Badge color={task.completed ? '#10b981' : '#f59e0b'}>{task.completed ? 'Done' : 'Pending'}</Badge>
                                    </div>
                                ))}
                                {tasks.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No tasks yet</p>}
                            </div>
                        </Card>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.5rem', color: '#0f172a' }}>Assign Task</h3>
                            <form onSubmit={handleCreateTask}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={labelStyle}>Employee</label>
                                    <select value={taskForm.employee} onChange={e => setTaskForm({ ...taskForm, employee: e.target.value })} required style={inputStyle}>
                                        <option value="">Select employee</option>
                                        {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={labelStyle}>Date</label>
                                    <input type="date" value={taskForm.date} onChange={e => setTaskForm({ ...taskForm, date: e.target.value })} required style={{ ...inputStyle, colorScheme: 'light' }} />
                                </div>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={labelStyle}>Description</label>
                                    <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} required rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                                </div>
                                <button type="submit" style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg,#2e7df7,#1a6ae0)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(46,125,247,0.25)' }}>Assign Task</button>
                            </form>
                        </Card>
                    </div>
                )}

                {/* ── LEAVES TAB ── */}
                {tab === 'leaves' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a' }}>Leave Requests</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {leaves.map(leave => (
                                <div key={leave._id} style={{
                                    padding: '1rem 1.25rem', background: 'rgba(241,245,249,0.7)',
                                    borderRadius: '12px', border: '1px solid rgba(226,232,240,0.7)',
                                    display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                                    alignItems: isMobile ? 'flex-start' : 'center',
                                    justifyContent: 'space-between', gap: '0.75rem',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{leave.employee?.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{leave.type} • {leave.startDate} → {leave.endDate}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{leave.reason}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <Badge color={leave.status === 'approved' ? '#10b981' : leave.status === 'rejected' ? '#ef4444' : '#f59e0b'}>{leave.status}</Badge>
                                        {leave.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleLeaveStatus(leave._id, 'approved')} style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '0.35rem 0.75rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                                                <button onClick={() => handleLeaveStatus(leave._id, 'rejected')} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '0.35rem 0.75rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {leaves.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No leave requests</p>}
                        </div>
                    </Card>
                )}

                {/* ── SALARY TAB ── */}
                {tab === 'salary' && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : 'minmax(0,1fr) minmax(300px,400px)', gap: '1.25rem', alignItems: 'start' }}>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a' }}>Salary Records</h3>
                            {isMobile ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {salaries.map(s => (
                                        <div key={s._id} style={{ padding: '1rem', background: 'rgba(241,245,249,0.7)', borderRadius: '12px', border: '1px solid rgba(226,232,240,0.7)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.employee?.name}</div>
                                                <Badge color={s.status === 'paid' ? '#10b981' : '#f59e0b'}>{s.status}</Badge>
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>{s.month}</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                                                <div><span style={{ color: '#64748b' }}>Basic: </span><span style={{ fontWeight: 600 }}>₹{s.basicSalary.toLocaleString()}</span></div>
                                                <div><span style={{ color: '#64748b' }}>Bonus: </span><span style={{ fontWeight: 600, color: '#10b981' }}>+₹{s.bonus.toLocaleString()}</span></div>
                                                <div><span style={{ color: '#64748b' }}>Ded: </span><span style={{ fontWeight: 600, color: '#ef4444' }}>-₹{s.deductions.toLocaleString()}</span></div>
                                                <div><span style={{ color: '#64748b' }}>Net: </span><span style={{ fontWeight: 700, color: '#2e7df7' }}>₹{s.netSalary.toLocaleString()}</span></div>
                                            </div>
                                            {s.status === 'pending' && (
                                                <button onClick={() => handleSalaryStatus(s._id, 'paid')} style={{ marginTop: '0.75rem', width: '100%', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '0.5rem', borderRadius: '7px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Mark Paid</button>
                                            )}
                                        </div>
                                    ))}
                                    {salaries.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No salary records</p>}
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
                                                {['Employee', 'Month', 'Basic', 'Bonus', 'Deductions', 'Net', 'Status', ''].map(h => (
                                                    <th key={h} style={thStyle}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {salaries.map(s => (
                                                <tr key={s._id} style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                                                    <td style={tdStyle}>
                                                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{s.employee?.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.employee?.email}</div>
                                                    </td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{s.month}</td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>₹{s.basicSalary.toLocaleString()}</td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#10b981' }}>+₹{s.bonus.toLocaleString()}</td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#ef4444' }}>-₹{s.deductions.toLocaleString()}</td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 700, color: '#2e7df7' }}>₹{s.netSalary.toLocaleString()}</td>
                                                    <td style={tdStyle}><Badge color={s.status === 'paid' ? '#10b981' : '#f59e0b'}>{s.status}</Badge></td>
                                                    <td style={tdStyle}>
                                                        {s.status === 'pending' && (
                                                            <button onClick={() => handleSalaryStatus(s._id, 'paid')} style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '0.4rem 0.75rem', borderRadius: '7px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Mark Paid</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {salaries.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No salary records</p>}
                                </div>
                            )}
                        </Card>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.5rem', color: '#0f172a' }}>Add Salary Record</h3>
                            <form onSubmit={handleCreateSalary}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={labelStyle}>Employee</label>
                                    <select value={salaryForm.employee} onChange={e => setSalaryForm({ ...salaryForm, employee: e.target.value })} required style={inputStyle}>
                                        <option value="">Select employee</option>
                                        {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                                    </select>
                                </div>
                                {[
                                    { key: 'month', label: 'Month', type: 'month' },
                                    { key: 'basicSalary', label: 'Basic Salary (₹)', type: 'number', placeholder: '50000' },
                                    { key: 'bonus', label: 'Bonus (₹)', type: 'number', placeholder: '0' },
                                    { key: 'deductions', label: 'Deductions (₹)', type: 'number', placeholder: '0' },
                                ].map(({ key, label, type, placeholder }) => (
                                    <div key={key} style={{ marginBottom: '1rem' }}>
                                        <label style={labelStyle}>{label}</label>
                                        <input type={type} value={salaryForm[key]} onChange={e => setSalaryForm({ ...salaryForm, [key]: e.target.value })} required={key !== 'bonus' && key !== 'deductions'} placeholder={placeholder} style={{ ...inputStyle, colorScheme: 'light' }} />
                                    </div>
                                ))}
                                <button type="submit" style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg,#2e7df7,#1a6ae0)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(46,125,247,0.25)' }}>Add Record</button>
                            </form>
                        </Card>
                    </div>
                )}

                {/* ── PRODUCTIVITY TAB ── */}
                {tab === 'productivity' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#0f172a' }}>Employee Productivity Scores</h3>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Score = Tasks Completed ÷ Working Hours</p>
                        {isMobile ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {productivityData.map((p, i) => {
                                    const color = p.productivityScore >= 1 ? '#10b981' : p.productivityScore > 0 ? '#f59e0b' : '#ef4444';
                                    return (
                                        <div key={i} style={{ padding: '1rem', background: 'rgba(241,245,249,0.7)', borderRadius: '12px', border: '1px solid rgba(226,232,240,0.7)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                                                <Badge color={color}>{p.productivityScore >= 1 ? '🔥 High' : p.productivityScore > 0 ? '⚡ Medium' : '📉 Low'}</Badge>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                                                <div><div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>HOURS</div><div style={{ fontWeight: 600 }}>{p.totalWorkingHours}h</div></div>
                                                <div><div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>TASKS</div><div style={{ fontWeight: 600 }}>{p.completedTasks}</div></div>
                                                <div><div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>SCORE</div><div style={{ fontWeight: 700, color }}>{p.productivityScore}</div></div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {productivityData.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No data yet</p>}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
                                            {['Employee', 'Working Hours', 'Tasks Completed', 'Score', 'Performance'].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productivityData.map((p, i) => {
                                            const color = p.productivityScore >= 1 ? '#10b981' : p.productivityScore > 0 ? '#f59e0b' : '#ef4444';
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#2e7df7,#1a6ae0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'white', flexShrink: 0 }}>{p.name?.[0]}</div>
                                                            <div>
                                                                <div style={{ fontWeight: 500, color: '#0f172a' }}>{p.name}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)', color: '#0f172a' }}>{p.totalWorkingHours}h</td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)', color: '#0f172a' }}>{p.completedTasks}</td>
                                                    <td style={tdStyle}><span style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '0.85rem', background: `${color}15`, color, border: `1px solid ${color}35` }}>{p.productivityScore}</span></td>
                                                    <td style={tdStyle}><Badge color={color}>{p.productivityScore >= 1 ? '🔥 High' : p.productivityScore > 0 ? '⚡ Medium' : '📉 Low'}</Badge></td>
                                                </tr>
                                            );
                                        })}
                                        {productivityData.length === 0 && (
                                            <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No data yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {/* ── PREDICTIONS TAB ── */}
                {tab === 'predictions' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>⚠ AI Productivity Risk Predictions</h3>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            Predicts which employees may struggle with deadlines based on tasks and attendance.
                        </p>
                        {isMobile ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {predictions.map((p, i) => {
                                    const color = p.riskScore > 70 ? '#ef4444' : p.riskScore > 40 ? '#f59e0b' : '#10b981';
                                    return (
                                        <div key={i} style={{ padding: '1rem', background: 'rgba(241,245,249,0.7)', borderRadius: '12px', border: '1px solid rgba(226,232,240,0.7)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                                                <Badge color={color}>{p.prediction}</Badge>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                                                <div><span style={{ color: '#64748b' }}>Hours: </span><span style={{ fontWeight: 600 }}>{p.totalHours?.toFixed(2)}h</span></div>
                                                <div><span style={{ color: '#64748b' }}>Tasks: </span><span style={{ fontWeight: 600 }}>{p.completedTasks}/{p.totalTasks}</span></div>
                                                <div><span style={{ color: '#64748b' }}>Rate: </span><span style={{ fontWeight: 600 }}>{(p.completionRate * 100).toFixed(0)}%</span></div>
                                                <div><span style={{ color: '#64748b' }}>Risk: </span><span style={{ fontWeight: 700, color }}>{p.riskScore}</span></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
                                            {['Employee', 'Working Hours', 'Tasks', 'Completion', 'Risk Score', 'Prediction'].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {predictions.map((p, i) => {
                                            const color = p.riskScore > 70 ? '#ef4444' : p.riskScore > 40 ? '#f59e0b' : '#10b981';
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                                                    <td style={tdStyle}><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.email}</div></td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>{p.totalHours?.toFixed(2)}h</td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>{p.completedTasks}/{p.totalTasks}</td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--mono)' }}>{(p.completionRate * 100).toFixed(0)}%</td>
                                                    <td style={tdStyle}><span style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}35` }}>{p.riskScore}</span></td>
                                                    <td style={tdStyle}><Badge color={color}>{p.prediction}</Badge></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {/* ── BURNOUT TAB ── */}
                {tab === 'burnout' && <BurnoutDashboard />}

            </div>
        </div>
    );
};

export default AdminDashboard;