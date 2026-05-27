import { useState, useEffect } from 'react';
import api from '../../services/api';

const paymentStatusMap = {
  PENDING: { label: '待支付', color: 'text-yellow-600 bg-yellow-50' },
  COMPLETED: { label: '已支付', color: 'text-green-600 bg-green-50' },
  FAILED: { label: '失败', color: 'text-red-600 bg-red-50' },
  REFUNDED: { label: '已退款', color: 'text-gray-600 bg-gray-100' },
};

export default function OwnerTransactionsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/owner/payments').then(res => {
      setPayments(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalSpent = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">交易记录</h2>
        <p className="text-sm text-green-600 mt-1">查看您的历史支付记录</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-3xl">💰</span>
          <div>
            <p className="text-sm text-gray-500">累计消费</p>
            <p className="text-2xl font-bold text-green-700">¥{totalSpent.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
          <span className="text-6xl block mb-4">🧾</span>
          <p className="text-gray-400">暂无交易记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-800">{p.serviceTitle}</p>
                  <p className="text-xs text-gray-400">{p.sitterName} · {p.petName}</p>
                </div>
                <span className={'text-xs px-3 py-1 rounded-full ' + (paymentStatusMap[p.status]?.color || '')}>
                  {paymentStatusMap[p.status]?.label || p.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">¥{p.amount?.toFixed(2)}</span>
                <span className="text-xs text-gray-400">{p.paidAt ? new Date(p.paidAt).toLocaleString('zh-CN') : new Date(p.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
