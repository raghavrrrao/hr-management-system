import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import API from '../api/axios';

const Card = ({ children, style = {} }) => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', ...style }}>{children}</div>
);

const Badge = ({ children, color }) => (
    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: `${color}20`, color, border: `1px solid ${color}40` }}>{children}</span>
);

const EmployeeDashboard = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState('overview');
    const [attendance, setAttendance] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [productivity, setProductivity] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [leaveForm, setLeaveForm] = useState({ type: 'casual', startDate: '', endDate: '', reason: '' });

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

            // Fetch productivity score
            if (user?._id) {
                const prodRes = await API.get(`/productivity/${user._id}`);
                setProductivity(prodRes.data);
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, []);

    const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

    const handleCheckIn = async () => {
        setLoading(true);
        try { await API.post('/attendance/checkin'); showMessage('✅ Checked in!'); fetchData(); }
        catch (err) { showMessage(`❌ ${err.response?.data?.message || 'Error'}`); }
        setLoading(false);
    };

    const handleCheckOut = async () => {
        setLoading(true);
        try { await API.post('/attendance/checkout'); showMessage('✅ Checked out!'); fetchData(); }
        catch (err) { showMessage(`❌ ${err.response?.data?.message || 'Error'}`); }
        setLoading(false);
    };

    const handleTaskToggle = async (task) => {
        try { await API.put(`/tasks/${task._id}`, { completed: !task.completed }); fetchData(); }
        catch (err) { console.error(err); }
    };

    const handleLeaveApply = async (e) => {
        e.preventDefault();
        try { await API.post('/leaves', leaveForm); showMessage('✅ Leave applied!'); setLeaveForm({ type: 'casual', startDate: '', endDate: '', reason: '' }); fetchData(); }
        catch (err) { showMessage(`❌ ${err.response?.data?.message || 'Error'}`); }
    };

    const btnStyle = (active) => ({
        padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
        background: active ? 'var(--accent)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        color: active ? 'white' : 'var(--text-secondary)',
        textTransform: 'capitalize', transition: 'all 0.2s', cursor: 'pointer',
    });

    const productivityColor = productivity?.productivityScore >= 1
        ? 'var(--success)'
        : productivity?.productivityScore > 0
            ? 'var(--warning)'
            : 'var(--danger)';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
            <Navbar />
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>

                {message && (
                    <div style={{
                        background: message.includes('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${message.includes('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: message.includes('✅') ? '#6ee7b7' : '#fca5a5',
                        padding: '0.875rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 500,
                    }}>{message}</div>
                )}

                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                        Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name} 👋
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Days Present', value: attendance.length, color: 'var(--accent)' },
                        { label: 'Pending Tasks', value: tasks.filter(t => !t.completed).length, color: 'var(--warning)' },
                        { label: 'Productivity Score', value: productivity?.productivityScore ?? '—', color: productivityColor },
                        { label: 'Net Salary', value: `₹${salaries[0]?.netSalary?.toLocaleString() || '0'}`, color: 'var(--success)' },
                    ].map(({ label, value, color }) => (
                        <Card key={label}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{value}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{label}</div>
                        </Card>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {['overview', 'attendance', 'tasks', 'leaves', 'salary'].map(t => (
                        <button key={t} onClick={() => setTab(t)} style={btnStyle(tab === t)}>{t}</button>
                    ))}
                </div>

                {/* OVERVIEW TAB */}
                {tab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem' }}>Today's Attendance</h3>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
                                {[
                                    { label: 'Check In', value: todayAttendance?.checkIn ? new Date(todayAttendance.checkIn).toLocaleTimeString() : '--:--', color: 'var(--success)' },
                                    { label: 'Check Out', value: todayAttendance?.checkOut ? new Date(todayAttendance.checkOut).toLocaleTimeString() : '--:--', color: 'var(--danger)' },
                                    { label: 'Hours', value: `${todayAttendance?.workingHours || '0.00'}h`, color: 'var(--accent)' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{label}</span>
                                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem', color }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <button onClick={handleCheckIn} disabled={loading || !!todayAttendance} style={{ padding: '0.75rem', background: todayAttendance ? 'rgba(255,255,255,0.03)' : 'rgba(16,185,129,0.15)', border: `1px solid ${todayAttendance ? 'var(--border)' : 'rgba(16,185,129,0.4)'}`, color: todayAttendance ? 'var(--text-secondary)' : 'var(--success)', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: todayAttendance ? 'not-allowed' : 'pointer' }}>Check In</button>
                                <button onClick={handleCheckOut} disabled={loading || !todayAttendance || !!todayAttendance?.checkOut} style={{ padding: '0.75rem', background: (!todayAttendance || todayAttendance?.checkOut) ? 'rgba(255,255,255,0.03)' : 'rgba(239,68,68,0.15)', border: `1px solid ${(!todayAttendance || todayAttendance?.checkOut) ? 'var(--border)' : 'rgba(239,68,68,0.4)'}`, color: (!todayAttendance || todayAttendance?.checkOut) ? 'var(--text-secondary)' : 'var(--danger)', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', cursor: (!todayAttendance || todayAttendance?.checkOut) ? 'not-allowed' : 'pointer' }}>Check Out</button>
                            </div>
                        </Card>

                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem' }}>My Tasks</h3>
                            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {tasks.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No tasks assigned</p>}
                                {tasks.slice(0, 5).map(task => (
                                    <div key={task._id} onClick={() => handleTaskToggle(task)} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, marginTop: '2px', background: task.completed ? 'var(--success)' : 'transparent', border: `2px solid ${task.completed ? 'var(--success)' : 'var(--text-secondary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {task.completed && <span style={{ fontSize: '10px', color: 'white' }}>✓</span>}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{task.description}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{task.date}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Productivity Card */}
                        <Card style={{ gridColumn: 'span 2' }}>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem' }}>My Productivity</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                {[
                                    { label: 'Total Working Hours', value: `${productivity?.totalWorkingHours || '0.00'}h`, color: 'var(--accent)' },
                                    { label: 'Tasks Completed', value: productivity?.completedTasks ?? 0, color: 'var(--success)' },
                                    { label: 'Productivity Score', value: productivity?.productivityScore ?? '—', color: productivityColor },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{value}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{label}</div>
                                    </div>
                                ))}
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '1rem', textAlign: 'center' }}>
                                Score = Tasks Completed ÷ Working Hours
                            </p>
                        </Card>
                    </div>
                )}

                {/* ATTENDANCE TAB */}
                {tab === 'attendance' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Attendance History</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {['Date', 'Check In', 'Check Out', 'Hours', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {attendance.map(record => (
                                    <tr key={record._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{record.date}</td>
                                        <td style={{ padding: '0.875rem 1rem', color: 'var(--success)', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}</td>
                                        <td style={{ padding: '0.875rem 1rem', color: 'var(--danger)', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}</td>
                                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{record.workingHours}h</td>
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <Badge color={record.checkOut ? 'var(--success)' : 'var(--warning)'}>{record.checkOut ? 'Complete' : 'Incomplete'}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                )}

                {/* TASKS TAB */}
                {tab === 'tasks' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>My Tasks</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {tasks.map(task => (
                                <div key={task._id} onClick={() => handleTaskToggle(task)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                                    <div style={{ width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, background: task.completed ? 'var(--success)' : 'transparent', border: `2px solid ${task.completed ? 'var(--success)' : 'var(--text-secondary)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {task.completed && <span style={{ fontSize: '11px', color: 'white' }}>✓</span>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{task.description}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{task.date}</div>
                                    </div>
                                    <Badge color={task.completed ? 'var(--success)' : 'var(--warning)'}>{task.completed ? 'Done' : 'Pending'}</Badge>
                                </div>
                            ))}
                            {tasks.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No tasks assigned</p>}
                        </div>
                    </Card>
                )}

                {/* LEAVES TAB */}
                {tab === 'leaves' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>My Leave Requests</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {leaves.map(leave => (
                                    <div key={leave._id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{leave.type} Leave</div>
                                            <Badge color={leave.status === 'approved' ? 'var(--success)' : leave.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'}>{leave.status}</Badge>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{leave.startDate} → {leave.endDate}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{leave.reason}</div>
                                    </div>
                                ))}
                                {leaves.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No leave requests</p>}
                            </div>
                        </Card>

                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1.5rem' }}>Apply for Leave</h3>
                            <form onSubmit={handleLeaveApply}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Type</label>
                                    <select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}>
                                        {['casual', 'sick', 'annual', 'other'].map(t => <option key={t} value={t} style={{ background: '#0f1c2e', textTransform: 'capitalize' }}>{t}</option>)}
                                    </select>
                                </div>
                                {[{ label: 'Start Date', key: 'startDate' }, { label: 'End Date', key: 'endDate' }].map(({ label, key }) => (
                                    <div key={key} style={{ marginBottom: '1.25rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                                        <input type="date" value={leaveForm[key]} onChange={e => setLeaveForm({ ...leaveForm, [key]: e.target.value })} required
                                            style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark' }} />
                                    </div>
                                ))}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</label>
                                    <textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} required rows={3}
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'var(--font)' }} />
                                </div>
                                <button type="submit" style={{ width: '100%', padding: '0.875rem', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>Apply Leave</button>
                            </form>
                        </Card>
                    </div>
                )}

                {/* SALARY TAB */}
                {tab === 'salary' && (
                    <Card>
                        <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>My Salary Records</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {['Month', 'Basic', 'Bonus', 'Deductions', 'Net Salary', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {salaries.map(s => (
                                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{s.month}</td>
                                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>₹{s.basicSalary.toLocaleString()}</td>
                                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--success)' }}>+₹{s.bonus.toLocaleString()}</td>
                                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--danger)' }}>-₹{s.deductions.toLocaleString()}</td>
                                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>₹{s.netSalary.toLocaleString()}</td>
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <Badge color={s.status === 'paid' ? 'var(--success)' : 'var(--warning)'}>{s.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                                {salaries.length === 0 && (
                                    <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No salary records yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default EmployeeDashboard;