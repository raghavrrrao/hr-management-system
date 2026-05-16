import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { getAllBurnoutScores } from '../api/burnout';
import BurnoutDashboard from './BurnoutDashboard';
import useWsUpdate from '../hooks/useWsUpdate';
import Navbar from '../components/Navbar';
import AdminTasksTab from '../components/dashboard/AdminTasksTab';
import {
    LayoutDashboard, Users, CalendarClock, CheckSquare, BookOpen, DollarSign, TrendingUp, Brain, Flame,
    UserCheck, Clock, Briefcase, FileText, LogOut, Settings, ChevronRight, Download, AlertCircle, Plus, X,
    ArrowUp, ArrowDown, Trash2, Search, Filter
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
        transition: 'transform 0.15s, box-shadow 0.15s',
        ...style
    }}>{children}</div>
);

const Badge = ({ children, color, variant = 'soft' }) => {
    const isSoft = variant === 'soft';
    return (
        <span style={{
            padding: '0.2rem 0.6rem',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontWeight: 600,
            background: isSoft ? `${color}18` : color,
            color: isSoft ? color : 'white',
            border: isSoft ? `1px solid ${color}35` : 'none',
            whiteSpace: 'nowrap',
        }}>{children}</span>
    );
};

const MobileAttendanceCard = ({ record }) => (
    <div style={{
        padding: '0.875rem',
        background: 'rgba(241,245,249,0.7)',
        borderRadius: '12px',
        border: '1px solid rgba(226,232,240,0.7)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{record.employee?.name || 'Unknown'}</div>
            <Badge color={record.checkOut ? '#10b981' : '#f59e0b'}>{record.checkOut ? 'Complete' : 'Incomplete'}</Badge>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{record.employee?.email}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
            {[
                { label: 'Date', value: record.date },
                { label: 'In', value: record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-' },
                { label: 'Out', value: record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-' },
            ].map(({ label, value }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '0.3rem 0.5rem' }}>
                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>{value}</div>
                </div>
            ))}
        </div>
    </div>
);

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const width = useWindowWidth();
    const isMobile = width < 768;
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

    const [taskForm, setTaskForm] = useState({ employee: '', date: '', description: '' });
    const [salaryForm, setSalaryForm] = useState({ employee: '', month: '', basicSalary: '', bonus: '', deductions: '' });

    // Employee management UI state
    const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        employeeId: '',
        name: '',
        email: '',
        department: '',
        designation: '',
        joiningDate: new Date().toISOString().split('T')[0],
        role: 'employee'
    });
    const [tempPassword, setTempPassword] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    // Search & filter for employees
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [employeeRoleFilter, setEmployeeRoleFilter] = useState('all');

    const fetchData = useCallback(async () => {
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

            getAllBurnoutScores()
                .then(res => setBurnoutSummary(res.data.summary))
                .catch(() => {});
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useWsUpdate(
        ['leave:requested', 'attendance:checkin', 'attendance:checkout', 'burnout:alert', 'task:updated', 'task:status-updated'],
        fetchData
    );

    const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3500); };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handlePromote = async (id, currentRole) => {
        const newRole = currentRole === 'admin' ? 'employee' : 'admin';
        if (!confirm(`Change role to ${newRole}?`)) return;
        try {
            await API.put(`/admin/promote/${id}`, { role: newRole });
            showMessage(`Role updated to ${newRole}`); fetchData();
        } catch (err) { showMessage(`Error: ${err.response?.data?.message || 'Update failed'}`); }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await API.post('/tasks', taskForm);
            showMessage('Task assigned');
            setTaskForm({ employee: '', date: '', description: '' }); fetchData();
        } catch (err) { showMessage(`Error: ${err.response?.data?.message || 'Creation failed'}`); }
    };

    const handleCreateSalary = async (e) => {
        e.preventDefault();
        try {
            await API.post('/salary', { ...salaryForm, basicSalary: Number(salaryForm.basicSalary), bonus: Number(salaryForm.bonus), deductions: Number(salaryForm.deductions) });
            showMessage('Salary record created');
            setSalaryForm({ employee: '', month: '', basicSalary: '', bonus: '', deductions: '' }); fetchData();
        } catch (err) { showMessage(`Error: ${err.response?.data?.message || 'Creation failed'}`); }
    };

    const handleLeaveStatus = async (id, status) => {
        try { await API.put(`/leaves/${id}`, { status }); showMessage(`Leave ${status}`); fetchData(); }
        catch { showMessage('Error updating leave'); }
    };

    const handleSalaryStatus = async (id, status) => {
        try { await API.put(`/salary/${id}`, { status }); showMessage(`Salary ${status}`); fetchData(); }
        catch { showMessage('Error updating salary'); }
    };

    const handleDeleteEmployee = async (id) => {
        if (!confirm('Delete this employee? This action is permanent.')) return;
        try { await API.delete(`/employees/${id}`); showMessage('Employee deleted'); fetchData(); }
        catch { showMessage('Error deleting employee'); }
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
            showMessage(`${type} report downloaded`);
        } catch { showMessage('Export failed'); }
    };

    // Create employee handler
    const handleCreateEmployee = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const response = await API.post('/admin/employees', newEmployee);
            setTempPassword(response.data.tempPassword);
            showMessage(`Employee created. Temporary password: ${response.data.tempPassword} (copy this now)`);
            setShowAddEmployeeModal(false);
            setNewEmployee({
                employeeId: '',
                name: '',
                email: '',
                department: '',
                designation: '',
                joiningDate: new Date().toISOString().split('T')[0],
                role: 'employee'
            });
            fetchData(); // refresh employee list
        } catch (err) {
            showMessage(`Error: ${err.response?.data?.message || 'Creation failed'}`);
        } finally {
            setCreateLoading(false);
        }
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
        { name: 'Completed', value: tasks.filter(t => t.status === 'completed').length },
        { name: 'Pending', value: tasks.filter(t => t.status !== 'completed').length },
    ];
    const leavePieData = [
        { name: 'Approved', value: leaves.filter(l => l.status === 'approved').length },
        { name: 'Pending', value: leaves.filter(l => l.status === 'pending').length },
        { name: 'Rejected', value: leaves.filter(l => l.status === 'rejected').length },
    ];

    const statCards = [
        { label: 'Employees', value: employees.length, icon: <Users size={18} color="#2e7df7" />, color: '#2e7df7' },
        { label: 'Present Today', value: todayAttendance.length, icon: <UserCheck size={18} color="#10b981" />, color: '#10b981' },
        { label: 'Total Tasks', value: tasks.length, icon: <CheckSquare size={18} color="#f59e0b" />, color: '#f59e0b' },
        { label: 'Pending Tasks', value: tasks.filter(t => t.status !== 'completed').length, icon: <Clock size={18} color="#ef4444" />, color: '#ef4444' },
        { label: 'Pending Leaves', value: pendingLeaves, icon: <BookOpen size={18} color="#a78bfa" />, color: '#a78bfa' },
        { label: 'Pending Salaries', value: pendingSalaries, icon: <DollarSign size={18} color="#fb923c" />, color: '#fb923c' },
        { label: 'High Risk', value: burnoutSummary?.high ?? '—', icon: <Flame size={18} color="#ef4444" />, color: '#ef4444', tab: 'burnout' },
    ];

    const navItems = [
        { id: 'analytics', label: 'Analytics', icon: <LayoutDashboard size={18} /> },
        { id: 'attendance', label: 'Attendance', icon: <CalendarClock size={18} /> },
        { id: 'employees', label: 'Employees', icon: <Users size={18} /> },
        { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={18} /> },
        { id: 'leaves', label: 'Leaves', icon: <BookOpen size={18} /> },
        { id: 'salary', label: 'Salary', icon: <DollarSign size={18} /> },
        { id: 'productivity', label: 'Productivity', icon: <TrendingUp size={18} /> },
        { id: 'predictions', label: 'Predictions', icon: <Brain size={18} /> },
        { id: 'burnout', label: 'Burnout', icon: <Flame size={18} /> },
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

    const mobileNavItemStyle = (active) => ({
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
        transition: 'all 0.2s',
    });

    // Filtered employees based on search and role
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = employeeSearch === '' ||
            emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
            emp.email?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
            emp.employeeId?.toLowerCase().includes(employeeSearch.toLowerCase());
        const matchesRole = employeeRoleFilter === 'all' || emp.role === employeeRoleFilter;
        return matchesSearch && matchesRole;
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
                    <div style={{ padding: '1.5rem 1rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                        <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontWeight: 600, fontSize: '1rem', color: 'white' }}>
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                        <div style={{ textAlign: 'center', fontWeight: 600, color: 'white' }}>{user?.name}</div>
                        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.2rem' }}>{user?.role}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.25rem', padding: '0 0.75rem' }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setTab(item.id)} style={sidebarBtnStyle(tab === item.id)}
                                onMouseEnter={e => { if (tab !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                onMouseLeave={e => { if (tab !== item.id) e.currentTarget.style.background = 'transparent'; }}>
                                {item.icon}<span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                    <div style={{ padding: '1rem 1rem 1.5rem' }}>
                        <button onClick={handleLogout} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <LogOut size={16} /><span>Logout</span>
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
                {isMobile && (
                    <div style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)', padding: '0.6rem 1rem', overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: '0.5rem', position: 'sticky', top: '64px', zIndex: 998 }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setTab(item.id)} style={mobileNavItemStyle(tab === item.id)}>{item.icon}<span>{item.label}</span></button>
                        ))}
                        <button onClick={handleLogout} style={{ ...mobileNavItemStyle(false), background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}><LogOut size={16} /><span>Logout</span></button>
                    </div>
                )}

                <div style={{ padding: isMobile ? '1rem' : '1.5rem', width: '100%', boxSizing: 'border-box' }}>
                    {message && (
                        <div style={{ background: message.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', borderLeft: `3px solid ${message.includes('Error') ? '#ef4444' : '#10b981'}`, padding: '0.7rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
                            {message}
                        </div>
                    )}

                    {/* Header with Add Employee button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a' }}>Admin Dashboard</h2>
                            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Manage your team</p>
                        </div>
                        <button onClick={() => setShowAddEmployeeModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#2e7df7', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                            <Plus size={16} /> Add Employee
                        </button>
                    </div>

                    {/* Stats cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, gap: '1rem', marginBottom: '1.5rem' }}>
                        {statCards.map(({ label, value, icon, color, tab: cardTab }) => (
                            <Card key={label} style={{ padding: '1rem', cursor: cardTab ? 'pointer' : 'default' }} onClick={cardTab ? () => setTab(cardTab) : undefined}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748b' }}>{label}</span>
                                    <div style={{ color, opacity: 0.8 }}>{icon}</div>
                                </div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color, fontFamily: 'var(--mono)', marginTop: '0.25rem' }}>{value}</div>
                            </Card>
                        ))}
                    </div>

                    {/* Dynamic Tab Content */}
                    {tab === 'analytics' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '1fr' : '1fr 1fr 1fr'), gap: '1.5rem' }}>
                                <Card style={!isMobile && !isTablet ? { gridColumn: 'span 2' } : {}}>
                                    <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Attendance trend (last 7 days)</h3>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={attendanceChartData}>
                                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                                            <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} width={25} />
                                            <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                            <Bar dataKey="count" fill="#2e7df7" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                                <Card>
                                    <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Task completion</h3>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                                                {taskPieData.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b'][i]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend iconSize={8} wrapperStyle={{ fontSize: '0.7rem' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Card>
                                <Card style={!isMobile && !isTablet ? { gridColumn: 'span 2' } : {}}>
                                    <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Leave distribution</h3>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie data={leavePieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={3}>
                                                {leavePieData.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444'][i]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend iconSize={8} wrapperStyle={{ fontSize: '0.7rem' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Card>
                                <Card>
                                    <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Financial snapshot</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                            <span style={{ color: '#475569', fontSize: '0.8rem' }}>Total payroll</span>
                                            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>₹{salaries.reduce((s, r) => s + r.netSalary, 0).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                            <span style={{ color: '#475569', fontSize: '0.8rem' }}>Paid salaries</span>
                                            <span>{salaries.filter(s => s.status === 'paid').length}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                            <span style={{ color: '#475569', fontSize: '0.8rem' }}>Approved leaves</span>
                                            <span>{leaves.filter(l => l.status === 'approved').length}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#475569', fontSize: '0.8rem' }}>Attendance records</span>
                                            <span>{attendance.length}</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                            <Card style={{ marginTop: '1.5rem' }}>
                                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Export data</h3>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {[
                                        { type: 'attendance', label: 'Attendance', icon: <CalendarClock size={16} />, color: '#2e7df7' },
                                        { type: 'salary', label: 'Salary', icon: <DollarSign size={16} />, color: '#10b981' },
                                        { type: 'productivity', label: 'Productivity', icon: <TrendingUp size={16} />, color: '#a78bfa' },
                                    ].map(({ type, label, icon, color }) => (
                                        <button key={type} onClick={() => handleExport(type)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: `${color}10`, border: `1px solid ${color}30`, color, borderRadius: '8px', fontWeight: 500, fontSize: '0.8rem', cursor: 'pointer' }}>
                                            {icon}{label}
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        </>
                    )}

                    {tab === 'attendance' && (
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>All attendance records</h3>
                            {isMobile ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {attendance.map(record => <MobileAttendanceCard key={record._id} record={record} />)}
                                    {attendance.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No records yet</p>}
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                {['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendance.map(record => (
                                                <tr key={record._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '0.75rem' }}><div style={{ fontWeight: 500 }}>{record.employee?.name || 'Unknown'}</div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>{record.employee?.email}</div></td>
                                                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{record.date}</td>
                                                    <td style={{ padding: '0.75rem', color: '#10b981', fontFamily: 'monospace' }}>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}</td>
                                                    <td style={{ padding: '0.75rem', color: '#ef4444', fontFamily: 'monospace' }}>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}</td>
                                                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{record.workingHours}h</td>
                                                    <td style={{ padding: '0.75rem' }}><Badge color={record.checkOut ? '#10b981' : '#f59e0b'}>{record.checkOut ? 'Complete' : 'Incomplete'}</Badge></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* EMPLOYEES TAB – REDESIGNED PREMIUM DIRECTORY */}
                    {tab === 'employees' && (
                        <Card style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h3 style={{ fontWeight: 600, fontSize: '1rem', color: '#0f172a', margin: 0 }}>Employee directory</h3>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            placeholder="Search employees..."
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                            style={{ padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '30px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '220px', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Filter size={14} color="#64748b" />
                                        <select
                                            value={employeeRoleFilter}
                                            onChange={(e) => setEmployeeRoleFilter(e.target.value)}
                                            style={{ padding: '0.4rem 0.6rem', borderRadius: '30px', border: '1px solid #cbd5e1', fontSize: '0.75rem', background: 'white' }}
                                        >
                                            <option value="all">All roles</option>
                                            <option value="admin">Admin</option>
                                            <option value="employee">Employee</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {filteredEmployees.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No employees match your filters</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {filteredEmployees.map(emp => (
                                        <div
                                            key={emp._id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1rem 1.25rem',
                                                background: 'rgba(255,255,255,0.8)',
                                                borderRadius: '16px',
                                                border: '1px solid rgba(226,232,240,0.6)',
                                                transition: 'all 0.2s ease',
                                                cursor: 'default',
                                                flexWrap: 'wrap',
                                                gap: '1rem',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'white';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
                                                e.currentTarget.style.boxShadow = 'none';
                                                e.currentTarget.style.borderColor = 'rgba(226,232,240,0.6)';
                                            }}
                                        >
                                            {/* Left side: avatar + core info */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '2', minWidth: '200px' }}>
                                                <div style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '14px',
                                                    background: `linear-gradient(135deg, ${emp.role === 'admin' ? '#ef4444' : '#2e7df7'}, ${emp.role === 'admin' ? '#b91c1c' : '#1e40af'})`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 600,
                                                    fontSize: '1.1rem',
                                                    color: 'white',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                                                }}>
                                                    {emp.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.2rem' }}>{emp.name}</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.7rem', color: '#64748b' }}>
                                                        {emp.employeeId && <span>ID: {emp.employeeId}</span>}
                                                        <span>{emp.email}</span>
                                                        {emp.department && <span>• {emp.department}</span>}
                                                        {emp.designation && <span>• {emp.designation}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right side: role badge + actions */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                                <Badge color={emp.role === 'admin' ? '#ef4444' : '#10b981'} variant="soft">
                                                    {emp.role === 'admin' ? 'Administrator' : 'Employee'}
                                                </Badge>

                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handlePromote(emp._id, emp.role)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            padding: '0.3rem 0.7rem',
                                                            background: emp.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(46,125,247,0.1)',
                                                            border: `1px solid ${emp.role === 'admin' ? 'rgba(239,68,68,0.3)' : 'rgba(46,125,247,0.3)'}`,
                                                            color: emp.role === 'admin' ? '#ef4444' : '#2e7df7',
                                                            borderRadius: '8px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 500,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = emp.role === 'admin' ? '#ef4444' : '#2e7df7';
                                                            e.currentTarget.style.color = 'white';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = emp.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(46,125,247,0.1)';
                                                            e.currentTarget.style.color = emp.role === 'admin' ? '#ef4444' : '#2e7df7';
                                                        }}
                                                    >
                                                        {emp.role === 'admin' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                                                        <span>{emp.role === 'admin' ? 'Demote' : 'Promote'}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEmployee(emp._id)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem',
                                                            padding: '0.3rem 0.7rem',
                                                            background: 'rgba(239,68,68,0.1)',
                                                            border: '1px solid rgba(239,68,68,0.3)',
                                                            color: '#ef4444',
                                                            borderRadius: '8px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 500,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#ef4444';
                                                            e.currentTarget.style.color = 'white';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                                            e.currentTarget.style.color = '#ef4444';
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}

                    {tab === 'tasks' && <AdminTasksTab employees={employees} />}

                    {tab === 'leaves' && (
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Leave requests</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {leaves.map(leave => (
                                    <div key={leave._id} style={{ padding: '0.75rem', background: 'rgba(241,245,249,0.7)', borderRadius: '12px', border: '1px solid rgba(226,232,240,0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{leave.employee?.name}</div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>{leave.type} • {leave.startDate} → {leave.endDate}</div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>{leave.reason}</div></div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <Badge color={leave.status === 'approved' ? '#10b981' : leave.status === 'rejected' ? '#ef4444' : '#f59e0b'}>{leave.status}</Badge>
                                            {leave.status === 'pending' && (
                                                <>
                                                    <button onClick={() => handleLeaveStatus(leave._id, 'approved')} style={{ background: '#10b981', border: 'none', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer' }}>Approve</button>
                                                    <button onClick={() => handleLeaveStatus(leave._id, 'rejected')} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer' }}>Reject</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {leaves.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No leave requests</p>}
                            </div>
                        </Card>
                    )}

                    {tab === 'salary' && (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '1.5rem' }}>
                            <Card>
                                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Salary records</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                {['Employee', 'Month', 'Basic', 'Bonus', 'Deductions', 'Net', 'Status', ''].map(h => <th key={h} style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {salaries.map(s => (
                                                <tr key={s._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '0.6rem' }}><div style={{ fontWeight: 500 }}>{s.employee?.name}</div><div style={{ fontSize: '0.65rem', color: '#64748b' }}>{s.employee?.email}</div></td>
                                                    <td style={{ padding: '0.6rem' }}>{s.month}</td>
                                                    <td style={{ padding: '0.6rem' }}>₹{s.basicSalary.toLocaleString()}</td>
                                                    <td style={{ padding: '0.6rem', color: '#10b981' }}>+₹{s.bonus.toLocaleString()}</td>
                                                    <td style={{ padding: '0.6rem', color: '#ef4444' }}>-₹{s.deductions.toLocaleString()}</td>
                                                    <td style={{ padding: '0.6rem', fontWeight: 700 }}>₹{s.netSalary.toLocaleString()}</td>
                                                    <td style={{ padding: '0.6rem' }}><Badge color={s.status === 'paid' ? '#10b981' : '#f59e0b'}>{s.status}</Badge></td>
                                                    <td style={{ padding: '0.6rem' }}>{s.status === 'pending' && <button onClick={() => handleSalaryStatus(s._id, 'paid')} style={{ background: '#10b981', border: 'none', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer' }}>Pay</button>}</td>
                                                </tr>
                                            ))}
                                            {salaries.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No salary records</td></tr>}</tbody>
                                    </table>
                                </div>
                            </Card>
                            <Card>
                                <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', color: '#0f172a' }}>Add salary record</h3>
                                <form onSubmit={handleCreateSalary}>
                                    <div style={{ marginBottom: '0.8rem' }}><label style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', display: 'block' }}>Employee</label><select value={salaryForm.employee} onChange={e => setSalaryForm({ ...salaryForm, employee: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}><option value="">Select employee</option>{employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}</select></div>
                                    <div style={{ marginBottom: '0.8rem' }}><label style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', display: 'block' }}>Month</label><input type="month" value={salaryForm.month} onChange={e => setSalaryForm({ ...salaryForm, month: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                    <div style={{ marginBottom: '0.8rem' }}><label style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', display: 'block' }}>Basic salary (₹)</label><input type="number" value={salaryForm.basicSalary} onChange={e => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                    <div style={{ marginBottom: '0.8rem' }}><label style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', display: 'block' }}>Bonus (₹)</label><input type="number" value={salaryForm.bonus} onChange={e => setSalaryForm({ ...salaryForm, bonus: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                    <div style={{ marginBottom: '1rem' }}><label style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.2rem', display: 'block' }}>Deductions (₹)</label><input type="number" value={salaryForm.deductions} onChange={e => setSalaryForm({ ...salaryForm, deductions: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                    <button type="submit" style={{ width: '100%', padding: '0.6rem', background: 'linear-gradient(135deg,#2e7df7,#1a6ae0)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Add record</button>
                                </form>
                            </Card>
                        </div>
                    )}

                    {tab === 'productivity' && (
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#0f172a' }}>Employee productivity scores</h3>
                            <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.75rem' }}>Score = completed tasks ÷ working hours (with multi‑day weighting)</p>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}>{['Employee', 'Hours', 'Tasks done', 'Score', 'Performance'].map(h => <th key={h} style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {productivityData.map((p, i) => {
                                            const color = p.productivityScore >= 80 ? '#10b981' : p.productivityScore >= 50 ? '#f59e0b' : '#ef4444';
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '0.6rem' }}><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: '0.65rem', color: '#64748b' }}>{p.email}</div></td>
                                                    <td style={{ padding: '0.6rem' }}>{p.totalWorkingHours}h</td>
                                                    <td style={{ padding: '0.6rem' }}>{p.completedTasks}</td>
                                                    <td style={{ padding: '0.6rem' }}><span style={{ padding: '0.2rem 0.5rem', borderRadius: '12px', background: `${color}15`, color, fontWeight: 600, fontSize: '0.7rem' }}>{p.productivityScore}</span></td>
                                                    <td style={{ padding: '0.6rem' }}><Badge color={color}>{p.productivityScore >= 80 ? 'High' : p.productivityScore >= 50 ? 'Medium' : 'Low'}</Badge></td>
                                                </tr>
                                            );
                                        })}
                                        {productivityData.length === 0 && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No data yet</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {tab === 'predictions' && (
                        <Card>
                            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#0f172a' }}>AI productivity risk predictions</h3>
                            <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.75rem' }}>Predicted risk based on tasks and attendance</p>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}>{['Employee', 'Hours', 'Tasks', 'Completion', 'Risk score', 'Prediction'].map(h => <th key={h} style={{ padding: '0.6rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {predictions.map((p, i) => {
                                            const color = p.riskScore > 70 ? '#ef4444' : p.riskScore > 40 ? '#f59e0b' : '#10b981';
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '0.6rem' }}><div style={{ fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: '0.65rem', color: '#64748b' }}>{p.email}</div></td>
                                                    <td style={{ padding: '0.6rem' }}>{p.totalHours?.toFixed(2)}h</td>
                                                    <td style={{ padding: '0.6rem' }}>{p.completedTasks}/{p.totalTasks}</td>
                                                    <td style={{ padding: '0.6rem' }}>{(p.completionRate * 100).toFixed(0)}%</td>
                                                    <td style={{ padding: '0.6rem' }}><span style={{ padding: '0.2rem 0.5rem', borderRadius: '12px', background: `${color}15`, color, fontWeight: 600, fontSize: '0.7rem' }}>{p.riskScore}</span></td>
                                                    <td style={{ padding: '0.6rem' }}><Badge color={color}>{p.prediction}</Badge></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {tab === 'burnout' && <BurnoutDashboard />}
                </div>
            </div>

            {/* Add Employee Modal (unchanged from previous) */}
            {showAddEmployeeModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', borderRadius: '20px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Employee</h3>
                            <button onClick={() => setShowAddEmployeeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateEmployee}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Employee ID *</label>
                                <input type="text" value={newEmployee.employeeId} onChange={e => setNewEmployee({ ...newEmployee, employeeId: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="e.g., EMP001" />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Full Name *</label>
                                <input type="text" value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Email *</label>
                                <input type="email" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Department</label>
                                <input type="text" value={newEmployee.department} onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Designation</label>
                                <input type="text" value={newEmployee.designation} onChange={e => setNewEmployee({ ...newEmployee, designation: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Joining Date</label>
                                <input type="date" value={newEmployee.joiningDate} onChange={e => setNewEmployee({ ...newEmployee, joiningDate: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Role</label>
                                <select value={newEmployee.role} onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                    <option value="employee">Employee</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <button type="submit" disabled={createLoading} style={{ width: '100%', padding: '0.6rem', background: '#2e7df7', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                                {createLoading ? 'Creating...' : 'Create Employee'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;