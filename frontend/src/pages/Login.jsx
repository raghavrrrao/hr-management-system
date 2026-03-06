import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import gsap from 'gsap';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const cardRef  = useRef(null);
    const blob1Ref = useRef(null);
    const blob2Ref = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Blob float animation
            gsap.to(blob1Ref.current, {
                y: -30, x: 20, duration: 4,
                repeat: -1, yoyo: true, ease: 'sine.inOut',
            });
            gsap.to(blob2Ref.current, {
                y: 25, x: -15, duration: 5,
                repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1,
            });

            // Card entrance
            gsap.from(cardRef.current, {
                y: 50, opacity: 0, duration: 0.8,
                ease: 'power3.out',
            });
            gsap.from('.login-field', {
                y: 20, opacity: 0, duration: 0.5,
                stagger: 0.1, delay: 0.4,
                ease: 'power2.out',
            });
        });
        return () => ctx.revert();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await API.post('/auth/login', form);
            login(data);
            gsap.to(cardRef.current, {
                y: -30, opacity: 0, duration: 0.4, ease: 'power2.in',
                onComplete: () => navigate(data.role === 'admin' ? '/admin' : '/dashboard'),
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password.');
            gsap.fromTo(cardRef.current,
                { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.3)' }
            );
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 50%, #e0e7ff 100%)',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Blobs */}
            <div ref={blob1Ref} style={{
                position: 'absolute', width: '500px', height: '500px',
                borderRadius: '50%', top: '-120px', left: '-80px',
                background: 'radial-gradient(circle, rgba(46,125,247,0.28) 0%, transparent 70%)',
                pointerEvents: 'none', filter: 'blur(10px)',
            }} />
            <div ref={blob2Ref} style={{
                position: 'absolute', width: '400px', height: '400px',
                borderRadius: '50%', bottom: '-80px', right: '-60px',
                background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)',
                pointerEvents: 'none', filter: 'blur(10px)',
            }} />

            {/* Card */}
            <div ref={cardRef} style={{
                width: '100%', maxWidth: '420px',
                background: 'rgba(255,255,255,0.70)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.85)',
                borderRadius: '24px',
                padding: '2.5rem',
                boxShadow: '0 20px 60px rgba(46,125,247,0.12), 0 4px 16px rgba(0,0,0,0.06)',
                position: 'relative', zIndex: 10,
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '52px', height: '52px', background: '#2e7df7',
                        borderRadius: '14px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 1rem',
                        fontSize: '20px', fontWeight: 700, color: 'white',
                        boxShadow: '0 4px 20px rgba(46,125,247,0.35)',
                    }}>HR</div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#0f172a' }}>
                        Welcome back
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '0.4rem', fontSize: '0.95rem' }}>
                        Sign in to your HR account
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2', border: '1px solid #fecaca',
                        color: '#dc2626', padding: '0.75rem 1rem',
                        borderRadius: '10px', marginBottom: '1.25rem',
                        fontSize: '0.875rem', fontWeight: 500,
                    }}>{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    {[
                        { field: 'email',    type: 'email',    label: 'Email',    placeholder: 'you@example.com' },
                        { field: 'password', type: 'password', label: 'Password', placeholder: '••••••••' },
                    ].map(({ field, type, label, placeholder }) => (
                        <div key={field} className="login-field" style={{ marginBottom: '1.2rem' }}>
                            <label style={{
                                display: 'block', fontSize: '0.75rem', fontWeight: 700,
                                color: '#64748b', marginBottom: '0.4rem',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>{label}</label>
                            <input
                                type={type}
                                value={form[field]}
                                onChange={e => setForm({ ...form, [field]: e.target.value })}
                                required
                                placeholder={placeholder}
                                style={{
                                    width: '100%', padding: '0.8rem 1rem',
                                    background: 'rgba(255,255,255,0.80)',
                                    border: '1px solid rgba(203,213,225,0.8)',
                                    borderRadius: '10px', color: '#0f172a',
                                    fontSize: '0.95rem', outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = '#2e7df7';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(46,125,247,0.12)';
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = 'rgba(203,213,225,0.8)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    ))}

                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '0.9rem',
                        background: loading
                            ? '#93c5fd'
                            : 'linear-gradient(135deg, #2e7df7, #1a6ae0)',
                        border: 'none', borderRadius: '12px', color: 'white',
                        fontSize: '1rem', fontWeight: 700,
                        boxShadow: '0 4px 20px rgba(46,125,247,0.30)',
                        transition: 'all 0.3s',
                        marginTop: '0.5rem',
                    }}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p style={{
                    textAlign: 'center', marginTop: '1.5rem',
                    color: '#64748b', fontSize: '0.875rem',
                }}>
                    No account?{' '}
                    <Link to="/register" style={{
                        color: '#2e7df7', textDecoration: 'none', fontWeight: 700,
                    }}>Register here</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;