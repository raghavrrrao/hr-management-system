import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { Lock, Eye, EyeOff } from 'lucide-react';

const ChangePassword = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await API.post('/auth/change-password', { newPassword });
            // After successful change, redirect to dashboard
            navigate(user?.role === 'admin' ? '/admin' : '/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)',
            padding: '1rem'
        }}>
            <div style={{
                maxWidth: '400px',
                width: '100%',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(16px)',
                borderRadius: '24px',
                padding: '2rem',
                boxShadow: '0 16px 48px rgba(0,0,0,0.1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: '#2e7df7',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        <Lock size={24} color="white" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Change your password</h2>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        This is your first login. Please set a new password.
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        fontSize: '0.8rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>New password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.7rem 2.5rem 0.7rem 1rem',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Confirm new password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.7rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            background: 'linear-gradient(135deg,#2e7df7,#1a6ae0)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Updating...' : 'Update password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;