import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PrivateRoute – protects routes from unauthenticated access.
 * If adminOnly = true, only users with role 'admin' are allowed.
 */
const PrivateRoute = ({ children, adminOnly = false }) => {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
        // Show nothing while checking authentication (prevents flash of redirect)
        return null;
    }

    if (!isAuthenticated) {
        // Not logged in – redirect to login
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && user?.role !== 'admin') {
        // Logged in but not admin – redirect to employee dashboard
        return <Navigate to="/dashboard" replace />;
    }

    // All checks passed – render the protected component
    return children;
};

export default PrivateRoute;