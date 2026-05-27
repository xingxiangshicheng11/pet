import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import socket from '../../services/socket';

const categoryLabels = { sitting: '宠物陪伴', walking: '遛狗', feeding: '喂食', grooming: '美容', training: '训练' };
const petTypeLabels = { dog: '狗', cat: '猫', other: '其他' };
const statusLabels = { OPEN: '待接单', ACCEPTED: '待服务', IN_PROGRESS: '进行中', WAITING_PAYMENT: '待付款', COMPLETED: '已完成', CANCELLED: '已取消' };

export default function SitterHome() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState({ pending: 0, active: 0, completed: 0, todayRevenue: 0, monthRevenue: 0, totalRevenue: 0, goodRate: 0, acceptRate: 0 });
  const [receiveOn, setReceiveOn] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [urgentFilter, setUrgentFilter] = useState(false);

  const uid = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, nRes] = await Promise.all([
          api.get('/sitter/stats').catch(() => ({ data: stats })),
          api.get('/sitter/notifications').catch(() => ({ data: [] })),
        ]);
        setStats(sRes.data);
        setNotifications(nRes.data.slice(0, 5));

        const svc = await api.get('/services?all=true').catch(() => ({ data: [] }));
        const mine = svc.data.filter(s => s.sitter?.id === uid);
        const today = mine.filter(s => {
          const d = new Date(s.scheduledStart);
          return d.toDateString() === new Date().toDateString();
        });
        setTodayOrders(today);
      } catch {}
    };
    load();
    if (user) setReceiveOn(user.receiveEnabled !== false);
  }, [user]);

  useEffect(() => {
    socket.on('service:new', () => {
      api.get('/sitter/stats').then(r => setStats(r.data)).catch(() => {});
    });
    return () => socket.off('service:new');
  }, []);

  const toggleReceive = async () => {
    try {
      const res = await api.put('/sitter/receive-toggle', { receiveEnabled: !receiveOn });
      setReceiveOn(res.data.receiveEnabled);
    } catch {}
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div>
      {/* 顶部：接单开关 + 快捷入口 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-green-900">工作台</h2>
          <p className="text-sm text-green-600 mt-1">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleReceive}
            className={'relative inline-flex h-7 w-12 items-center rounded-full transition-colors ' + (receiveOn ? 'bg-green-500' : 'bg-gray-300')}>
            <span className={'inline-block h-5 w-5 transform rounded-full bg-white transition-transform ' + (receiveOn ? 'translate-x-6' : 'translate-x-1')} />
          </button>
          <span className="text-sm font-medium text-gray-600">{receiveOn ? '接单中' : '休息中'}</span>
          {unread > 0 && (
            <button onClick={() => navigate('/sitter/messages')} className="relative text-sm text-green-600">
              💬 消息 <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unread}</span>
            </button>
          )}
        </div>
      </div>

      {/* 数据卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div onClick={() => navigate('/sitter/browse')} className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 card-hover cursor-pointer">
          <p className="text-xs text-gray-400 mb-1">待接单</p>
          <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
          <p className="text-xs text-blue-500 mt-1">点击查看 →</p>
        </div>
        <div onClick={() => navigate('/sitter/orders')} className="bg-white p-4 rounded-2xl shadow-sm border border-yellow-100 card-hover cursor-pointer">
          <p className="text-xs text-gray-400 mb-1">待服务/进行中</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.active}</p>
          <p className="text-xs text-yellow-500 mt-1">点击管理 →</p>
        </div>
        <div onClick={() => navigate('/sitter/wallet')} className="bg-white p-4 rounded-2xl shadow-sm border border-green-100 card-hover cursor-pointer">
          <p className="text-xs text-gray-400 mb-1">今日收益</p>
          <p className="text-2xl font-bold text-green-700">¥{stats.todayRevenue}</p>
          <p className="text-xs text-green-500 mt-1">本月 ¥{stats.monthRevenue}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
          <p className="text-xs text-gray-400 mb-1">好评率</p>
          <p className="text-2xl font-bold text-purple-600">{stats.goodRate}%</p>
          <p className="text-xs text-purple-500 mt-1">接单率 {stats.acceptRate}%</p>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { icon: '🔍', label: '接单', path: '/sitter/browse', color: 'bg-blue-50 text-blue-600' },
          { icon: '📋', label: '我的订单', path: '/sitter/orders', color: 'bg-yellow-50 text-yellow-600' },
          { icon: '💰', label: '我的钱包', path: '/sitter/wallet', color: 'bg-green-50 text-green-600' },
          { icon: '💬', label: '消息', path: '/sitter/messages', color: 'bg-purple-50 text-purple-600', badge: unread },
        ].map(item => (
          <button key={item.label} onClick={() => navigate(item.path)}
            className={'relative p-4 rounded-2xl text-center transition-all hover:shadow-md ' + item.color}>
            <span className="text-2xl block mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
            {item.badge > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{item.badge}</span>}
          </button>
        ))}
      </div>

      {/* 筛选选项 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setUrgentFilter(!urgentFilter)}
          className={'text-xs px-3 py-1.5 rounded-full transition-colors ' + (urgentFilter ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white text-gray-500 border border-gray-200')}>
          🚨 紧急订单
        </button>
        <button onClick={() => navigate('/sitter/browse')}
          className="text-xs px-3 py-1.5 rounded-full bg-white text-gray-500 border border-gray-200 hover:bg-orange-50">
          🔥 加急单
        </button>
        <button onClick={() => navigate('/sitter/browse')}
          className="text-xs px-3 py-1.5 rounded-full bg-white text-gray-500 border border-gray-200 hover:bg-green-50">
          💰 高价订单
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 今日行程 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100">
          <h3 className="font-semibold text-green-800 mb-3">今日行程</h3>
          {todayOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">今日暂无安排</p>
          ) : (
            <div className="space-y-2">
              {todayOrders.map(s => (
                <div key={s.id} onClick={() => navigate('/sitter/orders')}
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-xl text-sm cursor-pointer hover:bg-green-100 transition-colors">
                  <div className={'w-2 h-2 rounded-full ' + (s.status === 'ACCEPTED' ? 'bg-yellow-400' : s.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-green-400')} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">{s.title}</p>
                    <p className="text-xs text-gray-400">{new Date(s.scheduledStart).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} - {s.pet?.name}</p>
                  </div>
                  <span className={'text-xs px-2 py-0.5 rounded-full ' + (
                    s.status === 'ACCEPTED' ? 'bg-yellow-100 text-yellow-700' :
                    s.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  )}>{statusLabels[s.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 系统推送 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-800">系统通知</h3>
            <button onClick={() => navigate('/sitter/messages')} className="text-xs text-green-600 hover:underline">查看全部</button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">暂无通知</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} className={'p-3 rounded-xl text-sm cursor-pointer hover:bg-green-50 transition-colors ' + (n.read ? 'bg-gray-50' : 'bg-green-50 border border-green-200')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-700">{n.title}</span>
                    <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  {n.content && <p className="text-xs text-gray-500">{n.content}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
