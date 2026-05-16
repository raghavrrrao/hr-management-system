import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Validate token on app load
    useEffect(() => {
        const validateToken = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                setIsAuthenticated(false);
                return;
            }

            try {
                // Optional: verify token with backend
                const response = await API.get('/auth/me');
                const userData = response.data;
                // Ensure we have user data and role
                setUser({
                    _id: userData._id,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                });
                setIsAuthenticated(true);
                // Also update stored user object
                localStorage.setItem('user', JSON.stringify({
                    _id: userData._id,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                }));
            } catch (error) {
                // Token invalid or expired – clear storage
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        validateToken();
    }, []);

    const login = (userData) => {
        localStorage.setItem('token', userData.token);
        localStorage.setItem('user', JSON.stringify({
            _id: userData._id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
        }));
        setUser({
            _id: userData._id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
        });
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};