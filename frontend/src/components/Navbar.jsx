import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={{
            background: 'rgba(255,255,255,0.80)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(226,232,240,0.8)',
            padding: '0 2rem',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 1px 12px rgba(46,125,247,0.07)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '34px', height: '34px',
                    background: 'linear-gradient(135deg, #2e7df7, #1a6ae0)',
                    borderRadius: '9px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '13px', color: 'white',
                    boxShadow: '0 2px 8px rgba(46,125,247,0.30)',
                }}>HR</div>
                <span style={{
                    fontWeight: 700, fontSize: '1.1rem',
                    letterSpacing: '-0.02em', color: '#0f172a',
                }}>HRManage</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                        {user?.name}
                    </div>
                    <div style={{
                        fontSize: '0.7rem', color: '#2e7df7',
                        textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                    }}>{user?.role}</div>
                </div>
                <button onClick={handleLogout} style={{
                    background: 'rgba(241,245,249,0.8)',
                    border: '1px solid rgba(226,232,240,0.9)',
                    color: '#64748b',
                    padding: '0.45rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                }}
                    onMouseOver={e => {
                        e.currentTarget.style.background = '#e2e8f0';
                        e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseOut={e => {
                        e.currentTarget.style.background = 'rgba(241,245,249,0.8)';
                        e.currentTarget.style.color = '#64748b';
                    }}
                >Logout</button>
            </div>
        </nav>
    );
};

export default Navbar;