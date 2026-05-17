import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import gsap from 'gsap';

const Login = () => {
    const [form, setForm] = useState({ identifier: '', password: '' });
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
            gsap.from(gridRef.current, { opacity: 0, duration: 1.2, ease: 'power2.out' });
            gsap.to(orb1Ref.current, { y: -40, x: 25, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            gsap.to(orb2Ref.current, { y: 35, x: -20, duration: 7.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.2 });
            gsap.to(orb3Ref.current, { y: -25, x: -30, duration: 5.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.6 });
            gsap.from(leftRef.current, { x: -60, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.1 });
            gsap.from(cardRef.current, { x: 60, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.2 });
            gsap.from('.lf-field', { y: 24, opacity: 0, duration: 0.6, stagger: 0.1, delay: 0.5, ease: 'power2.out' });
        });
        return () => ctx.revert();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await API.post('/auth/login', {
                identifier: form.identifier,
                password: form.password,
            });

            login(data);

            localStorage.setItem('user', JSON.stringify({
                _id: data._id, id: data._id,
                role: data.role, name: data.name,
                employeeId: data.employeeId || null,
            }));

            gsap.to(cardRef.current, {
                y: -20, opacity: 0, duration: 0.4, ease: 'power2.in',
                onComplete: () => {
                    if (data.mustChangePassword) navigate('/change-password');
                    else navigate(data.role === 'admin' ? '/admin' : '/dashboard');
                },
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
            gsap.fromTo(cardRef.current, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.3)' });
        }
        setLoading(false);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                .login-root { font-family: 'Sora', sans-serif; }
                .lf-input { width:100%; padding:0.875rem 1rem 0.875rem 2.75rem; background:rgba(15,23,42,0.04); border:1.5px solid rgba(148,163,184,0.25); border-radius:12px; color:#0f172a; font-size:0.9rem; font-family:'Sora',sans-serif; outline:none; transition:border-color 0.2s,background 0.2s,box-shadow 0.2s; box-sizing:border-box; }
                .lf-input:focus { border-color:#2e7df7; background:rgba(46,125,247,0.04); box-shadow:0 0 0 4px rgba(46,125,247,0.09); }
                .lf-input::placeholder { color:#94a3b8; }
                .lf-btn { width:100%; padding:0.95rem; background:linear-gradient(135deg,#1d4ed8 0%,#2e7df7 60%,#38bdf8 100%); border:none; border-radius:12px; color:white; font-family:'Sora',sans-serif; font-size:0.95rem; font-weight:700; cursor:pointer; transition:all 0.3s; position:relative; overflow:hidden; box-shadow:0 4px 20px rgba(46,125,247,0.35); }
                .lf-btn:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 8px 28px rgba(46,125,247,0.45); }
                .lf-btn:not(:disabled):active { transform:translateY(0); }
                .lf-btn:disabled { opacity:0.65; cursor:not-allowed; }
                .lf-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(255,255,255,0.15),transparent); pointer-events:none; }
                .lf-stat-val { font-size:1.6rem; font-weight:800; color:#fff; line-height:1; font-family:'JetBrains Mono',monospace; }
                .lf-stat-label { font-size:0.7rem; color:rgba(255,255,255,0.55); text-transform:uppercase; letter-spacing:0.07em; font-weight:500; }
                .lf-feature { display:flex; align-items:flex-start; gap:0.85rem; }
                .lf-feature-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; background:rgba(56,189,248,0.15); color:#38bdf8; }
                .lf-dot { animation:pulse-dot 2s infinite; }
                @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (max-width:768px) { .lf-left{display:none !important;} .lf-right{border-radius:0 !important;} .lf-wrap{padding:0 !important;min-height:100vh;} .lf-right-inner{max-width:100% !important;padding:2rem 1.5rem !important;} }
            `}</style>

            <div className="login-root" style={{ minHeight: '100vh', display: 'flex', background: '#f0f4ff', position: 'relative', overflow: 'hidden' }}>
                <div ref={gridRef} style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `linear-gradient(rgba(46,125,247,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(46,125,247,0.06) 1px,transparent 1px)`, backgroundSize: '48px 48px', pointerEvents: 'none' }} />
                <div ref={orb1Ref} style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', top: -200, left: -100, background: 'radial-gradient(circle,rgba(46,125,247,0.18) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
                <div ref={orb2Ref} style={{ position: 'absolute', width: 450, height: 450, borderRadius: '50%', bottom: -120, right: -80, background: 'radial-gradient(circle,rgba(56,189,248,0.14) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
                <div ref={orb3Ref} style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', top: '40%', left: '30%', background: 'radial-gradient(circle,rgba(99,102,241,0.10) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

                <div className="lf-wrap" style={{ display: 'flex', width: '100%', position: 'relative', zIndex: 1, padding: '1.5rem', gap: '1.5rem', alignItems: 'center', justifyContent: 'center' }}>

                    {/* LEFT PANEL */}
                    <div ref={leftRef} className="lf-left" style={{ flex: '0 0 460px', background: 'linear-gradient(145deg,#0f172a 0%,#1e3a5f 50%,#1d4ed8 100%)', borderRadius: '24px', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '580px', position: 'relative', overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}>
                        <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', top: -80, right: -60, background: 'radial-gradient(circle,rgba(56,189,248,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', bottom: -60, left: -40, background: 'radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                                <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#38bdf8,#2e7df7)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', color: 'white', fontFamily: 'JetBrains Mono,monospace' }}>HR</div>
                                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'rgba(255,255,255,0.9)' }}>HRManage</span>
                            </div>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.03em' }}>
                                Your team,<br />
                                <span style={{ background: 'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>one dashboard.</span>
                            </h2>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.65 }}>AI-enhanced HR — attendance, burnout, payroll, and productivity in real time.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 1 }}>
                            {[
                                { icon: '📍', bg: 'rgba(56,189,248,0.15)', label: 'GPS-verified attendance', sub: 'Check in from within office perimeter' },
                                { icon: '🧠', bg: 'rgba(99,102,241,0.15)', label: 'Burnout early warning', sub: 'AI-driven wellness risk detection' },
                                { icon: '📊', bg: 'rgba(16,185,129,0.15)', label: 'Real-time analytics', sub: 'Live dashboards with WebSocket updates' },
                            ].map(({ icon, bg, label, sub }) => (
                                <div key={label} className="lf-feature">
                                    <div className="lf-feature-icon" style={{ background: bg }}>{icon}</div>
                                    <div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{label}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.42)' }}>{sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 1 }}>
                            {[{ val: '99.9%', label: 'Uptime' }, { val: '< 50ms', label: 'Latency' }, { val: 'AES-256', label: 'Encrypted' }].map(({ val, label }) => (
                                <div key={label}><div className="lf-stat-val">{val}</div><div className="lf-stat-label">{label}</div></div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div ref={cardRef} className="lf-right" style={{ flex: '0 0 420px', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.9)', borderRadius: '24px', boxShadow: '0 16px 48px rgba(46,125,247,0.10)', display: 'flex', flexDirection: 'column' }}>
                        <div className="lf-right-inner" style={{ padding: '2.75rem' }}>
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.09)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '999px', padding: '4px 10px', marginBottom: '1.25rem' }}>
                                    <span className="lf-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#059669', letterSpacing: '0.04em' }}>SECURE ACCESS</span>
                                </div>
                                <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.7rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.15 }}>Sign in</h1>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Use your email address or Employee ID.</p>
                            </div>

                            {error && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.8rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.845rem', fontWeight: 500 }}>
                                    <span>!</span>{error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                                {[
                                    {
                                        field: 'identifier', type: 'text', label: 'Email or Employee ID', placeholder: 'you@company.com or EMP1001',
                                        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    },
                                    {
                                        field: 'password', type: 'password', label: 'Password', placeholder: '••••••••••',
                                        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    },
                                ].map(({ field, type, label, placeholder, icon }) => (
                                    <div key={field} className="lf-field">
                                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: focused === field ? '#2e7df7' : '#64748b', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.07em', transition: 'color 0.2s' }}>{label}</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: focused === field ? '#2e7df7' : '#94a3b8', transition: 'color 0.2s', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>{icon}</div>
                                            <input className="lf-input" type={type} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} required placeholder={placeholder} onFocus={() => setFocused(field)} onBlur={() => setFocused('')} autoComplete={field === 'password' ? 'current-password' : 'username'} />
                                        </div>
                                    </div>
                                ))}
                                <div className="lf-field" style={{ marginTop: '0.5rem' }}>
                                    <button type="submit" disabled={loading} className="lf-btn">
                                        {loading ? (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                                Signing in…
                                            </span>
                                        ) : 'Sign In →'}
                                    </button>
                                </div>
                            </form>

                            {/* Removed the "NEW HERE?" registration link entirely */}

                            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.72rem', lineHeight: 1.6 }}>
                                New employees: use your Employee ID<br />and temporary password <strong>Temp@1234</strong>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;