import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import ChatBox from '../../components/ChatBox';

export default function SitterMessagesPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'chat');
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const uid = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    api.get('/sitter/notifications').then(res => setNotifications(res.data)).catch(() => {});
    api.get('/services?all=true').then(res => {
      setOrders(res.data.filter(s => s.sitter?.id === uid && s.status !== 'OPEN' && s.status !== 'CANCELLED'));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
  }, [searchParams]);

  const markRead = async (ids) => {
    await api.put('/sitter/notifications/read', { ids }).catch(() => {});
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
  };

  const unread = notifications.filter(n => !n.read);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">消息</h2>
        <p className="text-sm text-green-600 mt-1">与用户聊天和系统通知</p>
      </div>

      <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl border border-green-100 w-fit">
        {[
          { key: 'chat', label: '在线聊天', icon: '💬' },
          { key: 'system', label: '系统通知', icon: '🔔', count: unread.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={'flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all ' + (tab === t.key ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-green-50')}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.count > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden md:col-span-1">
            <div className="p-3 border-b">
              <p className="font-medium text-green-800">最近聊天</p>
            </div>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">暂无聊天</p>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto">
                {orders.map(o => (
                  <button key={o.id} onClick={() => setSelectedOrder(o)}
                    className={'w-full text-left p-3 hover:bg-green-50 transition-colors ' + (selectedOrder?.id === o.id ? 'bg-green-50' : '')}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                        {o.owner?.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{o.owner?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{o.title}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            {selectedOrder ? (
              <ChatBox orderId={selectedOrder.id} currentUserId={uid} otherUser={selectedOrder.owner} />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-green-100 flex items-center justify-center h-64">
                <p className="text-gray-400 text-sm">选择一个订单开始聊天</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-100">
          <div className="p-3 border-b flex items-center justify-between">
            <p className="font-medium text-green-800">系统通知</p>
            {unread.length > 0 && (
              <button onClick={() => markRead(unread.map(n => n.id))}
                className="text-xs text-green-600 hover:underline">全部已读</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">暂无通知</p>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} onClick={() => { if (!n.read) markRead([n.id]); }}
                  className={'p-4 cursor-pointer transition-colors ' + (n.read ? '' : 'bg-green-50')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={'text-sm font-medium ' + (n.read ? 'text-gray-600' : 'text-gray-800')}>
                      {!n.read && <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2" />}
                      {n.title}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  {n.content && <p className="text-xs text-gray-500 ml-4">{n.content}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
