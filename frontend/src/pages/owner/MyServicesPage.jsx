import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import socket from '../../services/socket';
import ChatBox from '../../components/ChatBox';
import ReviewForm from '../../components/ReviewForm';
import ServiceMap from '../../components/ServiceMap';
import PaymentButton from '../../components/PaymentButton';

const serviceStatusMap = {
  OPEN: '待接单', ACCEPTED: '已接单', IN_PROGRESS: '服务中', WAITING_PAYMENT: '待付款', COMPLETED: '已完成', CANCELLED: '已取消',
};
const serviceColorMap = {
  OPEN: 'text-blue-600 bg-blue-50', ACCEPTED: 'text-yellow-600 bg-yellow-50',
  IN_PROGRESS: 'text-purple-600 bg-purple-50', WAITING_PAYMENT: 'text-orange-600 bg-orange-50',
  COMPLETED: 'text-green-600 bg-green-50', CANCELLED: 'text-gray-500 bg-gray-100',
};
const orderStatusMap = {
  PENDING: { label: '待确认', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: '已确认', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: '服务中', color: 'bg-purple-100 text-purple-700' },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

export default function MyServicesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('services');
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [editingService, setEditingService] = useState(null);
  const [editForm, setEditForm] = useState({});

  const uid = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    Promise.all([
      api.get('/services?ownerId=' + uid).then(r => setServices(r.data)),
      api.get('/products/orders/mine').then(r => setOrders(r.data.filter(o => o.buyerId === uid))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    socket.on('service:status', svc => {
      setServices(prev => prev.map(s => s.id === svc.id ? svc : s));
      setSelected(prev => prev?.data?.id === svc.id ? { ...prev, data: svc } : prev);
    });
    return () => socket.off('service:status');
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const res = await api.patch('/services/' + id + '/status', { status });
      setServices(prev => prev.map(s => s.id === id ? res.data : s));
      setSelected(prev => prev?.data?.id === id ? { ...prev, data: res.data } : prev);
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const startEdit = (s) => {
    setEditingService(s);
    setEditForm({
      title: s.title,
      description: s.description || '',
      category: s.category,
      price: s.price,
      scheduledStart: s.scheduledStart ? s.scheduledStart.slice(0, 16) : '',
      scheduledEnd: s.scheduledEnd ? s.scheduledEnd.slice(0, 16) : '',
      address: s.address || '',
      latitude: s.latitude || '',
      longitude: s.longitude || '',
    });
  };

  const saveEdit = async () => {
    try {
      const payload = {
        ...editForm,
        price: parseFloat(editForm.price),
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
        scheduledStart: editForm.scheduledStart + ':00+08:00',
        scheduledEnd: editForm.scheduledEnd + ':00+08:00',
      };
      const res = await api.put('/services/' + editingService.id, payload);
      setServices(prev => prev.map(s => s.id === editingService.id ? res.data : s));
      setSelected(prev => prev?.data?.id === editingService.id ? { ...prev, data: res.data } : prev);
      setEditingService(null);
    } catch (err) {
      alert(err.response?.data?.error || '编辑失败');
    }
  };

  let filteredServices = services;
  if (serviceFilter === 'active') filteredServices = services.filter(s => ['OPEN', 'ACCEPTED', 'IN_PROGRESS'].includes(s.status));
  else if (serviceFilter === 'completed') filteredServices = services.filter(s => s.status === 'COMPLETED');
  else if (serviceFilter === 'cancelled') filteredServices = services.filter(s => s.status === 'CANCELLED');

  if (editingService) {
    return (
      <div>
        <button onClick={() => setEditingService(null)} className="text-green-600 hover:text-green-700 text-sm mb-4 flex items-center gap-1">← 返回</button>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
          <h3 className="font-semibold text-green-800 mb-4">编辑服务</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">标题</label>
              <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">描述</label>
              <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm" rows="3" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">类型</label>
              <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm">
                <option value="sitting">宠物陪伴</option>
                <option value="walking">遛狗</option>
                <option value="feeding">喂食</option>
                <option value="grooming">美容</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">价格 (¥)</label>
              <input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">开始时间</label>
              <input type="datetime-local" value={editForm.scheduledStart} onChange={e => setEditForm({ ...editForm, scheduledStart: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">结束时间</label>
              <input type="datetime-local" value={editForm.scheduledEnd} onChange={e => setEditForm({ ...editForm, scheduledEnd: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">地址</label>
              <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={saveEdit} className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">保存修改</button>
            <button onClick={() => setEditingService(null)} className="border border-green-300 text-green-600 px-6 py-2.5 rounded-xl text-sm font-medium">取消</button>
          </div>
        </div>
      </div>
    );
  }

  if (selected) {
    const isService = selected.type === 'service';
    const s = selected.data;
    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-green-600 hover:text-green-700 text-sm mb-4 flex items-center gap-1">← 返回列表</button>

        {isService ? (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg text-gray-800">{s.title}</h3>
                  <span className={'text-xs px-3 py-1 rounded-full ' + serviceColorMap[s.status]}>{serviceStatusMap[s.status]}</span>
                  {s.isUrgent && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">加急</span>}
                </div>
                <div className="flex gap-2">
                  {s.status === 'OPEN' && (
                    <button onClick={() => startEdit(s)}
                      className="text-blue-500 hover:text-blue-700 text-xs px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                      编辑
                    </button>
                  )}
                  {(s.status === 'OPEN' || s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS') && (
                    <button onClick={() => { if (confirm('确认取消该服务？')) updateStatus(s.id, 'CANCELLED'); }}
                      className="text-red-500 hover:text-red-700 text-xs px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors">
                      退单
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <p className="text-sm font-semibold text-green-700">¥{s.price}{s.extraTip ? <span className="text-yellow-600 ml-2">+ 加急费 ¥{s.extraTip}</span> : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">接单者</p>
                  <p className="text-sm text-gray-700">{s.sitter?.name || '等待接单中...'}</p>
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
            </div>
            {s.latitude && <ServiceMap latitude={s.latitude} longitude={s.longitude} address={s.address} className="w-full h-48 rounded-xl border border-green-100 mb-4" />}
            {s.sitter && <ChatBox orderId={s.id} currentUserId={user.id} otherUser={s.sitter} />}
            {s.status === 'WAITING_PAYMENT' && (
              <div className="mt-4"><PaymentButton orderId={s.id} amount={s.price} onPaid={async () => {
                const res = await api.get('/services/' + s.id).catch(() => null);
                if (res) { setSelected(prev => prev?.data?.id === s.id ? { ...prev, data: res.data } : prev); }
              }} /></div>
            )}
            {s.status === 'COMPLETED' && s.sitter && (
              <ReviewForm orderId={s.id} revieweeId={s.sitter.id} onSubmitted={() => {
                alert('评价成功！');
                api.get('/services/' + s.id).then(res => {
                  setSelected(prev => prev?.data?.id === s.id ? { ...prev, data: res.data } : prev);
                }).catch(() => {});
              }} />
            )}
            {s.status === 'CANCELLED' && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-sm text-red-600 text-center">该服务已取消</div>
            )}
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold text-lg text-gray-800">{s.product.title}</h3>
                <span className={'text-xs px-3 py-1 rounded-full ' + (orderStatusMap[s.status]?.color || '')}>{orderStatusMap[s.status]?.label || s.status}</span>
              </div>
              <p className="text-sm text-gray-500">接单者: {s.product.sitter.name} · ¥{s.product.price}</p>
              {s.message && <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-3 rounded-lg">备注: {s.message}</p>}
              {s.address && <p className="text-sm text-gray-400 mt-1">📍 {s.address}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-3">
                <span>下单: {new Date(s.createdAt).toLocaleString('zh-CN')}</span>
                {s.scheduledTime && <span>预约: {new Date(s.scheduledTime).toLocaleString('zh-CN')}</span>}
              </div>
            </div>
            {s.product.sitter && (
              <ChatBox orderId={0} productOrderId={s.id} currentUserId={user.id} otherUser={s.product.sitter} />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">我的服务</h2>
        <p className="text-sm text-green-600 mt-1">查看您的服务需求和购买记录</p>
      </div>

      <div className="flex gap-2 mb-6 bg-green-50 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('services')}
          className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (tab === 'services' ? 'bg-white text-green-700 shadow-sm' : 'text-green-500')}>
          📋 发布的需求
        </button>
        <button onClick={() => setTab('orders')}
          className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (tab === 'orders' ? 'bg-white text-green-700 shadow-sm' : 'text-green-500')}>
          🛒 购买的服务
        </button>
      </div>

      {tab === 'services' ? (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: 'all', label: '全部' },
              { key: 'active', label: '进行中' },
              { key: 'completed', label: '已完成' },
              { key: 'cancelled', label: '已取消' },
            ].map(f => (
              <button key={f.key} onClick={() => setServiceFilter(f.key)}
                className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ' + (serviceFilter === f.key ? 'bg-green-600 text-white' : 'bg-white text-gray-500 border border-green-100')}>
                {f.label}
              </button>
            ))}
          </div>

          {filteredServices.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
              <span className="text-6xl block mb-4">📋</span>
              <p className="text-gray-400">还没有发布过需求</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map(s => (
                <div key={'svc-' + s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 flex justify-between items-center cursor-pointer card-hover"
                  onClick={() => setSelected({ type: 'service', data: s })}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800">{s.title}</h3>
                      <span className={'text-xs px-2 py-0.5 rounded-full ' + serviceColorMap[s.status]}>{serviceStatusMap[s.status]}</span>
                      {s.isUrgent && <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-500">加急</span>}
                    </div>
                    <p className="text-sm text-gray-500">{s.pet?.name} · {s.category} · ¥{s.price}</p>
                    <p className="text-sm text-gray-400">{s.sitter ? '接单者: ' + s.sitter.name : '等待接单中...'}</p>
                  </div>
                  <div className="flex gap-2">
                    {s.status === 'OPEN' && (
                      <button onClick={(e) => { e.stopPropagation(); startEdit(s); }}
                        className="text-blue-400 hover:text-blue-600 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50">编辑</button>
                    )}
                    {(s.status === 'OPEN' || s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS') && (
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('确认取消？')) updateStatus(s.id, 'CANCELLED'); }}
                        className="text-red-400 hover:text-red-600 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">取消</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
              <span className="text-6xl block mb-4">🛒</span>
              <p className="text-gray-400 mb-4">还没有购买服务</p>
              <a href="/marketplace" className="inline-block bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">去商城逛逛</a>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => {
                const st = orderStatusMap[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-500' };
                return (
                  <div key={'ord-' + order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 cursor-pointer card-hover"
                    onClick={() => setSelected({ type: 'order', data: order })}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{order.product.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">接单者: {order.product.sitter.name} · ¥{order.product.price}</p>
                      </div>
                      <span className={'text-xs px-3 py-1 rounded-full ' + st.color}>{st.label}</span>
                    </div>
                    {order.message && <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mb-2">备注: {order.message}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>下单: {new Date(order.createdAt).toLocaleString('zh-CN')}</span>
                      {order.scheduledTime && <span>预约: {new Date(order.scheduledTime).toLocaleString('zh-CN')}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
