import { useState, useEffect } from 'react';
import api from '../../services/api';

const paymentStatusMap = {
  PENDING: { label: '待支付', color: 'text-yellow-400 bg-yellow-900/30' },
  COMPLETED: { label: '已支付', color: 'text-green-400 bg-green-900/30' },
  FAILED: { label: '失败', color: 'text-red-400 bg-red-900/30' },
  REFUNDED: { label: '已退款', color: 'text-gray-400 bg-gray-700' },
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? '?status=' + filter : '';
    api.get('/admin/payments' + params).then(res => {
      setPayments(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  const refund = async (id) => {
    if (!confirm('确认对此支付进行退款？此操作无法撤销。')) return;
    try {
      await api.post('/admin/payments/' + id + '/refund');
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'REFUNDED' } : p));
      alert('退款成功');
    } catch (err) { alert(err.response?.data?.error || '退款失败'); }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">支付管理</h2>
        <p className="text-gray-400 text-sm mt-1">查看和处理支付记录</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'COMPLETED', 'PENDING', 'REFUNDED', 'FAILED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium ' + (filter === s ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300')}>
            {s ? (paymentStatusMap[s]?.label || s) : '全部'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center py-8 text-gray-400">加载中...</p> : payments.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700">
          <span className="text-6xl block mb-4">💳</span>
          <p className="text-gray-400">暂无支付记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <div key={p.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-200">{p.order?.title}</p>
                  <p className="text-sm text-gray-400">{p.order?.owner?.name} → {p.order?.sitter?.name} · {p.method}</p>
                </div>
                <span className={'text-xs px-3 py-1 rounded-full ' + (paymentStatusMap[p.status]?.color || '')}>
                  {paymentStatusMap[p.status]?.label || p.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-green-400">¥{p.amount?.toFixed(2)}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{p.paidAt ? new Date(p.paidAt).toLocaleString('zh-CN') : new Date(p.createdAt).toLocaleString('zh-CN')}</span>
                  {p.status === 'COMPLETED' && (
                    <button onClick={() => refund(p.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50">退款</button>
                  )}
                </div>
              </div>
              {p.transactionId && <p className="text-xs text-gray-600 mt-1">交易ID: {p.transactionId}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
