import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import socket from '../../services/socket';
import ChatBox from '../../components/ChatBox';

import ServiceMap from '../../components/ServiceMap';

const statusMap = {
  OPEN: '待接单', ACCEPTED: '已接单', IN_PROGRESS: '服务中', WAITING_PAYMENT: '待收款', COMPLETED: '已完成', CANCELLED: '已取消',
};
const colorMap = {
  OPEN: 'text-blue-600 bg-blue-50', ACCEPTED: 'text-yellow-600 bg-yellow-50',
  IN_PROGRESS: 'text-purple-600 bg-purple-50', WAITING_PAYMENT: 'text-orange-600 bg-orange-50',
  COMPLETED: 'text-green-600 bg-green-50', CANCELLED: 'text-gray-500 bg-gray-100',
};

export default function MyJobsPage() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState(null);

  const loadServices = async () => {
    const res = await api.get('/services?all=true');
    const uid = parseInt(localStorage.getItem('userId') || '0');
    setServices(res.data.filter(s => s.sitter?.id === uid && s.status !== 'OPEN'));
  };

  useEffect(() => { loadServices(); }, []);

  useEffect(() => {
    socket.on('service:status', (svc) => {
      setServices(prev => prev.map(s => s.id === svc.id ? svc : s));
    });
    return () => socket.off('service:status');
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const res = await api.patch('/services/' + id + '/status', { status });
      setServices(prev => prev.map(s => s.id === id ? res.data : s));
      if (selected?.id === id) setSelected(res.data);
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  if (selected) {
    const s = selected;
    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-green-600 hover:text-green-700 text-sm mb-4 flex items-center gap-1">← 返回列表</button>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg text-gray-800">{s.title}</h3>
              <span className={'text-xs px-3 py-1 rounded-full ' + colorMap[s.status]}>{statusMap[s.status]}</span>
            </div>
            {(s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS') && (
              <button onClick={() => { if (confirm('确认取消该服务？')) updateStatus(s.id, 'CANCELLED'); }}
                className="text-red-500 hover:text-red-700 text-xs px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors">
                退单
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">宠物</p>
              <p className="text-sm text-gray-700">{s.pet?.name} ({s.pet?.species})</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">服务类型</p>
              <p className="text-sm text-gray-700">{s.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">价格</p>
              <p className="text-sm font-semibold text-green-700">¥{s.price}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">宠物主</p>
              <p className="text-sm text-gray-700">{s.owner?.name}</p>
            </div>
            {s.description && (
              <div className="md:col-span-2">
                <p className="text-xs text-gray-400 mb-1">需求描述</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">{s.description}</p>
              </div>
            )}
            {s.address && (
              <div>
                <p className="text-xs text-gray-400 mb-1">服务地址</p>
                <p className="text-sm text-gray-700">📍 {s.address}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">时间段</p>
              <p className="text-sm text-gray-700">
                {new Date(s.scheduledStart).toLocaleString('zh-CN')} ~ {new Date(s.scheduledEnd).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>

          {s.status !== 'CANCELLED' && s.status !== 'COMPLETED' && (
            <div className="flex gap-2 mt-2">
              {s.status === 'ACCEPTED' && (
                <button onClick={() => updateStatus(s.id, 'IN_PROGRESS')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">开始服务</button>
              )}
              {s.status === 'IN_PROGRESS' && (
                <button onClick={() => updateStatus(s.id, 'WAITING_PAYMENT')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">完成服务，等待付款</button>
              )}
            </div>
          )}
        </div>

        {s.latitude && <ServiceMap latitude={s.latitude} longitude={s.longitude} address={s.address} className="w-full h-48 rounded-xl border border-green-100 mb-4" />}

        {s.owner && <ChatBox orderId={s.id} currentUserId={user.id} otherUser={s.owner} />}

        {s.status === 'CANCELLED' && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-sm text-red-600 text-center">
            该服务已取消
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">我的服务</h2>
        <p className="text-sm text-green-600 mt-1">已接单的服务列表</p>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
          <span className="text-6xl block mb-4">📋</span>
          <p className="text-gray-400">还没有接单</p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map(s => (
            <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 flex justify-between items-center cursor-pointer card-hover"
              onClick={() => setSelected(s)}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-800">{s.title}</h3>
                  <span className={'text-xs px-2 py-0.5 rounded-full ' + colorMap[s.status]}>{statusMap[s.status]}</span>
                </div>
                <p className="text-sm text-gray-500">{s.pet?.name} · {s.category} · ¥{s.price}</p>
                <p className="text-sm text-gray-400">宠物主: {s.owner?.name}</p>
              </div>
              <div className="flex gap-2 ml-4" onClick={e => e.stopPropagation()}>
                {s.status === 'ACCEPTED' && (
                  <button onClick={() => updateStatus(s.id, 'IN_PROGRESS')}
                    className="bg-purple-500 text-white px-3 py-1.5 rounded-lg text-sm">开始</button>
                )}
                {s.status === 'IN_PROGRESS' && (
                  <button onClick={() => updateStatus(s.id, 'WAITING_PAYMENT')}
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">待付款</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
