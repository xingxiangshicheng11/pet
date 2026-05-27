import { useState, useEffect } from 'react';
import api from '../../services/api';

const statusMap = {
  OPEN: '待接单', ACCEPTED: '已接单', IN_PROGRESS: '服务中', WAITING_PAYMENT: '待付款', COMPLETED: '已完成', CANCELLED: '已取消',
};
const colorMap = {
  OPEN: 'text-blue-400 bg-blue-900/30', ACCEPTED: 'text-yellow-400 bg-yellow-900/30',
  IN_PROGRESS: 'text-purple-400 bg-purple-900/30', WAITING_PAYMENT: 'text-orange-400 bg-orange-900/30',
  COMPLETED: 'text-green-400 bg-green-900/30', CANCELLED: 'text-gray-500 bg-gray-800',
};

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/services').then(res => {
      setServices(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center py-8 text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">服务监控</h2>
        <p className="text-gray-400 text-sm mt-1">所有服务订单状态概览</p>
      </div>

      <div className="space-y-3">
        {services.length === 0 ? (
          <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700">
            <span className="text-6xl block mb-4">📋</span>
            <p className="text-gray-400">暂无服务记录</p>
          </div>
        ) : services.map(s => (
          <div key={s.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-200">{s.title}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {s.owner?.name} → {s.sitter?.name || '待接单'} · ¥{s.price} · {s.category}
                </p>
              </div>
              <span className={'text-xs px-3 py-1 rounded-full ' + (colorMap[s.status] || '')}>
                {statusMap[s.status] || s.status}
              </span>
            </div>
            {s.pet && <p className="text-xs text-gray-500">宠物: {s.pet.name} ({s.pet.species})</p>}
            <p className="text-xs text-gray-600 mt-1">创建: {new Date(s.createdAt).toLocaleString('zh-CN')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
