import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function OwnerNotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get('/owner/notifications').then(res => setNotifications(res.data)).catch(() => {});
  }, []);

  const markRead = async (ids) => {
    await api.put('/owner/notifications/read', { ids }).catch(() => {});
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
  };

  const unread = notifications.filter(n => !n.read);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">通知中心</h2>
        <p className="text-sm text-green-600 mt-1">查看系统通知和服务动态</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-green-100">
        <div className="p-4 border-b flex items-center justify-between">
          <p className="font-medium text-green-800">
            系统通知
            {unread.length > 0 && <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{unread.length}</span>}
          </p>
          {unread.length > 0 && (
            <button onClick={() => markRead(unread.map(n => n.id))}
              className="text-xs text-green-600 hover:underline">全部已读</button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">暂无通知</p>
        ) : (
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {notifications.map(n => (
              <div key={n.id} onClick={() => { if (!n.read) markRead([n.id]); }}
                className={'p-4 cursor-pointer transition-colors hover:bg-green-50/50 ' + (n.read ? '' : 'bg-green-50')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.read && <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />}
                      <span className={'text-sm font-medium truncate ' + (n.read ? 'text-gray-600' : 'text-gray-800')}>
                        {n.title}
                      </span>
                    </div>
                    {n.content && <p className="text-xs text-gray-500 ml-4 mt-1">{n.content}</p>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{new Date(n.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
