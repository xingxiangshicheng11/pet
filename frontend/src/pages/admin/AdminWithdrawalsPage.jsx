import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? '?status=' + filter : '';
    api.get('/admin/withdrawals' + params).then(res => {
      setWithdrawals(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  const review = async (id, action) => {
    const reason = action === 'REJECTED' ? prompt('请输入拒绝原因：') : '';
    if (action === 'REJECTED' && !reason) return;
    try {
      await api.patch('/admin/withdrawals/' + id, { action, rejectReason: reason });
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: action === 'APPROVED' ? 'APPROVED' : 'REJECTED' } : w));
    } catch (err) { alert(err.response?.data?.error || '操作失败'); }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">提现管理</h2>
        <p className="text-gray-400 text-sm mt-1">审核接单者的提现申请</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium ' + (filter === s ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300')}>
            {s ? (s === 'PENDING' ? '待审核' : s === 'APPROVED' ? '已通过' : '已拒绝') : '全部'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center py-8 text-gray-400">加载中...</p> : withdrawals.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700">
          <span className="text-6xl block mb-4">🏦</span>
          <p className="text-gray-400">暂无提现记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map(w => (
            <div key={w.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-200">{w.user?.name} <span className="text-gray-500 text-sm font-normal">({w.user?.email})</span></p>
                  <p className="text-lg font-bold text-green-400 mt-1">¥{w.amount?.toFixed(2)}</p>
                </div>
                <span className={'text-xs px-3 py-1 rounded-full ' + (
                  w.status === 'PENDING' ? 'bg-yellow-900/50 text-yellow-400' :
                  w.status === 'APPROVED' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                )}>
                  {w.status === 'PENDING' ? '待审核' : w.status === 'APPROVED' ? '已通过' : '已拒绝'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                <span>账户: {w.accountType} {w.accountInfo || ''}</span>
                <span>{new Date(w.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              {w.remark && <p className="text-xs text-gray-500 bg-gray-700/30 p-2 rounded">备注: {w.remark}</p>}
              {w.rejectReason && <p className="text-xs text-red-400 bg-red-900/20 p-2 rounded mt-1">拒绝原因: {w.rejectReason}</p>}
              {w.status === 'PENDING' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => review(w.id, 'APPROVED')} className="px-4 py-2 bg-green-600/50 text-green-300 rounded-xl text-sm hover:bg-green-600/70">通过</button>
                  <button onClick={() => review(w.id, 'REJECTED')} className="px-4 py-2 bg-red-600/50 text-red-300 rounded-xl text-sm hover:bg-red-600/70">拒绝</button>
                </div>
              )}
              {w.reviewer && <p className="text-xs text-gray-500 mt-2">审核人: {w.reviewer.name} · {w.reviewedAt ? new Date(w.reviewedAt).toLocaleString('zh-CN') : ''}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
