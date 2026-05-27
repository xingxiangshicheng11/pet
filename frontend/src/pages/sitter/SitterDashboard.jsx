import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import SitterHome from './SitterHome';
import BrowseServicesPage from './BrowseServicesPage';
import SitterOrdersPage from './SitterOrdersPage';
import SitterProfilePage from './SitterProfilePage';
import SitterWalletPage from './SitterWalletPage';
import SitterMessagesPage from './SitterMessagesPage';
import SitterSettingsPage from './SitterSettingsPage';
import SitterDashboardDataPage from './SitterDashboardDataPage';

const navItems = [
  { path: '/sitter', label: '工作台', icon: '📊' },
  { path: '/sitter/browse', label: '浏览订单', icon: '🔍' },
  { path: '/sitter/orders', label: '我的订单', icon: '📋' },
  { path: '/sitter/wallet', label: '我的钱包', icon: '💰' },
  { path: '/sitter/messages', label: '消息', icon: '💬' },
  { path: '/sitter/dashboard', label: '数据看板', icon: '📈' },
  { path: '/sitter/settings', label: '设置', icon: '⚙️' },
];

export default function SitterDashboard() {
  const { user, logout, roleList, switchRole, currentRole } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-green-50 flex">
      <aside className={'fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col ' + (sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="bg-green-600 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🦮</span>
            <h1 className="text-lg font-bold text-white">宠享 · 接单端</h1>
          </div>
          <div onClick={() => { navigate('/sitter/profile'); setSidebarOpen(false); }} className="flex items-center gap-3 cursor-pointer hover:bg-green-500/30 p-2 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center text-lg font-bold text-white">
              {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} /> : null}
              <span className={user?.avatar ? 'hidden' : ''}>{user?.name?.charAt(0) || '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-green-100 text-xs truncate">接单者 · 点击编辑资料</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = loc.pathname === item.path;
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={'w-full text-left px-4 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-all ' + (active ? 'bg-green-50 text-green-700 font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-50')}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {active && <span className="ml-auto w-1.5 h-5 bg-green-500 rounded-full" />}
              </button>
            );
          })}
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
            className="w-full text-left text-sm text-red-500 hover:text-red-700 py-2">退出登录</button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white shadow-sm sticky top-0 z-20 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-green-700 text-2xl">☰</button>
            <span className="font-bold text-green-700">🦮 宠享</span>
            <div />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Routes>
            <Route index element={<SitterHome />} />
            <Route path="browse" element={<BrowseServicesPage />} />
            <Route path="orders" element={<SitterOrdersPage />} />
            <Route path="profile" element={<SitterProfilePage />} />
            <Route path="wallet" element={<SitterWalletPage />} />
            <Route path="messages" element={<SitterMessagesPage />} />
            <Route path="settings" element={<SitterSettingsPage />} />
            <Route path="dashboard" element={<SitterDashboardDataPage />} />
          </Routes>
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
