import { useState, useEffect } from 'react';
import api from '../../services/api';
import ChatBox from '../../components/ChatBox';

export default function OwnerMessagesPage() {
  const [tab, setTab] = useState('chat');
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const uid = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    api.get('/services?ownerId=' + uid).then(res => {
      setServices(res.data.filter(s => s.sitter && s.status !== 'OPEN' && s.status !== 'CANCELLED'));
    }).catch(() => {});
    api.get('/products/orders/mine').then(res => {
      setOrders(res.data.filter(o => o.buyerId === uid && o.status !== 'CANCELLED'));
    }).catch(() => {});
    api.get('/owner/notifications').then(res => setNotifications(res.data)).catch(() => {});
  }, []);

  const unread = notifications.filter(n => !n.read);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">消息中心</h2>
        <p className="text-sm text-green-600 mt-1">与接单者聊天和系统通知</p>
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
            <div className="max-h-96 overflow-y-auto divide-y">
              {services.length === 0 && orders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">暂无聊天</p>
              ) : (
                <>
                  {services.map(s => (
                    <button key={'svc-' + s.id} onClick={() => { setSelectedService(s); setSelectedOrder(null); }}
                      className={'w-full text-left p-3 hover:bg-green-50 transition-colors ' + (selectedService?.id === s.id ? 'bg-green-50' : '')}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                          {s.sitter?.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{s.sitter?.name}</p>
                          <p className="text-xs text-gray-400 truncate">{s.title}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {orders.map(o => (
                    <button key={'ord-' + o.id} onClick={() => { setSelectedOrder(o); setSelectedService(null); }}
                      className={'w-full text-left p-3 hover:bg-green-50 transition-colors ' + (selectedOrder?.id === o.id ? 'bg-green-50' : '')}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                          {o.product?.sitter?.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{o.product?.sitter?.name}</p>
                          <p className="text-xs text-gray-400 truncate">{o.product?.title}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            {selectedService ? (
              <ChatBox orderId={selectedService.id} currentUserId={uid} otherUser={selectedService.sitter} />
            ) : selectedOrder ? (
              <ChatBox orderId={0} productOrderId={selectedOrder.id} currentUserId={uid} otherUser={selectedOrder.product?.sitter} />
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
          <div className="p-4 border-b flex items-center justify-between">
            <p className="font-medium text-green-800">系统通知</p>
            {unread.length > 0 && (
              <button onClick={async () => {
                await api.put('/owner/notifications/read', { ids: unread.map(n => n.id) }).catch(() => {});
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
              }} className="text-xs text-green-600 hover:underline">全部已读</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">暂无通知</p>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} onClick={async () => {
                  if (!n.read) {
                    await api.put('/owner/notifications/read', { ids: [n.id] }).catch(() => {});
                    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                  }
                }} className={'p-4 cursor-pointer transition-colors ' + (n.read ? '' : 'bg-green-50')}>
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
