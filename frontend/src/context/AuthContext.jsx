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
                const response = await API.get('/auth/me');
                const userData = response.data;
                // Store complete user info
                const userInfo = {
                    _id: userData._id,
                    name: userData.name,
                    email: userData.email,
                    employeeId: userData.employeeId,
                    role: userData.role,
                    department: userData.department,
                    designation: userData.designation,
                    mustChangePassword: userData.mustChangePassword,
                };
                setUser(userInfo);
                setIsAuthenticated(true);
                // Ensure localStorage has the latest user object
                localStorage.setItem('user', JSON.stringify(userInfo));
            } catch (error) {
                console.error('Token validation failed:', error);
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
            name: userData.name,
            email: userData.email,
            employeeId: userData.employeeId,
            role: userData.role,
            mustChangePassword: userData.mustChangePassword,
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
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};