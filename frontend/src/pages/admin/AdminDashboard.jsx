import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import socket from '../../services/socket';
import UsersPage from './UsersPage';
import ServicesPage from './ServicesPage';
import AdminStatsPage from './AdminStatsPage';
import AdminWithdrawalsPage from './AdminWithdrawalsPage';
import AdminEmergenciesPage from './AdminEmergenciesPage';
import AdminReviewsPage from './AdminReviewsPage';
import AdminPaymentsPage from './AdminPaymentsPage';
import AdminProductsPage from './AdminProductsPage';
import AdminNotificationsPage from './AdminNotificationsPage';
import AdminSettingsPage from './AdminSettingsPage';
import AdminLogsPage from './AdminLogsPage';

const navItems = [
  { path: '/admin', label: '系统概览', icon: '📊' },
  { path: '/admin/stats', label: '数据统计', icon: '📈' },
  { path: '/admin/users', label: '用户管理', icon: '👥' },
  { path: '/admin/services', label: '服务监控', icon: '📋' },
  { path: '/admin/payments', label: '支付管理', icon: '💳' },
  { path: '/admin/withdrawals', label: '提现管理', icon: '🏦' },
  { path: '/admin/products', label: '商品管理', icon: '🏪' },
  { path: '/admin/emergencies', label: '紧急告警', icon: '🆘' },
  { path: '/admin/reviews', label: '评价管理', icon: '⭐' },
  { path: '/admin/notifications', label: '通知广播', icon: '🔔' },
  { path: '/admin/settings', label: '平台配置', icon: '⚙️' },
  { path: '/admin/logs', label: '操作日志', icon: '📝' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [alerts, setAlerts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    socket.on('admin:alert', (alert) => {
      setAlerts(prev => [{ ...alert, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    });
    return () => socket.off('admin:alert');
  }, []);

  useEffect(() => {
    api.get('/admin/withdrawals?status=PENDING').then(r => setPendingCount(r.data.length)).catch(() => {});
  }, [loc.pathname]);

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
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = loc.pathname === item.path;
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={'w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-all ' + (active ? 'bg-green-600/20 text-green-400 font-medium' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200')}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.path === '/admin/withdrawals' && pendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>
                )}
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
            <Route path="stats" element={<AdminStatsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="emergencies" element={<AdminEmergenciesPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
          </Routes>
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

function AdminHome({ alerts }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats/overview').then(res => setStats(res.data)).catch(() => {});
  }, []);

  const pendingAlerts = alerts.filter(a => a.type === 'emergency' || a.type === 'service_new').length;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">系统概览</h2>
        <p className="text-gray-400 text-sm mt-1">宠物服务平台运行数据</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '总用户', value: stats.totalUsers, icon: '👥', color: 'text-blue-400' },
            { label: '宠物主', value: stats.totalOwners, icon: '🐱', color: 'text-green-400' },
            { label: '接单者', value: stats.totalSitters, icon: '🦮', color: 'text-yellow-400' },
            { label: '总服务', value: stats.totalServices, icon: '📋', color: 'text-purple-400' },
            { label: '已完成', value: stats.completedServices, icon: '✅', color: 'text-green-400' },
            { label: '总收入', value: '¥' + (stats.totalRevenue || 0).toFixed(0), icon: '💰', color: 'text-yellow-400' },
            { label: '待处理提现', value: stats.pendingWithdrawals, icon: '🏦', color: 'text-orange-400' },
            { label: '告警数', value: pendingAlerts, icon: '🔔', color: 'text-red-400' },
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {alerts.length > 0 && (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span>🔔</span> 实时告警 ({alerts.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {alerts.slice(0, 20).map((a, i) => (
                <div key={i} className="flex items-center gap-3 text-sm bg-gray-700/50 p-3 rounded-xl">
                  <span className="text-gray-500 w-16 text-xs">{a.time}</span>
                  <span className={'w-2 h-2 rounded-full ' + (a.type === 'service_new' ? 'bg-green-400' : a.type === 'service_accepted' ? 'bg-yellow-400' : a.type === 'emergency' ? 'bg-red-400' : 'bg-blue-400')} />
                  <span className="text-gray-300">
                    {a.type === 'service_new' ? '新服务发布' : a.type === 'service_accepted' ? '服务被接单' : a.type === 'emergency' ? '紧急告警' : a.type}
                  </span>
                  {a.service?.title && <span className="text-gray-500 truncate">- {a.service.title}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>⚡</span> 快捷入口
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { path: '/admin/users', label: '用户管理', icon: '👥' },
              { path: '/admin/services', label: '服务监控', icon: '📋' },
              { path: '/admin/withdrawals', label: '提现审核', icon: '🏦' },
              { path: '/admin/emergencies', label: '紧急告警', icon: '🆘' },
              { path: '/admin/stats', label: '数据统计', icon: '📈' },
              { path: '/admin/notifications', label: '通知广播', icon: '🔔' },
            ].map(item => (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="p-4 bg-gray-700/50 rounded-xl text-center hover:bg-gray-700 transition-colors">
                <span className="text-2xl block mb-1">{item.icon}</span>
                <span className="text-sm text-gray-300">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
