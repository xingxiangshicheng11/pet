import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

function storeTokens(data) {
  localStorage.setItem('token', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('userId', String(data.user.id));
}

function clearTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('currentRole');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('currentRole') || '');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me').then((res) => {
        setUser(res.data);
        localStorage.setItem('userId', String(res.data.id));
        if (!currentRole) {
          const firstRole = res.data.roles?.split(',')[0] || 'OWNER';
          setCurrentRole(firstRole);
          localStorage.setItem('currentRole', firstRole);
        }
      }).catch(() => {
        clearTokens();
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    storeTokens(res.data);
    const roles = res.data.user.roles || 'OWNER';
    const firstRole = roles.split(',')[0];
    setCurrentRole(firstRole);
    localStorage.setItem('currentRole', firstRole);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    storeTokens(res.data);
    const roles = res.data.user.roles || 'OWNER';
    const firstRole = roles.split(',')[0];
    setCurrentRole(firstRole);
    localStorage.setItem('currentRole', firstRole);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setCurrentRole('');
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch {}
  };

  const switchRole = (role) => {
    setCurrentRole(role);
    localStorage.setItem('currentRole', role);
  };

  const roleList = user?.roles?.split(',') || [];

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, currentRole, switchRole, roleList }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
