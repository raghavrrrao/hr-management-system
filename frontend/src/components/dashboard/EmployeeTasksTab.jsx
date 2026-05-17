import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import API from '../../api/axios';
import TaskCard from '../TaskCard';
import Card from '../ui/Card';
import { Search } from 'lucide-react';

const EmployeeTasksTab = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);

    const timeoutRef = useRef(null);
    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timeoutRef.current);
    }, [search]);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await API.get('/tasks/my');
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

    const filteredTasks = useMemo(() => {
        if (!debouncedSearch) return tasks;
        return tasks.filter(t =>
            t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            t.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [tasks, debouncedSearch]);

    const visibleTasks = useMemo(() => filteredTasks.slice(0, visibleCount), [filteredTasks, visibleCount]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading tasks...</div>;

    return (
        <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>My Tasks ({filteredTasks.length})</h3>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ padding: '0.4rem 0.4rem 0.4rem 2rem', borderRadius: '30px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '200px' }}
                    />
                </div>
            </div>
            <div>
                {visibleTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No tasks assigned</div>
                )}
                {visibleTasks.map(task => (
                    <TaskCard
                        key={task._id}
                        task={task}
                        onProgressUpdate={handleProgressUpdate}
                        onStatusUpdate={handleStatusUpdate}
                        isAdmin={false}
                    />
                ))}
                {filteredTasks.length > visibleCount && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button onClick={() => setVisibleCount(prev => prev + 20)} style={{ padding: '0.4rem 1rem', background: '#2e7df7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                            Load more ({visibleCount} / {filteredTasks.length})
                        </button>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default EmployeeTasksTab;