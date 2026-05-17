import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const validateToken = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                setIsAuthenticated(false);
                return;
            }
            try {
                const { data } = await API.get('/auth/me');
                const userInfo = {
                    _id: data._id,
                    id: data._id,
                    name: data.name,
                    email: data.email,
                    employeeId: data.employeeId || null,
                    role: data.role,
                    mustChangePassword: data.mustChangePassword || false,
                };
                setUser(userInfo);
                setIsAuthenticated(true);
                localStorage.setItem('user', JSON.stringify(userInfo));
            } catch {
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
        const userInfo = {
            _id: userData._id,
            id: userData._id,
            name: userData.name,
            email: userData.email,
            employeeId: userData.employeeId || null,
            role: userData.role,
            mustChangePassword: userData.mustChangePassword || false,
        };
        localStorage.setItem('token', userData.token);
        localStorage.setItem('user', JSON.stringify(userInfo));
        setUser(userInfo);
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
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};