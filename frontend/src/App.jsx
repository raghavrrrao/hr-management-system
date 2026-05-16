import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ToastContainer from './components/ToastContainer';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastContainer />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Protected routes – require authentication */}
            <Route path="/change-password" element={
              <PrivateRoute>
                <ChangePassword />
              </PrivateRoute>
            } />

            {/* Employee dashboard – accessible to any authenticated user (including admin, but admin will be redirected to /admin by PrivateRoute's adminOnly logic? Actually, we want admin to see admin dashboard, but if an admin tries /dashboard they should see employee dashboard or be redirected? We'll allow admin to see employee dashboard, but they have separate /admin. We'll keep as is. */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <EmployeeDashboard />
              </PrivateRoute>
            } />

            {/* Admin dashboard – accessible only to users with role 'admin' */}
            <Route path="/admin" element={
              <PrivateRoute adminOnly>
                <AdminDashboard />
              </PrivateRoute>
            } />

            {/* Catch all – redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;