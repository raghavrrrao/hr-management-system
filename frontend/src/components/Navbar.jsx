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
            background: '#ffffff',
            borderBottom: '1px solid var(--border)',
            padding: '0 2rem',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '32px', height: '32px', background: 'var(--accent)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '14px', color: 'white',
                }}>HR</div>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    HRManage
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                    <div style={{
                        fontSize: '0.7rem', color: 'var(--accent)',
                        textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                    }}>{user?.role}</div>
                </div>
                <button onClick={handleLogout} style={{
                    background: '#f1f5f9',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    padding: '0.5rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                }}
                    onMouseOver={e => { e.target.style.background = '#e2e8f0'; e.target.style.color = 'var(--text-primary)'; }}
                    onMouseOut={e => { e.target.style.background = '#f1f5f9'; e.target.style.color = 'var(--text-secondary)'; }}
                >Logout</button>
            </div>
        </nav>
    );
};

export default Navbar;