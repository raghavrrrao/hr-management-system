import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import gsap from 'gsap';
import { LogIn, Mail, Lock } from 'lucide-react';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const cardRef = useRef(null);
    const leftRef = useRef(null);
    const orb1Ref = useRef(null);
    const orb2Ref = useRef(null);
    const orb3Ref = useRef(null);
    const gridRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(gridRef.current, { opacity: 0, duration: 1.2 });
            gsap.to(orb1Ref.current, { y: -40, x: 25, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to(orb2Ref.current, { y: 35, x: -20, duration: 7.5, repeat: -1, yoyo: true, delay: 1.2 });
            gsap.to(orb3Ref.current, { y: -25, x: -30, duration: 5.5, repeat: -1, yoyo: true, delay: 0.6 });
            gsap.from(leftRef.current, { x: -60, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.1 });
            gsap.from(cardRef.current, { x: 60, opacity: 0, duration: 1, delay: 0.2 });
            gsap.from('.lf-field', { y: 24, opacity: 0, duration: 0.6, stagger: 0.1, delay: 0.5 });
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
            // store additional flag for mustChangePassword
            if (data.mustChangePassword) {
                // redirect to change password page
                navigate('/change-password');
            } else {
                navigate(data.role === 'admin' ? '/admin' : '/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials');
            gsap.fromTo(cardRef.current, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.3)' });
        }
        setLoading(false);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                .login-root { font-family: 'Sora', sans-serif; }
                .lf-input {
                    width: 100%;
                    padding: 0.875rem 1rem 0.875rem 2.75rem;
                    background: rgba(15, 23, 42, 0.04);
                    border: 1.5px solid rgba(148, 163, 184, 0.25);
                    border-radius: 12px;
                    color: #0f172a;
                    font-size: 0.9rem;
                    outline: none;
                    transition: all 0.2s;
                    box-sizing: border-box;
                }
                .lf-input:focus {
                    border-color: #2e7df7;
                    background: rgba(46, 125, 247, 0.04);
                    box-shadow: 0 0 0 4px rgba(46, 125, 247, 0.09);
                }
                .lf-btn {
                    width: 100%;
                    padding: 0.95rem;
                    background: linear-gradient(135deg, #1d4ed8 0%, #2e7df7 60%, #38bdf8 100%);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 4px 20px rgba(46, 125, 247, 0.35);
                }
                .lf-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(46,125,247,0.45); }
                .lf-btn:disabled { opacity: 0.65; cursor: not-allowed; }
                @media (max-width: 768px) {
                    .lf-left { display: none !important; }
                    .lf-right { border-radius: 0 !important; }
                    .lf-wrap { padding: 0 !important; min-height: 100vh; }
                }
            `}</style>
            <div className="login-root" style={{ minHeight: '100vh', display: 'flex', background: '#f0f4ff', position: 'relative', overflow: 'hidden' }}>
                <div ref={gridRef} style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(46,125,247,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(46,125,247,0.06) 1px, transparent 1px)`, backgroundSize: '48px 48px', pointerEvents: 'none' }} />
                <div ref={orb1Ref} style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', top: -200, left: -100, background: 'radial-gradient(circle, rgba(46,125,247,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div ref={orb2Ref} style={{ position: 'absolute', width: 450, height: 450, borderRadius: '50%', bottom: -120, right: -80, background: 'radial-gradient(circle, rgba(56,189,248,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div ref={orb3Ref} style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', top: '40%', left: '30%', background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div className="lf-wrap" style={{ display: 'flex', width: '100%', position: 'relative', zIndex: 1, padding: '1.5rem', gap: '1.5rem', alignItems: 'center', justifyContent: 'center' }}>
                    <div ref={leftRef} className="lf-left" style={{ flex: '0 0 460px', background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)', borderRadius: '24px', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '580px', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                                <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, #38bdf8, #2e7df7)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', color: 'white' }}>HR</div>
                                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'rgba(255,255,255,0.9)' }}>HRManage</span>
                            </div>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Enterprise HRMS<br /><span style={{ background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>secure access only</span></h2>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.65 }}>Company‑managed accounts. Contact your administrator for credentials.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { icon: '📍', label: 'GPS attendance', sub: 'Office perimeter check‑in' },
                                { icon: '🧠', label: 'Burnout prevention', sub: 'AI‑driven wellness monitoring' },
                                { icon: '📊', label: 'Real‑time analytics', sub: 'Live dashboards & WebSocket updates' },
                            ].map(({ icon, label, sub }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>{icon}</div>
                                    <div><div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{label}</div><div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)' }}>{sub}</div></div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono' }}>99.9%</div><div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>Uptime</div></div>
                            <div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono' }}>&lt;50ms</div><div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>Latency</div></div>
                            <div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono' }}>AES-256</div><div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>Encrypted</div></div>
                        </div>
                    </div>

                    <div ref={cardRef} className="lf-right" style={{ flex: '0 0 420px', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', borderRadius: '24px', boxShadow: '0 16px 48px rgba(46,125,247,0.10)' }}>
                        <div style={{ padding: '2.75rem' }}>
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.09)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '999px', padding: '4px 10px', marginBottom: '1.25rem' }}>
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#059669' }}>SECURE ACCESS</span>
                                </div>
                                <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.7rem', fontWeight: 800, color: '#0f172a' }}>Sign in</h1>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Use your company‑issued credentials</p>
                            </div>

                            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.8rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.845rem' }}>{error}</div>}

                            <form onSubmit={handleSubmit}>
                                {[
                                    { field: 'email', type: 'email', label: 'Email address', placeholder: 'you@company.com', icon: <Mail size={15} /> },
                                    { field: 'password', type: 'password', label: 'Password', placeholder: '••••••••', icon: <Lock size={15} /> },
                                ].map(({ field, type, label, placeholder, icon }) => (
                                    <div key={field} className="lf-field" style={{ marginBottom: '1.1rem' }}>
                                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: focused === field ? '#2e7df7' : '#64748b', marginBottom: '0.45rem', display: 'block' }}>{label}</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: focused === field ? '#2e7df7' : '#94a3b8' }}>{icon}</div>
                                            <input className="lf-input" type={type} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} required placeholder={placeholder} onFocus={() => setFocused(field)} onBlur={() => setFocused('')} />
                                        </div>
                                    </div>
                                ))}
                                <button type="submit" disabled={loading} className="lf-btn">{loading ? 'Signing in...' : 'Sign in'}</button>
                            </form>
                            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.72rem', lineHeight: 1.6 }}>Accounts are created by administrators only.<br />Contact HR for access.</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;