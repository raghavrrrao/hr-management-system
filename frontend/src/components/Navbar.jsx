import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Building2 } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '64px',
            background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1000,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '16px',
                    color: 'white',
                }}>
                    <Building2 size={20} color="white" />
                </div>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>HRManage</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{user?.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>{user?.role}</div>
                </div>
                <button onClick={handleLogout} style={{
                    padding: '0.4rem 1rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                    <LogOut size={16} />
                    <span>Logout</span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;