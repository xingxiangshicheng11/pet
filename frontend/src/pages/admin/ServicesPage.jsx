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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = async (p) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p || page, limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await api.get('/admin/services?' + params.toString());
      setServices(res.data.services);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(1); }, [statusFilter]);

  const handleSearch = (e) => { e.preventDefault(); load(1); };

  const viewDetail = async (id) => {
    try {
      const res = await api.get('/admin/services/' + id + '/detail');
      setDetail(res.data);
    } catch { alert('加载失败'); }
  };

  const updateStatus = async (id, status) => {
    if (!confirm('确认将服务状态改为 ' + (statusMap[status] || status) + '？')) return;
    try {
      await api.patch('/admin/services/' + id + '/status', { status });
      load(page);
      if (detail?.id === id) setDetail({ ...detail, status });
    } catch (err) { alert(err.response?.data?.error || '操作失败'); }
  };

  const assignSitter = async (serviceId) => {
    const sitterId = prompt('输入接单者用户ID：');
    if (!sitterId) return;
    try {
      await api.post('/admin/services/' + serviceId + '/assign', { sitterId: parseInt(sitterId) });
      load(page);
      if (detail?.id === serviceId) viewDetail(serviceId);
    } catch (err) { alert(err.response?.data?.error || '分配失败'); }
  };

  if (detail) {
    return (
      <div>
        <button onClick={() => setDetail(null)} className="text-green-400 hover:text-green-300 text-sm mb-4 flex items-center gap-1">← 返回列表</button>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{detail.title}</h3>
              <p className="text-gray-400 text-sm mt-1">{detail.category} · ¥{detail.price} {detail.isUrgent && <span className="text-red-400">[加急]</span>}</p>
            </div>
            <span className={'text-xs px-3 py-1 rounded-full ' + (colorMap[detail.status] || '')}>{statusMap[detail.status] || detail.status}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-700/50 p-3 rounded-xl">
              <p className="text-xs text-gray-400">宠物主</p>
              <p className="text-sm font-medium text-gray-200">{detail.owner?.name} ({detail.owner?.phone})</p>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-xl">
              <p className="text-xs text-gray-400">接单者</p>
              <p className="text-sm font-medium text-gray-200">{detail.sitter?.name || '待接单'} {detail.sitter?.phone ? '(' + detail.sitter.phone + ')' : ''}</p>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-xl">
              <p className="text-xs text-gray-400">宠物</p>
              <p className="text-sm font-medium text-gray-200">{detail.pet?.name} ({detail.pet?.species})</p>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-xl">
              <p className="text-xs text-gray-400">时间段</p>
              <p className="text-xs text-gray-300">{new Date(detail.scheduledStart).toLocaleString('zh-CN')} ~ {new Date(detail.scheduledEnd).toLocaleString('zh-CN')}</p>
            </div>
          </div>
          {detail.description && <p className="text-sm text-gray-400 bg-gray-700/30 p-3 rounded-xl mb-4">{detail.description}</p>}
          {detail.address && <p className="text-xs text-gray-500 mb-4">📍 {detail.address}</p>}
          <div className="flex gap-2 flex-wrap">
            {detail.status === 'OPEN' && <>
              <button onClick={() => updateStatus(detail.id, 'CANCELLED')} className="px-4 py-2 bg-red-600/50 text-red-300 rounded-xl text-sm hover:bg-red-600/70">取消服务</button>
              <button onClick={() => assignSitter(detail.id)} className="px-4 py-2 bg-blue-600/50 text-blue-300 rounded-xl text-sm hover:bg-blue-600/70">分配接单者</button>
            </>}
            {detail.status === 'ACCEPTED' && <button onClick={() => updateStatus(detail.id, 'CANCELLED')} className="px-4 py-2 bg-red-600/50 text-red-300 rounded-xl text-sm hover:bg-red-600/70">取消服务</button>}
            {detail.status === 'IN_PROGRESS' && <button onClick={() => updateStatus(detail.id, 'COMPLETED')} className="px-4 py-2 bg-green-600/50 text-green-300 rounded-xl text-sm hover:bg-green-600/70">强制完成</button>}
            {detail.status === 'WAITING_PAYMENT' && <button onClick={() => updateStatus(detail.id, 'COMPLETED')} className="px-4 py-2 bg-green-600/50 text-green-300 rounded-xl text-sm hover:bg-green-600/70">跳过支付完成</button>}
          </div>
        </div>

        {detail.messages?.length > 0 && (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 mb-4">
            <h4 className="font-semibold text-gray-200 mb-3">聊天记录 ({detail.messages.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {detail.messages.map(m => (
                <div key={m.id} className="bg-gray-700/50 p-3 rounded-xl">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{m.sender?.name}</span>
                    <span>{new Date(m.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <p className="text-sm text-gray-300">{m.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {detail.payments?.length > 0 && (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 mb-4">
            <h4 className="font-semibold text-gray-200 mb-3">支付记录</h4>
            {detail.payments.map(p => (
              <div key={p.id} className="bg-gray-700/50 p-3 rounded-xl flex justify-between items-center">
                <span className="text-sm text-gray-300">¥{p.amount} · {p.method}</span>
                <span className={'text-xs px-2 py-0.5 rounded ' + (p.status === 'COMPLETED' ? 'bg-green-900/50 text-green-400' : p.status === 'REFUNDED' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-gray-700 text-gray-400')}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">服务监控</h2>
        <p className="text-gray-400 text-sm mt-1">管理所有服务订单</p>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 mb-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索标题..."
            className="flex-1 min-w-[200px] p-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="p-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-gray-300">
            <option value="">全部状态</option>
            {Object.entries(statusMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium">搜索</button>
        </form>
      </div>

      {loading ? (
        <p className="text-center py-8 text-gray-400">加载中...</p>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700">
          <span className="text-6xl block mb-4">📋</span>
          <p className="text-gray-400">暂无服务记录</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {services.map(s => (
              <div key={s.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                onClick={() => viewDetail(s.id)}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-200">{s.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{s.owner?.name} → {s.sitter?.name || '待接单'} · ¥{s.price} · {s.category}</p>
                  </div>
                  <span className={'text-xs px-3 py-1 rounded-full ' + (colorMap[s.status] || '')}>{statusMap[s.status] || s.status}</span>
                </div>
                {s.pet && <p className="text-xs text-gray-500">宠物: {s.pet.name} ({s.pet.species})</p>}
                <p className="text-xs text-gray-600 mt-1">{new Date(s.createdAt).toLocaleString('zh-CN')}</p>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => load(p)}
                  className={'px-3 py-1.5 rounded-lg text-sm ' + (p === page ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
