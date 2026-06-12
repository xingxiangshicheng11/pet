import { useState } from 'react';
import api from '../services/api';

export default function PaymentButton({ orderId, amount, onPaid }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    setShowConfirm(true);
    setPassword('');
    setError('');
  };

  const confirmPay = async () => {
    if (!password) { setError('请输入当前密码'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/payments', { orderId, amount, method: 'alipay', password });
      setShowConfirm(false);
      onPaid?.();
    } catch (err) {
      setError(err.response?.data?.error || '支付失败');
    }
    setLoading(false);
  };

  return (
    <>
      <button onClick={pay} disabled={loading}
        className="bg-green-500 text-white px-6 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50">
        {loading ? '支付中...' : '支付 ¥' + amount}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认支付</h3>
            <p className="text-sm text-gray-500 mb-4">支付金额: <span className="text-green-600 font-bold">¥{amount}</span></p>
            {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded mb-3">{error}</p>}
            <input type="password" placeholder="请输入当前密码验证身份" autoFocus
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400 mb-4"
              onKeyDown={e => e.key === 'Enter' && confirmPay()} />
            <div className="flex gap-2">
              <button onClick={confirmPay} disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium">
                {loading ? '支付中...' : '确认支付'}
              </button>
              <button onClick={() => setShowConfirm(false)} disabled={loading}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
