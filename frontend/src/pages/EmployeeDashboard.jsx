import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import useWsUpdate from '../hooks/useWsUpdate';
import BurnoutWidget from '../components/BurnoutWidget';
import Navbar from '../components/Navbar';
import {
    LayoutDashboard, CalendarClock, CheckSquare, BookOpen, DollarSign, TrendingUp, Heart,
    UserCheck, Clock, Briefcase, LogOut, MapPin, Activity
} from 'lucide-react';

const useWindowWidth = () => {
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handler = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return width;
};

const Card = ({ children, style = {} }) => (
    <div style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.85)',
        borderRadius: '16px',
        padding: '1.25rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
        ...style
    }}>{children}</div>
);

const Badge = ({ children, color }) => (
    <span style={{
        padding: '0.2rem 0.6rem',
        borderRadius: '12px',
        fontSize: '0.7rem',
        fontWeight: 600,
        background: `${color}18`,
        color,
        border: `1px solid ${color}35`,
        whiteSpace: 'nowrap',
    }}>{children}</span>
);

const EmployeeDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const width = useWindowWidth();
    const isMobile = width < 768;
    const isTablet = width < 1024;

    const [tab, setTab] = useState('overview');
    const [attendance, setAttendance] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [productivity, setProductivity] = useState(null);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [message, setMessage] = useState('');
    const [leaveForm, setLeaveForm] = useState({ type: 'casual', startDate: '', endDate: '', reason: '' });

    const today = new Date().toISOString().split('T')[0];

    // Helper to safely extract array from API response
    const safeArray = (data, fallback = []) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.tasks)) return data.tasks;
        if (data && Array.isArray(data.attendance)) return data.attendance;
        if (data && Array.isArray(data.leaves)) return data.leaves;
        if (data && Array.isArray(data.salaries)) return data.salaries;
        if (data && Array.isArray(data.data)) return data.data;
        return fallback;
    };

    const fetchData = useCallback(async () => {
        try {
            const [attRes, taskRes, leaveRes, salaryRes] = await Promise.all([
                API.get('/attendance/my'),
                API.get('/tasks/my'),
                API.get('/leaves/my'),
                API.get('/salary/my'),
            ]);
            
            // Safely extract arrays from responses
            const attendanceData = safeArray(attRes.data);
            const tasksData = safeArray(taskRes.data);
            const leavesData = safeArray(leaveRes.data);
            const salariesData = safeArray(salaryRes.data);
            
            setAttendance(attendanceData);
            setTasks(tasksData);
            setLeaves(leavesData);
            setSalaries(salariesData);
            setTodayAttendance(attendanceData.find(a => a.date === today) || null);

            if (user?._id) {
                const prodRes = await API.get(`/productivity/${user._id}`);
                setProductivity(prodRes.data);
            }
        } catch (err) { console.error(err); }
    }, [user?._id, today]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useWsUpdate(
        ['task:assigned', 'task:updated', 'leave:approved', 'leave:rejected', 'salary:paid'],
        fetchData
    );

    const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleCheckIn = async () => {
        setLocating(true);
        if (!navigator.geolocation) {
            showMessage('Geolocation not supported');
            setLocating(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude: lat, longitude: lng } = position.coords;
                try {
                    await API.post('/attendance/checkin', { lat, lng });
                    showMessage('Checked in successfully');
                    fetchData();
                } catch (err) {
                    showMessage(`Check-in failed: ${err.response?.data?.message || 'Please try again'}`);
                }
                setLocating(false);
            },
            () => showMessage('Location permission denied'),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleCheckOut = async () => {
        setLoading(true);
        try {
            await API.post('/attendance/checkout');
            showMessage('Checked out');
            fetchData();
        } catch (err) {
            showMessage(`Checkout failed: ${err.response?.data?.message || 'Please try again'}`);
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
            showMessage('Leave request submitted');
            setLeaveForm({ type: 'casual', startDate: '', endDate: '', reason: '' });
            fetchData();
        } catch (err) { showMessage(`Leave application failed: ${err.response?.data?.message}`); }
    };

    const productivityColor = productivity?.productivityScore >= 1
        ? '#10b981' : productivity?.productivityScore > 0 ? '#f59e0b' : '#ef4444';

    const checkInBusy = loading || locating || !!todayAttendance;
    const checkOutBusy = loading || !todayAttendance || !!todayAttendance?.checkOut;

    const navItems = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
        { id: 'attendance', label: 'Attendance', icon: <CalendarClock size={18} /> },
        { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={18} /> },
        { id: 'leaves', label: 'Leaves', icon: <BookOpen size={18} /> },
        { id: 'salary', label: 'Salary', icon: <DollarSign size={18} /> },
        { id: 'wellness', label: 'Wellness', icon: <Heart size={18} /> },
    ];

    const sidebarBtnStyle = (active) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '0.6rem 1rem',
        borderRadius: '10px',
        fontSize: '0.85rem',
        fontWeight: 500,
        color: active ? 'white' : 'rgba(255,255,255,0.7)',
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'left',
    });

    const mobileNavStyle = (active) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0.45rem 1rem',
        borderRadius: '30px',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: active ? 'white' : 'rgba(255,255,255,0.7)',
        background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    });

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 50%, #e0e7ff 100%)' }}>
            <Navbar />
            {/* Fixed Sidebar (desktop) */}
            {!isMobile && (
                <div style={{
                    position: 'fixed',
                    left: 0,
                    top: '64px',
                    width: '260px',
                    height: 'calc(100vh - 64px)',
                    background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 999,
                    overflowY: 'auto',
                }}>
                    <div style={{
                        padding: '1.5rem 1rem 1rem',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        marginBottom: '1rem',
                    }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            background: 'rgba(255,255,255,0.15)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 0.75rem',
                            fontWeight: 600,
                            fontSize: '1rem',
                            color: 'white',
                        }}>
                            {user?.name?.charAt(0) || 'E'}
                        </div>
                        <div style={{ textAlign: 'center', fontWeight: 600, color: 'white' }}>{user?.name}</div>
                        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.2rem' }}>{user?.role}</div>
                    </div>

                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.25rem',
                        padding: '0 0.75rem',
                    }}>
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setTab(item.id)}
                                style={sidebarBtnStyle(tab === item.id)}
                                onMouseEnter={e => { if (tab !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                onMouseLeave={e => { if (tab !== item.id) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '1rem 1rem 1.5rem' }}>
                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        >
                            <LogOut size={16} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Main content area */}
            <div style={{
                marginLeft: isMobile ? 0 : '260px',
                paddingTop: '64px',
                width: isMobile ? '100%' : 'calc(100% - 260px)',
                minHeight: '100vh',
                boxSizing: 'border-box',
            }}>
                {/* Mobile horizontal navigation */}
                {isMobile && (
                    <div style={{
                        background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)',
                        padding: '0.6rem 1rem',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        gap: '0.5rem',
                        scrollbarWidth: 'thin',
                        position: 'sticky',
                        top: '64px',
                        zIndex: 998,
                    }}>
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setTab(item.id)}
                                style={mobileNavStyle(tab === item.id)}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}
                        <button
                            onClick={handleLogout}
                            style={{
                                ...mobileNavStyle(false),
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                            }}
                        >
                            <LogOut size={16} />
                            <span>Logout</span>
                        </button>
                    </div>
                )}

                {/* Content wrapper */}
                <div style={{ padding: isMobile ? '1rem' : '1.5rem', width: '100%', boxSizing: 'border-box' }}>
                    {message && (
                        <div style={{
                            background: message.includes('failed') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            borderLeft: `3px solid ${message.includes('failed') ? '#ef4444' : '#10b981'}`,
                            padding: '0.7rem 1rem',
                            borderRadius: '8px',
                            marginBottom: '1.5rem',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: message.includes('failed') ? '#b91c1c' : '#065f46',
                        }}>
                            {message}
                        </div>
                    )}

                    {/* Welcome header – concise */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a' }}>
                            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    {/* Stats cards – compact */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {[
                            { label: 'Days present', value: Array.isArray(attendance) ? attendance.length : 0, icon: <UserCheck size={18} color="#2e7df7" />, color: '#2e7df7' },
                            { label: 'Pending tasks', value: Array.isArray(tasks) ? tasks.filter(t => !t.completed).length : 0, icon: <Clock size={18} color="#f59e0b" />, color: '#f59e0b' },
                            { label: 'Productivity score', value: productivity?.productivityScore ?? '—', icon: <TrendingUp size={18} color={productivityColor} />, color: productivityColor },
                            { label: 'Latest salary', value: `₹${(Array.isArray(salaries) && salaries[0]?.netSalary) ? salaries[0].netSalary.toLocaleString() : '0'}`, icon: <DollarSign size={18} color="#10b981" />, color: '#10b981' },
                        ].map(({ label, value, icon, color }) => (
                            <Card key={label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>{label}</span>
                                    <div style={{ color, opacity: 0.8 }}>{icon}</div>
                                </div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color, fontFamily: 'monospace', marginTop: '0.25rem' }}>{value}</div>
                            </Card>
                        ))}
                    </div>

                    {/* Overview tab content */}
                    {tab === 'overview' && (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.5rem' }}>
                            <Card>
                                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Today's attendance</h3>
                                <div style={{ background: 'rgba(241,245,249,0.7)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                                    {[
                                        { label: 'Check in', value: todayAttendance?.checkIn ? new Date(todayAttendance.checkIn).toLocaleTimeString() : '--:--', color: '#10b981' },
                                        { label: 'Check out', value: todayAttendance?.checkOut ? new Date(todayAttendance.checkOut).toLocaleTimeString() : '--:--', color: '#ef4444' },
                                        { label: 'Hours', value: `${todayAttendance?.workingHours || '0.00'}h`, color: '#2e7df7' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                                            <span>{label}</span>
                                            <span style={{ fontFamily: 'monospace', color, fontWeight: 500 }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                                {!todayAttendance && (
                                    <div style={{ background: 'rgba(46,125,247,0.07)', borderRadius: '8px', padding: '0.6rem', marginBottom: '1rem', fontSize: '0.75rem', color: '#2e7df7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <MapPin size={14} />
                                        <span>Your location will be verified (office radius: 50m)</span>
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <button onClick={handleCheckIn} disabled={checkInBusy} style={{ padding: '0.6rem', borderRadius: '8px', background: checkInBusy ? '#e2e8f0' : '#10b981', color: 'white', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: checkInBusy ? 'not-allowed' : 'pointer' }}>
                                        {locating ? 'Locating...' : todayAttendance ? 'Checked in' : 'Check in'}
                                    </button>
                                    <button onClick={handleCheckOut} disabled={checkOutBusy} style={{ padding: '0.6rem', borderRadius: '8px', background: checkOutBusy ? '#e2e8f0' : '#ef4444', color: 'white', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: checkOutBusy ? 'not-allowed' : 'pointer' }}>
                                        {loading ? 'Processing...' : 'Check out'}
                                    </button>
                                </div>
                            </Card>

                            <Card>
                                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Recent tasks</h3>
                                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {(Array.isArray(tasks) ? tasks : []).slice(0, 5).map(task => (
                                        <div key={task._id} onClick={() => handleTaskToggle(task)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', background: 'rgba(241,245,249,0.7)', borderRadius: '10px', cursor: 'pointer' }}>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${task.completed ? '#10b981' : '#94a3b8'}`, background: task.completed ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {task.completed && <CheckSquare size={10} color="white" />}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.description}</div>
                                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{task.date}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {(Array.isArray(tasks) ? tasks : []).length === 0 && <p style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>No tasks assigned</p>}
                                </div>
                            </Card>

                            <Card style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Productivity summary</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                                    <div style={{ background: 'rgba(241,245,249,0.7)', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2e7df7' }}>{productivity?.totalWorkingHours || '0'}h</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total hours</div>
                                    </div>
                                    <div style={{ background: 'rgba(241,245,249,0.7)', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>{productivity?.completedTasks || 0}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Tasks done</div>
                                    </div>
                                    <div style={{ background: 'rgba(241,245,249,0.7)', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: productivityColor }}>{productivity?.productivityScore || '—'}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Productivity score</div>
                                    </div>
                                </div>
                                <p style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.8rem', textAlign: 'center' }}>Score = completed tasks ÷ working hours</p>
                            </Card>
                        </div>
                    )}

                    {/* Attendance tab */}
                    {tab === 'attendance' && (
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Attendance history</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            {['Date', 'Check in', 'Check out', 'Hours', 'Status'].map(h => <th key={h} style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(Array.isArray(attendance) ? attendance : []).map(record => (
                                            <tr key={record._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '0.6rem', fontFamily: 'monospace' }}>{record.date}</td>
                                                <td style={{ padding: '0.6rem', color: '#10b981' }}>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}</td>
                                                <td style={{ padding: '0.6rem', color: '#ef4444' }}>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}</td>
                                                <td style={{ padding: '0.6rem' }}>{record.workingHours}h</td>
                                                <td style={{ padding: '0.6rem' }}><Badge color={record.checkOut ? '#10b981' : '#f59e0b'}>{record.checkOut ? 'Complete' : 'Incomplete'}</Badge></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Tasks tab */}
                    {tab === 'tasks' && (
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>My tasks</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {(Array.isArray(tasks) ? tasks : []).map(task => (
                                    <div key={task._id} onClick={() => handleTaskToggle(task)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem', background: 'rgba(241,245,249,0.7)', borderRadius: '10px', cursor: 'pointer' }}>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${task.completed ? '#10b981' : '#94a3b8'}`, background: task.completed ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {task.completed && <CheckSquare size={10} color="white" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.85rem', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.description}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{task.date}</div>
                                        </div>
                                        <Badge color={task.completed ? '#10b981' : '#f59e0b'}>{task.completed ? 'Done' : 'Pending'}</Badge>
                                    </div>
                                ))}
                                {(Array.isArray(tasks) ? tasks : []).length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No tasks assigned</p>}
                            </div>
                        </Card>
                    )}

                    {/* Leaves tab */}
                    {tab === 'leaves' && (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '1.5rem' }}>
                            <Card>
                                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>My leave requests</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {(Array.isArray(leaves) ? leaves : []).map(leave => (
                                        <div key={leave._id} style={{ padding: '0.7rem', background: 'rgba(241,245,249,0.7)', borderRadius: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize' }}>{leave.type} leave</span>
                                                <Badge color={leave.status === 'approved' ? '#10b981' : leave.status === 'rejected' ? '#ef4444' : '#f59e0b'}>{leave.status}</Badge>
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>{leave.startDate} → {leave.endDate}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{leave.reason}</div>
                                        </div>
                                    ))}
                                    {(Array.isArray(leaves) ? leaves : []).length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No leave requests</p>}
                                </div>
                            </Card>
                            <Card>
                                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Request leave</h3>
                                <form onSubmit={handleLeaveApply}>
                                    <div style={{ marginBottom: '0.8rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', display: 'block' }}>Type</label>
                                        <select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                                            {['casual', 'sick', 'annual', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '0.8rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', display: 'block' }}>Start date</label>
                                        <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                                    </div>
                                    <div style={{ marginBottom: '0.8rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', display: 'block' }}>End date</label>
                                        <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', display: 'block' }}>Reason</label>
                                        <textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} required rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', fontSize: '0.8rem' }} />
                                    </div>
                                    <button type="submit" style={{ width: '100%', padding: '0.6rem', background: 'linear-gradient(135deg,#2e7df7,#1a6ae0)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Submit request</button>
                                </form>
                            </Card>
                        </div>
                    )}

                    {/* Salary tab */}
                    {tab === 'salary' && (
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Salary records</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            {['Month', 'Basic', 'Bonus', 'Deductions', 'Net', 'Status'].map(h => <th key={h} style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(Array.isArray(salaries) ? salaries : []).map(s => (
                                            <tr key={s._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '0.6rem' }}>{s.month}</td>
                                                <td style={{ padding: '0.6rem' }}>₹{s.basicSalary.toLocaleString()}</td>
                                                <td style={{ padding: '0.6rem', color: '#10b981' }}>+₹{s.bonus.toLocaleString()}</td>
                                                <td style={{ padding: '0.6rem', color: '#ef4444' }}>-₹{s.deductions.toLocaleString()}</td>
                                                <td style={{ padding: '0.6rem', fontWeight: 700 }}>₹{s.netSalary.toLocaleString()}</td>
                                                <td style={{ padding: '0.6rem' }}><Badge color={s.status === 'paid' ? '#10b981' : '#f59e0b'}>{s.status}</Badge></td>
                                            </tr>
                                        ))}
                                        {(Array.isArray(salaries) ? salaries : []).length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No salary records</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Wellness tab */}
                    {tab === 'wellness' && <BurnoutWidget />}
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;