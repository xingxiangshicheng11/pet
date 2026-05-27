import { useState } from 'react';
import api from '../services/api';

export default function PaymentButton({ orderId, amount, onPaid }) {
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    setLoading(true);
    try {
      await api.post('/payments', { orderId, amount, method: 'alipay' });
      onPaid?.();
    } catch (err) {
      alert('支付失败: ' + (err.response?.data?.error || '未知错误'));
    }
    setLoading(false);
  };

  return (
    <button onClick={pay} disabled={loading}
      className="bg-green-500 text-white px-6 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50">
      {loading ? '支付中...' : '支付 ¥' + amount}
    </button>
  );
}
