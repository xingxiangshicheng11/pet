import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import socket from '../../services/socket';
import UsersPage from './UsersPage';
import ServicesPage from './ServicesPage';

const navItems = [
  { path: '/admin', label: '系统概览', icon: '📊' },
  { path: '/admin/users', label: '用户管理', icon: '👥' },
  { path: '/admin/services', label: '服务监控', icon: '📋' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [alerts, setAlerts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    socket.on('admin:alert', (alert) => {
      setAlerts(prev => [{ ...alert, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    });
    return () => socket.off('admin:alert');
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <aside className={'fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col ' + (sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="bg-gray-800 p-6 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">⚙️</span>
            <h1 className="text-xl font-bold text-white">管理后台</h1>
          </div>
          <p className="text-gray-400 text-xs">管理员: {user?.name}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = loc.pathname === item.path;
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={'w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-all ' + (active ? 'bg-green-600/20 text-green-400 font-medium' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200')}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {active && <span className="ml-auto w-1.5 h-6 bg-green-500 rounded-full" />}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button onClick={() => { logout(); navigate('/admin/login'); }}
            className="w-full text-left text-sm text-red-400 hover:text-red-300 py-2">
            退出登录
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="bg-gray-800 shadow-sm sticky top-0 z-20 lg:hidden border-b border-gray-700">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-300 text-2xl">☰</button>
            <span className="font-bold text-gray-300">⚙️ 管理后台</span>
            <div />
          </div>
        </header>
        <main className="p-4 lg:p-8">
          <Routes>
            <Route index element={<AdminHome alerts={alerts} />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="services" element={<ServicesPage />} />
          </Routes>
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

function AdminHome({ alerts }) {
  const [stats, setStats] = useState({ users: 0, sitters: 0, owners: 0, services: 0, completed: 0, revenue: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [u, s] = await Promise.all([
          api.get('/admin/users'),
          api.get('/services'),
        ]);
        const roles = u.data.map(x => (x.roles || x.role || ''));
        setStats({
          users: u.data.length,
          sitters: roles.filter(r => r.includes('SITTER')).length,
          owners: roles.filter(r => r.includes('OWNER')).length,
          services: s.data.length,
          completed: s.data.filter(x => x.status === 'COMPLETED').length,
          revenue: s.data.filter(x => x.status === 'COMPLETED').reduce((sum, x) => sum + x.price, 0),
        });
      } catch {}
    };
    load();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">系统概览</h2>
        <p className="text-gray-400 text-sm mt-1">宠物服务平台运行数据</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[
          { label: '总用户', value: stats.users, icon: '👥', color: 'text-blue-400' },
          { label: '宠物主', value: stats.owners, icon: '🐱', color: 'text-green-400' },
          { label: '接单者', value: stats.sitters, icon: '🦮', color: 'text-yellow-400' },
          { label: '总服务', value: stats.services, icon: '📋', color: 'text-purple-400' },
          { label: '已完成', value: stats.completed, icon: '✅', color: 'text-green-400' },
          { label: '总收入', value: '¥' + stats.revenue, icon: '💰', color: 'text-yellow-400' },
        ].map((item, i) => (
          <div key={i} className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{item.icon}</span>
              <span className={'text-xs px-2 py-1 rounded-full bg-gray-700 ' + item.color}>{item.label}</span>
            </div>
            <p className={'text-2xl font-bold ' + item.color}>{item.value}</p>
          </div>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔔</span> 实时告警 ({alerts.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm bg-gray-700/50 p-3 rounded-xl">
                <span className="text-gray-400 w-16 text-xs">{a.time}</span>
                <span className={'w-2 h-2 rounded-full ' + (a.type === 'service_new' ? 'bg-green-400' : a.type === 'service_accepted' ? 'bg-yellow-400' : 'bg-blue-400')} />
                <span className="text-gray-300">
                  {a.type === 'service_new' ? '新服务发布' : a.type === 'service_accepted' ? '服务被接单' : a.type}
                </span>
                {a.service?.title && <span className="text-gray-500">- {a.service.title}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
