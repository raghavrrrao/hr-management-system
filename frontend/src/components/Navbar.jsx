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
            background: 'var(--navy-mid)',
            borderBottom: '1px solid var(--border)',
            padding: '0 2rem',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '32px', height: '32px', background: 'var(--accent)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '14px'
                }}>HR</div>
                <span style={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                    HRManage
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.name}</div>
                    <div style={{
                        fontSize: '0.75rem', color: 'var(--accent)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600
                    }}>{user?.role}</div>
                </div>
                <button onClick={handleLogout} style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', padding: '0.5rem 1rem',
                    borderRadius: '8px', fontSize: '0.875rem', transition: 'all 0.2s',
                }}
                    onMouseOver={e => e.target.style.borderColor = 'var(--accent)'}
                    onMouseOut={e => e.target.style.borderColor = 'var(--border)'}
                >Logout</button>
            </div>
        </nav>
    );
};

export default Navbar;