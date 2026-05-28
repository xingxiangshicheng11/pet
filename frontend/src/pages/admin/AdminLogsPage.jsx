import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const load = async (p) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p || page, limit: '30' });
      if (actionFilter) params.set('action', actionFilter);
      const res = await api.get('/admin/logs?' + params.toString());
      setLogs(res.data.logs);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(1); }, [actionFilter]);

  const actionLabels = {
    update_user: '更新用户', update_service_status: '更新服务状态', assign_sitter: '分配接单者',
    approve_withdrawal: '通过提现', reject_withdrawal: '拒绝提现', handle_emergency: '处理告警',
    delete_review: '删除评价', refund_payment: '退款', enable_product: '上架商品',
    disable_product: '下架商品', send_notification: '发送通知', update_config: '更新配置',
  };

  const actionColors = {
    update_user: 'bg-blue-900/30 text-blue-400', update_service_status: 'bg-yellow-900/30 text-yellow-400',
    assign_sitter: 'bg-green-900/30 text-green-400', approve_withdrawal: 'bg-green-900/30 text-green-400',
    reject_withdrawal: 'bg-red-900/30 text-red-400', handle_emergency: 'bg-purple-900/30 text-purple-400',
    delete_review: 'bg-red-900/30 text-red-400', refund_payment: 'bg-orange-900/30 text-orange-400',
    enable_product: 'bg-green-900/30 text-green-400', disable_product: 'bg-gray-700 text-gray-300',
    send_notification: 'bg-blue-900/30 text-blue-400', update_config: 'bg-teal-900/30 text-teal-400',
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">操作日志</h2>
        <p className="text-gray-400 text-sm mt-1">管理员操作记录审计</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setActionFilter('')}
          className={'px-3 py-1.5 rounded-lg text-xs font-medium ' + (!actionFilter ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300')}>全部</button>
        {Object.entries(actionLabels).map(([k, v]) => (
          <button key={k} onClick={() => setActionFilter(k)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium ' + (actionFilter === k ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300')}>
            {v}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700/50 text-left">
                <th className="p-4 text-gray-300 font-medium">时间</th>
                <th className="p-4 text-gray-300 font-medium">管理员</th>
                <th className="p-4 text-gray-300 font-medium">操作</th>
                <th className="p-4 text-gray-300 font-medium">目标</th>
                <th className="p-4 text-gray-300 font-medium">详情</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">加载中...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">暂无日志</td></tr>
              ) : logs.map(l => (
                <tr key={l.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                  <td className="p-4 text-gray-400 text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="p-4 text-gray-200">{l.admin?.name}</td>
                  <td className="p-4">
                    <span className={'text-xs px-2 py-0.5 rounded ' + (actionColors[l.action] || 'bg-gray-700 text-gray-400')}>
                      {actionLabels[l.action] || l.action}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-xs">{l.targetType}#{l.targetId || '-'}</td>
                  <td className="p-4 text-gray-500 text-xs max-w-xs truncate">{l.detail || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-700 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => load(p)}
                className={'px-3 py-1.5 rounded-lg text-sm ' + (p === page ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
