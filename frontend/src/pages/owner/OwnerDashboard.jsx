import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import PetsPage from './PetsPage';
import CreateServicePage from './CreateServicePage';
import MyServicesPage from './MyServicesPage';
import OwnerSettingsPage from './OwnerSettingsPage';
import OwnerNotificationsPage from './OwnerNotificationsPage';
import OwnerMessagesPage from './OwnerMessagesPage';
import OwnerTransactionsPage from './OwnerTransactionsPage';
import OwnerSittersPage from './OwnerSittersPage';
import OwnerCalendarPage from './OwnerCalendarPage';
import EmergencySOSPage from './EmergencySOSPage';

const navItems = [
  { path: '/owner', label: '概览', icon: '📊' },
  { path: '/owner/pets', label: '宠物管理', icon: '🐾' },
  { path: '/owner/create', label: '发布需求', icon: '📝' },
  { path: '/owner/services', label: '我的服务', icon: '📋' },
  { path: '/owner/messages', label: '消息中心', icon: '💬' },
  { path: '/owner/notifications', label: '通知中心', icon: '🔔' },
  { path: '/owner/calendar', label: '服务日历', icon: '📅' },
  { path: '/owner/sitters', label: '收藏接单者', icon: '⭐' },
  { path: '/owner/transactions', label: '交易记录', icon: '💰' },
  { path: '/owner/settings', label: '设置', icon: '⚙️' },
];

export default function OwnerDashboard() {
  const { user, logout, roleList, switchRole, currentRole } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [showSOS, setShowSOS] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/owner/notifications').then(res => {
        setNotifCount(res.data.filter(n => !n.read).length);
      }).catch(() => {});
    }
  }, [user, loc.pathname]);

  return (
    <div className="min-h-screen bg-green-50 flex">
      <aside className={'fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col ' + (sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="gradient-green p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🐾</span>
            <h1 className="text-xl font-bold text-white">宠享</h1>
          </div>
          <p className="text-green-100 text-xs">欢迎回来，{user?.name}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = loc.pathname === item.path;
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={'w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-all ' + (active ? 'bg-green-50 text-green-700 font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-50')}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.path === '/owner/notifications' && notifCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{notifCount}</span>
                )}
                {active && <span className="ml-auto w-1.5 h-6 bg-green-500 rounded-full" />}
              </button>
            );
          })}
          <div className="border-t my-3" />
          <Link to="/marketplace"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-green-600 bg-green-50 hover:bg-green-100 transition-all font-medium">
            <span>🏪</span>
            <span>服务商城</span>
            <span className="ml-auto bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">新</span>
          </Link>
          <button onClick={() => setShowSOS(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-all font-medium mt-1">
            <span>🆘</span>
            <span>紧急求助</span>
          </button>
        </nav>
        <div className="p-4 border-t space-y-3">
          {roleList.filter(r => r !== 'ADMIN').length > 1 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">切换角色</p>
              <div className="flex gap-1">
                {roleList.filter(r => r !== 'ADMIN').map(r => (
                  <button key={r} onClick={() => { switchRole(r); navigate('/' + r.toLowerCase()); }}
                    className={'text-xs px-3 py-1.5 rounded-lg ' + (currentRole === r ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {r === 'OWNER' ? '宠物主' : '接单者'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => { logout(); navigate('/login'); }}
            className="w-full text-left text-sm text-red-500 hover:text-red-700 py-2">
            退出登录
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="bg-white shadow-sm sticky top-0 z-20 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-green-700 text-2xl">☰</button>
            <span className="font-bold text-green-700">🐾 宠享</span>
            <div />
          </div>
        </header>
        <main className="p-4 lg:p-8">
          {showSOS ? (
            <div>
              <button onClick={() => setShowSOS(false)} className="text-green-600 hover:text-green-700 text-sm mb-4 flex items-center gap-1">← 返回</button>
              <EmergencySOSPage />
            </div>
          ) : (
            <Routes>
              <Route index element={<OwnerHome />} />
              <Route path="pets" element={<PetsPage />} />
              <Route path="create" element={<CreateServicePage />} />
              <Route path="services" element={<MyServicesPage />} />
              <Route path="messages" element={<OwnerMessagesPage />} />
              <Route path="notifications" element={<OwnerNotificationsPage />} />
              <Route path="settings" element={<OwnerSettingsPage />} />
              <Route path="transactions" element={<OwnerTransactionsPage />} />
              <Route path="sitters" element={<OwnerSittersPage />} />
              <Route path="calendar" element={<OwnerCalendarPage />} />
            </Routes>
          )}
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

function OwnerHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pets: 0, active: 0, completed: 0, pendingPayment: 0 });
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [pets, services] = await Promise.all([
          api.get('/pets'),
          api.get('/services?ownerId=' + (parseInt(localStorage.getItem('userId') || '0'))),
        ]);
        setStats({
          pets: pets.data.length,
          active: services.data.filter(s => s.status === 'OPEN' || s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS').length,
          completed: services.data.filter(s => s.status === 'COMPLETED').length,
          pendingPayment: services.data.filter(s => s.status === 'WAITING_PAYMENT').length,
        });
        setUpcoming(services.data.filter(s => s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS').slice(0, 3));
      } catch {}
    };
    load();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-green-900">我的面板</h2>
        <p className="text-green-600 text-sm mt-1">管理您的宠物和服务</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🐾</span>
            <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">宠物</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.pets}</p>
          <p className="text-xs text-gray-500 mt-1">我的宠物</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-yellow-100 card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">⏳</span>
            <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full">进行中</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.active}</p>
          <p className="text-xs text-gray-500 mt-1">进行中服务</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💳</span>
            <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full">待付款</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.pendingPayment}</p>
          <p className="text-xs text-gray-500 mt-1">待付款</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">✅</span>
            <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">已完成</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
          <p className="text-xs text-gray-500 mt-1">已完成服务</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
          <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
            <span>⚡</span> 快速操作
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/owner/pets" className="p-4 bg-green-50 rounded-xl text-center hover:bg-green-100 transition-colors">
              <span className="text-2xl block mb-1">🐾</span>
              <span className="text-sm text-green-700 font-medium">管理宠物</span>
            </Link>
            <Link to="/owner/create" className="p-4 bg-green-50 rounded-xl text-center hover:bg-green-100 transition-colors">
              <span className="text-2xl block mb-1">📝</span>
              <span className="text-sm text-green-700 font-medium">发布需求</span>
            </Link>
            <Link to="/marketplace" className="p-4 bg-green-50 rounded-xl text-center hover:bg-green-100 transition-colors">
              <span className="text-2xl block mb-1">🏪</span>
              <span className="text-sm text-green-700 font-medium">服务商城</span>
            </Link>
            <Link to="/owner/services" className="p-4 bg-green-50 rounded-xl text-center hover:bg-green-100 transition-colors">
              <span className="text-2xl block mb-1">📋</span>
              <span className="text-sm text-green-700 font-medium">我的服务</span>
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
          <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
            <span>📅</span> 即将到来的服务
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">暂无进行中的服务</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map(s => (
                <Link key={s.id} to="/owner/services" className="block p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">{s.title}</p>
                    <span className="text-xs text-gray-400">{new Date(s.scheduledStart).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{s.sitter?.name ? '接单者: ' + s.sitter.name : '等待接单'}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white p-6 rounded-2xl shadow-sm border border-green-100">
        <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
          <span>💡</span> 使用提示
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="flex gap-2">
            <span className="text-green-500">•</span>
            先添加宠物档案，再发布服务需求
          </div>
          <div className="flex gap-2">
            <span className="text-green-500">•</span>
            去服务商城直接购买保姆的标准化服务
          </div>
          <div className="flex gap-2">
            <span className="text-green-500">•</span>
            发布需求后会实时通知附近的接单者
          </div>
          <div className="flex gap-2">
            <span className="text-green-500">•</span>
            服务完成后可以为对方进行评价
          </div>
          <div className="flex gap-2">
            <span className="text-green-500">•</span>
            在消息中心与接单者进行实时沟通
          </div>
          <div className="flex gap-2">
            <span className="text-green-500">•</span>
            遇到紧急情况使用 SOS 紧急求助
          </div>
        </div>
      </div>
    </div>
  );
}
