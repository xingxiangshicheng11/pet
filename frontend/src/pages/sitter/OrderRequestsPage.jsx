import { useState, useEffect } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';

const statusMap = {
  PENDING: { label: '待确认', color: 'bg-yellow-100 text-yellow-700', next: 'CONFIRMED', nextLabel: '确认接单' },
  CONFIRMED: { label: '已确认', color: 'bg-blue-100 text-blue-700', next: 'IN_PROGRESS', nextLabel: '开始服务' },
  IN_PROGRESS: { label: '服务中', color: 'bg-purple-100 text-purple-700', next: 'COMPLETED', nextLabel: '完成服务' },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-700', next: null, nextLabel: '' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-500', next: null, nextLabel: '' },
};

export default function OrderRequestsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const res = await api.get('/products/orders/mine');
      const userId = parseInt(localStorage.getItem('userId') || '0');
      setOrders(res.data.filter(o => o.product.sitterId === userId));
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => {
    loadOrders();
    socket.on('product:ordered', () => { loadOrders(); });
    return () => socket.off('product:ordered');
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch('/products/orders/' + id + '/status', { status });
      loadOrders();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  if (loading) return <p className="text-center py-8 text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">接单请求</h2>
        <p className="text-sm text-green-600 mt-1">来自服务商城的购买订单</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
          <span className="text-6xl block mb-4">📦</span>
          <p className="text-gray-400">暂无接单请求</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const st = statusMap[order.status] || statusMap.PENDING;
            return (
              <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-green-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{order.product.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      买家: {order.buyer.name} · ¥{order.product.price}
                    </p>
                  </div>
                  <span className={'text-xs px-3 py-1 rounded-full ' + st.color}>{st.label}</span>
                </div>
                {order.message && <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mb-2">买家备注: {order.message}</p>}
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  <span>下单: {new Date(order.createdAt).toLocaleString('zh-CN')}</span>
                  {order.scheduledTime && <span>预约: {new Date(order.scheduledTime).toLocaleString('zh-CN')}</span>}
                  {order.address && <span>地址: {order.address}</span>}
                </div>
                {st.next && (
                  <button onClick={() => updateStatus(order.id, st.next)}
                    className="gradient-green text-white px-4 py-2 rounded-xl text-sm font-medium">
                    {st.nextLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
