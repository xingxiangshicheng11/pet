import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function SitterWalletPage() {
  const [wallet, setWallet] = useState({ walletBalance: 0, frozenAmount: 0, totalRevenue: 0, withdrawals: [] });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', accountType: 'wechat', accountInfo: '' });
  const [withdrawing, setWithdrawing] = useState(false);
  const [services, setServices] = useState([]);

  const uid = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    const load = async () => {
      try {
        const [wRes, sRes] = await Promise.all([
          api.get('/sitter/wallet'),
          api.get('/services?all=true'),
        ]);
        setWallet(wRes.data);
        setServices(sRes.data.filter(s => s.sitter?.id === uid));
      } catch {}
    };
    load();
  }, []);

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawForm.amount);
    if (!amt || amt <= 0) { alert('输入有效金额'); return; }
    if (amt > wallet.walletBalance) { alert('余额不足'); return; }
    setWithdrawing(true);
    try {
      await api.post('/sitter/withdraw', { amount: amt, ...withdrawForm });
      alert('提现申请已提交');
      setWithdrawForm({ amount: '', accountType: 'wechat', accountInfo: '' });
      const wRes = await api.get('/sitter/wallet');
      setWallet(wRes.data);
    } catch (err) {
      alert(err.response?.data?.error || '提现失败');
    }
    setWithdrawing(false);
  };

  // Monthly grouping
  const completedServices = services.filter(s => s.status === 'COMPLETED');
  const monthGroups = {};
  completedServices.forEach(s => {
    const m = new Date(s.updatedAt).getFullYear() + '-' + String(new Date(s.updatedAt).getMonth() + 1).padStart(2, '0');
    if (!monthGroups[m]) monthGroups[m] = [];
    monthGroups[m].push(s);
  });
  const sortedMonths = Object.keys(monthGroups).sort().reverse();

  const platformFee = 0.1; // 10%

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">我的钱包</h2>
        <p className="text-sm text-green-600 mt-1">收益明细与提现管理</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100">
          <p className="text-xs text-gray-400 mb-1">可提现金额</p>
          <p className="text-2xl font-bold text-green-700">¥{wallet.walletBalance}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-yellow-100">
          <p className="text-xs text-gray-400 mb-1">冻结金额</p>
          <p className="text-2xl font-bold text-yellow-600">¥{wallet.frozenAmount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
          <p className="text-xs text-gray-400 mb-1">累计收入</p>
          <p className="text-2xl font-bold text-blue-600">¥{wallet.totalRevenue}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 mb-6">
        <h3 className="font-semibold text-green-800 mb-4">申请提现</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">提现金额</label>
            <input type="number" value={withdrawForm.amount} onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
              className="w-full p-2.5 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
              placeholder="输入金额" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">提现方式</label>
              <select value={withdrawForm.accountType} onChange={e => setWithdrawForm({ ...withdrawForm, accountType: e.target.value })}
                className="w-full p-2.5 border border-green-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none">
                <option value="wechat">微信</option>
                <option value="alipay">支付宝</option>
                <option value="bank">银行卡</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">账户信息</label>
              <input value={withdrawForm.accountInfo} onChange={e => setWithdrawForm({ ...withdrawForm, accountInfo: e.target.value })}
                className="w-full p-2.5 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
                placeholder="账号/卡号" />
            </div>
          </div>
          <button onClick={handleWithdraw} disabled={withdrawing}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            {withdrawing ? '提交中...' : '提现'}
          </button>
        </div>
      </div>

      {/* 提现记录 */}
      {wallet.withdrawals?.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 mb-6">
          <h3 className="font-semibold text-green-800 mb-3">提现记录</h3>
          <div className="space-y-2">
            {wallet.withdrawals.map(w => (
              <div key={w.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl text-sm">
                <div>
                  <p className="text-gray-700 font-medium">-¥{w.amount}</p>
                  <p className="text-xs text-gray-400">{w.accountType === 'wechat' ? '微信' : w.accountType === 'alipay' ? '支付宝' : '银行卡'} · {new Date(w.createdAt).toLocaleDateString('zh-CN')}</p>
                </div>
                <span className={'text-xs px-2 py-0.5 rounded-full ' + (
                  w.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  w.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                )}>{w.status === 'COMPLETED' ? '已完成' : w.status === 'REJECTED' ? '已拒绝' : '处理中'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 收入明细 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-green-800">收入明细</h3>
          <span className="text-xs text-gray-400">平台抽成: {platformFee * 100}%</span>
        </div>
        {completedServices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">暂无收入</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sortedMonths.map(month => (
              <div key={month}>
                <div className="flex items-center justify-between mb-1 sticky top-0 bg-white pb-1">
                  <h4 className="text-sm font-bold text-gray-700">{month}</h4>
                  <span className="text-xs text-green-600 font-medium">
                    小计: ¥{monthGroups[month].reduce((s, x) => s + x.price, 0)}
                  </span>
                </div>
                <div className="space-y-1">
                  {monthGroups[month].map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 truncate">{s.title}</p>
                        <p className="text-xs text-gray-400">{s.pet?.name} · {new Date(s.updatedAt).toLocaleDateString('zh-CN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-700">+¥{s.price}</p>
                        <p className="text-xs text-gray-400">抽成 -¥{(s.price * platformFee).toFixed(1)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
