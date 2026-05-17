import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import API from '../../api/axios';
import TaskCard from '../TaskCard';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Search, Plus } from 'lucide-react';

const AdminTasksTab = ({ employees }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '', description: '', assignedTo: '', startDate: '', dueDate: '', estimatedHours: 1,
        priority: 'medium', complexity: 'medium'
    });
    const [visibleCount, setVisibleCount] = useState(20);

    // Debounce search
    const timeoutRef = useRef(null);
    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timeoutRef.current);
    }, [search]);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await API.get('/tasks');
            const tasksArray = Array.isArray(res.data) ? res.data : (res.data?.tasks || []);
            setTasks(tasksArray);
        } catch (err) {
            console.error('Failed to fetch tasks', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Update local task without full refetch
    const updateLocalTask = (taskId, updatedFields) => {
        setTasks(prev => prev.map(task =>
            task._id === taskId ? { ...task, ...updatedFields } : task
        ));
    };

    const handleProgressUpdate = async (taskId, progress) => {
        try {
            const res = await API.put(`/tasks/${taskId}/progress`, { progress });
            updateLocalTask(taskId, { progress: res.data.task.progress, status: res.data.task.status });
        } catch (err) {
            console.error('Progress update failed', err);
        }
    };

    const handleStatusUpdate = async (taskId, status) => {
        try {
            const res = await API.put(`/tasks/${taskId}/status`, { status });
            updateLocalTask(taskId, { status: res.data.task.status, progress: res.data.task.progress });
        } catch (err) {
            console.error('Status update failed', err);
            alert('Failed to update status. Please try again.');
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const res = await API.post('/tasks', newTask);
            setTasks(prev => [res.data.task, ...prev]);
            setShowCreateForm(false);
            setNewTask({ title: '', description: '', assignedTo: '', startDate: '', dueDate: '', estimatedHours: 1, priority: 'medium', complexity: 'medium' });
        } catch (err) {
            alert(err.response?.data?.message || 'Task creation failed');
        }
    };

    const filteredTasks = useMemo(() => {
        let filtered = tasks;
        if (debouncedSearch) {
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                t.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
            );
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.status === statusFilter);
        }
        return filtered;
    }, [tasks, debouncedSearch, statusFilter]);

    const visibleTasks = useMemo(() => filteredTasks.slice(0, visibleCount), [filteredTasks, visibleCount]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading tasks...</div>;

    return (
        <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>All Tasks ({filteredTasks.length})</h3>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.4rem 0.4rem 0.4rem 2rem', borderRadius: '30px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '200px' }} />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.4rem 0.6rem', borderRadius: '30px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}>
                        <option value="all">All status</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="completed">Completed</option>
                        <option value="overdue">Overdue</option>
                    </select>
                    <Button variant="primary" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}><Plus size={16} /> New Task</Button>
                </div>
            </div>

            {showCreateForm && (
                <form onSubmit={handleCreateTask} style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '0.75rem' }}>
                        <input type="text" placeholder="Title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <textarea placeholder="Description" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} required rows={2} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <select value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} required style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            <option value="">Assign to</option>
                            {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                        </select>
                        <input type="date" value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})} required style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} required style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <input type="number" placeholder="Est. hours" value={newTask.estimatedHours} onChange={e => setNewTask({...newTask, estimatedHours: e.target.value})} required style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            <option value="low">Low priority</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                        <select value={newTask.complexity} onChange={e => setNewTask({...newTask, complexity: e.target.value})} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                    <Button type="submit" variant="primary" fullWidth style={{ marginTop: '1rem' }}>Create Task</Button>
                </form>
            )}

            <div>
                {visibleTasks.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No tasks found</div>}
                {visibleTasks.map(task => (
                    <TaskCard
                        key={task._id}
                        task={task}
                        onProgressUpdate={handleProgressUpdate}
                        onStatusUpdate={handleStatusUpdate}
                        isAdmin
                    />
                ))}
                {filteredTasks.length > visibleCount && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setVisibleCount(prev => prev + 20)}>
                            Load more ({visibleCount} / {filteredTasks.length})
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default AdminTasksTab;