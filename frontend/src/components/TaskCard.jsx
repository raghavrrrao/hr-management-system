import React from 'react';
import { Calendar, Clock } from 'lucide-react';

const priorityColors = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
};

const statusColors = {
    pending: '#64748b',
    'in-progress': '#3b82f6',
    review: '#8b5cf6',
    completed: '#10b981',
    overdue: '#ef4444',
    blocked: '#6b7280',
    'on-hold': '#9ca3af'
};

const TaskCard = ({ task, onProgressUpdate, onStatusUpdate, isAdmin = false }) => {
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    const isOverdue = task.status === 'overdue' || (dueDate < today && task.progress < 100);

    const handleProgressChange = (e) => {
        const newProgress = parseInt(e.target.value);
        onProgressUpdate(task._id, newProgress);
    };

    const handleStatusChange = (e) => {
        onStatusUpdate(task._id, e.target.value);
    };

    return (
        <div style={{
            background: 'white',
            borderRadius: '12px',
            border: `1px solid ${isOverdue ? '#ef4444' : '#e2e8f0'}`,
            padding: '1rem',
            marginBottom: '0.75rem',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#0f172a' }}>{task.title}</h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{task.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.7rem', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> {new Date(task.startDate).toLocaleDateString()} → {new Date(task.dueDate).toLocaleDateString()}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {task.estimatedHours}h est.</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, background: `${priorityColors[task.priority]}20`, color: priorityColors[task.priority] }}>
                        {task.priority}
                    </span>
                    <select value={task.status} onChange={handleStatusChange} style={{ padding: '0.2rem 0.4rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.7rem', background: 'white' }}>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="completed">Completed</option>
                        <option value="blocked">Blocked</option>
                        <option value="on-hold">On Hold</option>
                    </select>
                </div>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.7rem' }}>
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                </div>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${task.progress}%`, height: '100%', background: '#2e7df7', borderRadius: '3px' }} />
                </div>
                {!isAdmin && (
                    <input type="range" min="0" max="100" value={task.progress} onChange={handleProgressChange} style={{ width: '100%', marginTop: '0.5rem' }} />
                )}
            </div>

            {task.workLogs && task.workLogs.length > 0 && (
                <details style={{ marginTop: '0.75rem', fontSize: '0.7rem' }}>
                    <summary style={{ cursor: 'pointer', color: '#64748b' }}>Work log ({task.workLogs.length})</summary>
                    <div style={{ marginTop: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
                        {task.workLogs.slice(-3).reverse().map((log, idx) => (
                            <div key={idx} style={{ padding: '0.25rem 0', borderBottom: '1px solid #f1f5f9' }}>
                                {new Date(log.date).toLocaleDateString()} – {log.progress}% ({log.hoursWorked}h) – {log.notes}
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
};

export default TaskCard;