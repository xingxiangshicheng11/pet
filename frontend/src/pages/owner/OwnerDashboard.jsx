import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import PetsPage from './PetsPage';
import CreateServicePage from './CreateServicePage';
import MyServicesPage from './MyServicesPage';

const navItems = [
  { path: '/owner', label: '概览', icon: '📊' },
  { path: '/owner/pets', label: '宠物管理', icon: '🐾' },
  { path: '/owner/create', label: '发布需求', icon: '📝' },
  { path: '/owner/services', label: '我的服务', icon: '📋' },
];

export default function OwnerDashboard() {
  const { user, logout, roleList, switchRole, currentRole } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = loc.pathname === item.path;
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={'w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-all ' + (active ? 'bg-green-50 text-green-700 font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-50')}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
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
          <Routes>
            <Route index element={<OwnerHome />} />
            <Route path="pets" element={<PetsPage />} />
            <Route path="create" element={<CreateServicePage />} />
            <Route path="services" element={<MyServicesPage />} />
          </Routes>
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

function OwnerHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pets: 0, active: 0, completed: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [pets, services] = await Promise.all([
          api.get('/pets'),
          api.get('/services'),
        ]);
        setStats({
          pets: pets.data.length,
          active: services.data.filter(s => s.status === 'OPEN' || s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS').length,
          completed: services.data.filter(s => s.status === 'COMPLETED').length,
        });
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 card-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">🐾</span>
            <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">宠物</span>
          </div>
          <p className="text-3xl font-bold text-green-700">{stats.pets}</p>
          <p className="text-sm text-gray-500 mt-1">我的宠物</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-yellow-100 card-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">⏳</span>
            <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full">进行中</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{stats.active}</p>
          <p className="text-sm text-gray-500 mt-1">进行中服务</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 card-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">✅</span>
            <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">已完成</span>
          </div>
          <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
          <p className="text-sm text-gray-500 mt-1">已完成服务</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <span>💡</span> 使用提示
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-green-500">•</span>
              先添加宠物档案，再发布服务需求
            </li>
            <li className="flex gap-2">
              <span className="text-green-500">•</span>
              去服务商城直接购买保姆的标准化服务
            </li>
            <li className="flex gap-2">
              <span className="text-green-500">•</span>
              发布需求后会实时通知附近的接单者
            </li>
            <li className="flex gap-2">
              <span className="text-green-500">•</span>
              服务完成后可以为对方进行评价
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
