import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import TaskCard from '../TaskCard';
import Card from '../ui/Card';
import { Search } from 'lucide-react';

const EmployeeTasksTab = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    const fetchTasks = async () => {
        try {
            const res = await API.get('/tasks/my');
            setTasks(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };
    
    useEffect(() => { fetchTasks(); }, []);
    
    const handleProgressUpdate = async (taskId, progress) => {
        await API.put(`/tasks/${taskId}/progress`, { progress });
        fetchTasks();
    };
    
    const handleStatusUpdate = async (taskId, status) => {
        await API.put(`/tasks/${taskId}/status`, { status });
        fetchTasks();
    };
    
    const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()));
    
    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading tasks...</div>;
    
    return (
        <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>My Tasks</h3>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.4rem 0.4rem 0.4rem 2rem', borderRadius: '30px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '200px' }} />
                </div>
            </div>
            <div>
                {filteredTasks.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No tasks assigned</div>}
                {filteredTasks.map(task => (
                    <TaskCard key={task._id} task={task} onProgressUpdate={handleProgressUpdate} onStatusUpdate={handleStatusUpdate} isAdmin={false} />
                ))}
            </div>
        </Card>
    );
};

export default EmployeeTasksTab;