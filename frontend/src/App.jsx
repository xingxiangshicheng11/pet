import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { connectSocket, disconnectSocket, joinRoom, joinRoleRoom } from './services/socket';
import LoginPage from './pages/login/LoginPage';
import AdminLoginPage from './pages/login/AdminLoginPage';
import ForgotPasswordPage from './pages/login/ForgotPasswordPage';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import SitterDashboard from './pages/sitter/SitterDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import MarketplacePage from './pages/marketplace/MarketplacePage';

function SocketInit({ user }) {
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    connectSocket(token);
    joinRoom(user.id);
    joinRoleRoom(user.roles);
    return () => disconnectSocket();
  }, [user]);
  return null;
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  if (roles) {
    const userRoles = (user.roles || '').split(',');
    const hasRole = roles.some(r => userRoles.includes(r));
    if (!hasRole) return <Navigate to="/login" />;
  }
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-green-600 font-medium">加载中...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading, currentRole } = useAuth();
  if (loading) return <LoadingScreen />;

  const defaultPath = user && currentRole ? '/' + currentRole.toLowerCase() : '/login';

  return (
    <>
      <SocketInit user={user} />
      <Routes>
        <Route path="/login" element={user ? <Navigate to={defaultPath} /> : <LoginPage />} />
        <Route path="/admin/login" element={user ? <Navigate to="/admin" /> : <AdminLoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/marketplace" element={<ProtectedRoute roles={['OWNER']}><MarketplacePage /></ProtectedRoute>} />
        <Route path="/owner/*" element={<ProtectedRoute roles={['OWNER']}><OwnerDashboard /></ProtectedRoute>} />
        <Route path="/sitter/*" element={<ProtectedRoute roles={['SITTER']}><SitterDashboard /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={user ? <Navigate to={defaultPath} /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
