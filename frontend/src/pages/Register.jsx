import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await API.post('/auth/register', form);
            login(data);
            navigate(data.role === 'admin' ? '/admin' : '/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '2rem',
            background: 'radial-gradient(ellipse at 40% 50%, #1a2f4a 0%, #0f1c2e 70%)',
        }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '52px', height: '52px', background: 'var(--accent)',
                        borderRadius: '14px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 1rem',
                        fontSize: '20px', fontWeight: 700, boxShadow: '0 8px 32px rgba(46,125,247,0.3)'
                    }}>HR</div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Create account</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                        Join your HR management system
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '16px', padding: '2rem', backdropFilter: 'blur(10px)',
                }}>
                    {error && (
                        <div style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px',
                            marginBottom: '1.25rem', fontSize: '0.875rem'
                        }}>{error}</div>
                    )}

                    {[
                        { field: 'name', type: 'text', label: 'Full Name' },
                        { field: 'email', type: 'email', label: 'Email' },
                        { field: 'password', type: 'password', label: 'Password' },
                    ].map(({ field, type, label }) => (
                        <div key={field} style={{ marginBottom: '1.25rem' }}>
                            <label style={{
                                display: 'block', fontSize: '0.8rem', fontWeight: 600,
                                color: 'var(--text-secondary)', marginBottom: '0.5rem',
                                textTransform: 'uppercase', letterSpacing: '0.05em'
                            }}>{label}</label>
                            <input
                                type={type}
                                value={form[field]}
                                onChange={e => setForm({ ...form, [field]: e.target.value })}
                                required
                                style={{
                                    width: '100%', padding: '0.75rem 1rem',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                    borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.95rem',
                                    outline: 'none', transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                    ))}

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block', fontSize: '0.8rem', fontWeight: 600,
                            color: 'var(--text-secondary)', marginBottom: '0.5rem',
                            textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>Role</label>
                        <select
                            value={form.role}
                            onChange={e => setForm({ ...form, role: e.target.value })}
                            style={{
                                width: '100%', padding: '0.75rem 1rem',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.95rem',
                                outline: 'none',
                            }}
                        >
                            <option value="employee" style={{ background: '#0f1c2e' }}>Employee</option>
                            <option value="admin" style={{ background: '#0f1c2e' }}>Admin</option>
                        </select>
                    </div>

                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '0.875rem',
                        background: loading ? 'var(--navy-light)' : 'var(--accent)',
                        border: 'none', borderRadius: '10px', color: 'white',
                        fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.2s',
                        boxShadow: loading ? 'none' : '0 4px 20px rgba(46,125,247,0.3)',
                    }}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;