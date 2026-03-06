import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import API from '../api/axios';

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
        fontWeight: 600, background: `${color}18`, color, border: `1px solid ${color}35`
    }}>{children}</span>
);

const TABS = ['overview', 'attendance', 'tasks', 'leaves', 'salary'];

const EmployeeDashboard = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState('overview');
    const [attendance, setAttendance]     = useState([]);
    const [tasks, setTasks]               = useState([]);
    const [leaves, setLeaves]             = useState([]);
    const [salaries, setSalaries]         = useState([]);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [productivity, setProductivity] = useState(null);
    const [loading, setLoading]           = useState(false);
    const [locating, setLocating]         = useState(false);
    const [message, setMessage]           = useState('');
    const [leaveForm, setLeaveForm]       = useState({ type: 'casual', startDate: '', endDate: '', reason: '' });

    const today = new Date().toISOString().split('T')[0];

    const fetchData = async () => {
        try {
            const [attRes, taskRes, leaveRes, salaryRes] = await Promise.all([
                API.get('/attendance/my'),
                API.get('/tasks/my'),
                API.get('/leaves/my'),
                API.get('/salary/my'),
            ]);
            setAttendance(attRes.data);
            setTasks(taskRes.data);
            setLeaves(leaveRes.data);
            setSalaries(salaryRes.data);
            setTodayAttendance(attRes.data.find(a => a.date === today) || null);

            if (user?._id) {
                const prodRes = await API.get(`/productivity/${user._id}`);
                setProductivity(prodRes.data);
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, []);

    const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

    // ── Geo check-in ──
    const handleCheckIn = async () => {
        setLocating(true);
        if (!navigator.geolocation) {
            showMessage('❌ Geolocation is not supported by your browser');
            setLocating(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude: lat, longitude: lng } = position.coords;
                try {
                    await API.post('/attendance/checkin', { lat, lng });
                    showMessage('✅ Checked in successfully!');
                    fetchData();
                } catch (err) {
                    showMessage(`❌ ${err.response?.data?.message || 'Check-in failed'}`);
                }
                setLocating(false);
                setLoading(false);
            },
            (err) => {
                if (err.code === 1) showMessage('❌ Location permission denied. Please allow location access.');
                else if (err.code === 2) showMessage('❌ Unable to detect your location. Try again.');
                else showMessage('❌ Location request timed out. Try again.');
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleCheckOut = async () => {
        setLoading(true);
        try {
            await API.post('/attendance/checkout');
            showMessage('✅ Checked out!');
            fetchData();
        } catch (err) {
            showMessage(`❌ ${err.response?.data?.message || 'Error'}`);
        }
        setLoading(false);
    };

    const handleTaskToggle = async (task) => {
        try { await API.put(`/tasks/${task._id}`, { completed: !task.completed }); fetchData(); }
        catch (err) { console.error(err); }
    };

    const handleLeaveApply = async (e) => {
        e.preventDefault();
        try {
            await API.post('/leaves', leaveForm);
            showMessage('✅ Leave applied!');
            setLeaveForm({ type: 'casual', startDate: '', endDate: '', reason: '' });
            fetchData();
        } catch (err) { showMessage(`❌ ${err.response?.data?.message || 'Error'}`); }
    };

    const btnStyle = (active) => ({
        padding: '0.55rem 1.2rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
        background: active ? '#2e7df7' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${active ? '#2e7df7' : 'rgba(203,213,225,0.8)'}`,
        color: active ? 'white' : '#64748b',
        backdropFilter: 'blur(8px)',
        textTransform: 'capitalize', transition: 'all 0.2s', cursor: 'pointer',
    });

    const productivityColor = productivity?.productivityScore >= 1
        ? '#10b981' : productivity?.productivityScore > 0 ? '#f59e0b' : '#ef4444';

    const checkInBusy = loading || locating || !!todayAttendance;
    const checkOutBusy = loading || !todayAttendance || !!todayAttendance?.checkOut;

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 60%, #e0e7ff 100%)' }}>
            <Navbar />
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>

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

                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>
                        Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name} 👋
                    </h2>
                    <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Days Present',      value: attendance.length,                              color: '#2e7df7' },
                        { label: 'Pending Tasks',      value: tasks.filter(t => !t.completed).length,         color: '#f59e0b' },
                        { label: 'Productivity Score', value: productivity?.productivityScore ?? '—',          color: productivityColor },
                        { label: 'Latest Net Salary',  value: `₹${salaries[0]?.netSalary?.toLocaleString() || '0'}`, color: '#10b981' },
                    ].map(({ label, value, color }) => (
                        <Card key={label}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{value}</div>
                            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>{label}</div>
                        </Card>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={btnStyle(tab === t)}>{t}</button>)}
                </div>

                {/* OVERVIEW TAB */}
                {tab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', color: '#0f172a' }}>Today's Attendance</h3>
                            <div style={{ background: 'rgba(241,245,249,0.7)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(226,232,240,0.7)' }}>
                                {[
                                    { label: 'Check In',  value: todayAttendance?.checkIn  ? new Date(todayAttendance.checkIn).toLocaleTimeString()  : '--:--', color: '#10b981' },
                                    { label: 'Check Out', value: todayAttendance?.checkOut ? new Date(todayAttendance.checkOut).toLocaleTimeString() : '--:--', color: '#ef4444' },
                                    { label: 'Hours',     value: `${todayAttendance?.workingHours || '0.00'}h`,                                                 color: '#2e7df7' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{label}</span>
                                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem', color }}>{value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Geo check-in notice */}
                            {!todayAttendance && (
                                <div style={{
                                    background: 'rgba(46,125,247,0.07)', border: '1px solid rgba(46,125,247,0.2)',
                                    borderRadius: '10px', padding: '0.65rem 0.9rem',
                                    marginBottom: '1rem', fontSize: '0.8rem', color: '#2e7df7',
                                }}>
                                    📍 Your location will be verified when you check in (within 50m of office)
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <button
                                    onClick={handleCheckIn}
                                    disabled={checkInBusy}
                                    style={{
                                        padding: '0.75rem',
                                        background: checkInBusy ? 'rgba(241,245,249,0.8)' : 'rgba(16,185,129,0.12)',
                                        border: `1px solid ${checkInBusy ? 'rgba(226,232,240,0.8)' : 'rgba(16,185,129,0.35)'}`,
                                        color: checkInBusy ? '#94a3b8' : '#10b981',
                                        borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem',
                                        cursor: checkInBusy ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                    }}>
                                    {locating ? '📍 Locating...' : todayAttendance ? '✓ Checked In' : '📍 Check In'}
                                </button>
                                <button
                                    onClick={handleCheckOut}
                                    disabled={checkOutBusy}
                                    style={{
                                        padding: '0.75rem',
                                        background: checkOutBusy ? 'rgba(241,245,249,0.8)' : 'rgba(239,68,68,0.10)',
                                        border: `1px solid ${checkOutBusy ? 'rgba(226,232,240,0.8)' : 'rgba(239,68,68,0.35)'}`,
                                        color: checkOutBusy ? '#94a3b8' : '#ef4444',
                                        borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem',
                                        cursor: checkOutBusy ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                    }}>
                                    {loading ? 'Checking out...' : 'Check Out'}
                                </button>
                            </div>
                        </Card>

                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', color: '#0f172a' }}>My Tasks</h3>
                            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {tasks.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No tasks assigned</p>}
                                {tasks.slice(0, 5).map(task => (
                                    <div key={task._id} onClick={() => handleTaskToggle(task)} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                        padding: '0.875rem', background: 'rgba(241,245,249,0.7)',
                                        borderRadius: '10px', border: '1px solid rgba(226,232,240,0.7)', cursor: 'pointer',
                                    }}>
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, marginTop: '2px',
                                            background: task.completed ? '#10b981' : 'transparent',
                                            border: `2px solid ${task.completed ? '#10b981' : '#94a3b8'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {task.completed && <span style={{ fontSize: '10px', color: 'white' }}>✓</span>}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#94a3b8' : '#0f172a' }}>{task.description}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>{task.date}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Productivity */}
                        <Card style={{ gridColumn: 'span 2' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', color: '#0f172a' }}>My Productivity</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                {[
                                    { label: 'Total Working Hours', value: `${productivity?.totalWorkingHours || '0.00'}h`, color: '#2e7df7' },
                                    { label: 'Tasks Completed',     value: productivity?.completedTasks ?? 0,               color: '#10b981' },
                                    { label: 'Productivity Score',  value: productivity?.productivityScore ?? '—',           color: productivityColor },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ background: 'rgba(241,245,249,0.7)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(226,232,240,0.7)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{value}</div>
                                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.5rem' }}>{label}</div>
                                    </div>
                                ))}
                            </div>
                            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '1rem', textAlign: 'center' }}>
                                Score = Tasks Completed ÷ Working Hours
                            </p>
                        </Card>
                    </div>
                )}

                {/* ATTENDANCE TAB */}
                {tab === 'attendance' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a' }}>Attendance History</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
                                        {['Date', 'Check In', 'Check Out', 'Hours', 'Status'].map(h => (
                                            <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.map(record => (
                                        <tr key={record._id} style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                                            <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#0f172a' }}>{record.date}</td>
                                            <td style={{ padding: '0.875rem 1rem', color: '#10b981', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}</td>
                                            <td style={{ padding: '0.875rem 1rem', color: '#ef4444', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}</td>
                                            <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#0f172a' }}>{record.workingHours}h</td>
                                            <td style={{ padding: '0.875rem 1rem' }}>
                                                <Badge color={record.checkOut ? '#10b981' : '#f59e0b'}>{record.checkOut ? 'Complete' : 'Incomplete'}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* TASKS TAB */}
                {tab === 'tasks' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a' }}>My Tasks</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {tasks.map(task => (
                                <div key={task._id} onClick={() => handleTaskToggle(task)} style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                                    background: 'rgba(241,245,249,0.7)', borderRadius: '10px',
                                    border: '1px solid rgba(226,232,240,0.7)', cursor: 'pointer',
                                }}>
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                                        background: task.completed ? '#10b981' : 'transparent',
                                        border: `2px solid ${task.completed ? '#10b981' : '#94a3b8'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {task.completed && <span style={{ fontSize: '11px', color: 'white' }}>✓</span>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#94a3b8' : '#0f172a' }}>{task.description}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>{task.date}</div>
                                    </div>
                                    <Badge color={task.completed ? '#10b981' : '#f59e0b'}>{task.completed ? 'Done' : 'Pending'}</Badge>
                                </div>
                            ))}
                            {tasks.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No tasks assigned</p>}
                        </div>
                    </Card>
                )}

                {/* LEAVES TAB */}
                {tab === 'leaves' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a' }}>My Leave Requests</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {leaves.map(leave => (
                                    <div key={leave._id} style={{ padding: '1rem', background: 'rgba(241,245,249,0.7)', borderRadius: '10px', border: '1px solid rgba(226,232,240,0.7)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontWeight: 600, textTransform: 'capitalize', color: '#0f172a' }}>{leave.type} Leave</div>
                                            <Badge color={leave.status === 'approved' ? '#10b981' : leave.status === 'rejected' ? '#ef4444' : '#f59e0b'}>{leave.status}</Badge>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>{leave.startDate} → {leave.endDate}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>{leave.reason}</div>
                                    </div>
                                ))}
                                {leaves.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No leave requests</p>}
                            </div>
                        </Card>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.5rem', color: '#0f172a' }}>Apply for Leave</h3>
                            <form onSubmit={handleLeaveApply}>
                                <div style={{ marginBottom: '1.1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Leave Type</label>
                                    <select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(203,213,225,0.8)', borderRadius: '10px', color: '#0f172a', fontSize: '0.875rem', outline: 'none' }}>
                                        {['casual', 'sick', 'annual', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                {[{ label: 'Start Date', key: 'startDate' }, { label: 'End Date', key: 'endDate' }].map(({ label, key }) => (
                                    <div key={key} style={{ marginBottom: '1.1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                                        <input type="date" value={leaveForm[key]} onChange={e => setLeaveForm({ ...leaveForm, [key]: e.target.value })} required
                                            style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(203,213,225,0.8)', borderRadius: '10px', color: '#0f172a', fontSize: '0.875rem', outline: 'none', colorScheme: 'light' }} />
                                    </div>
                                ))}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reason</label>
                                    <textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} required rows={3}
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(203,213,225,0.8)', borderRadius: '10px', color: '#0f172a', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }} />
                                </div>
                                <button type="submit" style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #2e7df7, #1a6ae0)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.95rem', fontWeight: 600, boxShadow: '0 4px 14px rgba(46,125,247,0.25)' }}>Apply Leave</button>
                            </form>
                        </Card>
                    </div>
                )}

                {/* SALARY TAB */}
                {tab === 'salary' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', color: '#0f172a' }}>My Salary Records</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
                                        {['Month', 'Basic', 'Bonus', 'Deductions', 'Net Salary', 'Status'].map(h => (
                                            <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaries.map(s => (
                                        <tr key={s._id} style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                                            <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#0f172a' }}>{s.month}</td>
                                            <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#0f172a' }}>₹{s.basicSalary.toLocaleString()}</td>
                                            <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#10b981' }}>+₹{s.bonus.toLocaleString()}</td>
                                            <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: '#ef4444' }}>-₹{s.deductions.toLocaleString()}</td>
                                            <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 700, color: '#2e7df7' }}>₹{s.netSalary.toLocaleString()}</td>
                                            <td style={{ padding: '0.875rem 1rem' }}>
                                                <Badge color={s.status === 'paid' ? '#10b981' : '#f59e0b'}>{s.status}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {salaries.length === 0 && (
                                        <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No salary records yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default EmployeeDashboard;