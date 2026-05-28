import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminStatsPage() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats/overview'),
      api.get('/admin/stats/trends?months=12'),
      api.get('/admin/stats/categories'),
    ]).then(([s, t, c]) => {
      setStats(s.data);
      setTrends(t.data);
      setCategories(c.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center py-8 text-gray-400">加载中...</p>;

  const maxRevenue = Math.max(...trends.map(t => t.revenue), 1);
  const maxServices = Math.max(...trends.map(t => t.services), 1);
  const catTotal = Object.values(categories).reduce((s, c) => s + c.count, 0);
  const catColors = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#fb923c'];

  const categoryLabels = {
    sitting: '宠物陪伴', walking: '遛狗', feeding: '喂食', grooming: '美容', training: '训练',
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">数据统计</h2>
        <p className="text-gray-400 text-sm mt-1">平台运营数据分析</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats && [
          { label: '总用户', value: stats.totalUsers, icon: '👥', color: 'text-blue-400' },
          { label: '宠物主', value: stats.totalOwners, icon: '🐱', color: 'text-green-400' },
          { label: '接单者', value: stats.totalSitters, icon: '🦮', color: 'text-yellow-400' },
          { label: '管理员', value: stats.totalAdmins, icon: '⚙️', color: 'text-red-400' },
          { label: '总服务', value: stats.totalServices, icon: '📋', color: 'text-purple-400' },
          { label: '已完成', value: stats.completedServices, icon: '✅', color: 'text-green-400' },
          { label: '进行中', value: stats.activeServices, icon: '⏳', color: 'text-yellow-400' },
          { label: '已取消', value: stats.cancelledServices, icon: '❌', color: 'text-red-400' },
          { label: '总收入', value: '¥' + (stats.totalRevenue || 0).toFixed(0), icon: '💰', color: 'text-yellow-400' },
          { label: '支付总额', value: '¥' + (stats.totalPaymentAmount || 0).toFixed(0), icon: '💳', color: 'text-green-400' },
          { label: '待处理提现', value: stats.pendingWithdrawals + '笔', icon: '🏦', color: 'text-orange-400' },
          { label: '待提现金额', value: '¥' + (stats.pendingWithdrawalAmount || 0).toFixed(0), icon: '💎', color: 'text-pink-400' },
        ].map((item, i) => (
          <div key={i} className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{item.icon}</span>
              <span className={'text-xs px-2 py-0.5 rounded-full bg-gray-700 ' + item.color}>{item.label}</span>
            </div>
            <p className={'text-xl font-bold ' + item.color}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="font-semibold text-white mb-4">月度收入趋势</h3>
          <div className="flex items-end gap-1 h-40">
            {trends.map((t, i) => {
              const h = maxRevenue > 0 ? (t.revenue / maxRevenue * 100) : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute bottom-full mb-1 bg-gray-700 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    ¥{t.revenue.toFixed(0)}
                  </div>
                  <div style={{ height: Math.max(h, 2) + '%' }} className="w-full bg-green-500/80 rounded-t hover:bg-green-400 transition-all min-h-[4px]" />
                  <span className="text-[10px] text-gray-500 rotate-45 origin-left whitespace-nowrap">{t.month?.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="font-semibold text-white mb-4">月度服务数趋势</h3>
          <div className="flex items-end gap-1 h-40">
            {trends.map((t, i) => {
              const h = maxServices > 0 ? (t.services / maxServices * 100) : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute bottom-full mb-1 bg-gray-700 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    {t.services}单
                  </div>
                  <div style={{ height: Math.max(h, 2) + '%' }} className="w-full bg-blue-500/80 rounded-t hover:bg-blue-400 transition-all min-h-[4px]" />
                  <span className="text-[10px] text-gray-500 rotate-45 origin-left whitespace-nowrap">{t.month?.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="font-semibold text-white mb-4">服务分类统计</h3>
          {Object.keys(categories).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(categories).map(([key, data], i) => {
                const pct = catTotal > 0 ? (data.count / catTotal * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{categoryLabels[key] || key}</span>
                      <span className="text-gray-400">{data.count}单 · ¥{data.revenue.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div style={{ width: pct + '%', backgroundColor: catColors[i % catColors.length] }} className="h-2.5 rounded-full transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="font-semibold text-white mb-4">服务分类占比</h3>
          {Object.keys(categories).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">暂无数据</p>
          ) : (
            <div className="flex items-center justify-center h-48 gap-4">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0;
                    const entries = Object.entries(categories);
                    return entries.map(([key, data], i) => {
                      const pct = catTotal > 0 ? data.count / catTotal : 0;
                      const r = 38;
                      const circ = 2 * Math.PI * r;
                      const len = circ * pct;
                      const el = (
                        <circle key={key} cx="50" cy="50" r={r} fill="none"
                          stroke={catColors[i % catColors.length]}
                          strokeWidth="12"
                          strokeDasharray={`${len} ${circ - len}`}
                          strokeDashoffset={-offset}
                          className="transition-all duration-500" />
                      );
                      offset += len;
                      return el;
                    });
                  })()}
                  <circle cx="50" cy="50" r="24" fill="#1f2937" />
                  <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="14" fontWeight="bold" transform="rotate(90, 50, 50)">
                    {catTotal}单
                  </text>
                </svg>
              </div>
              <div className="space-y-2">
                {Object.entries(categories).map(([key, data], i) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: catColors[i % catColors.length] }} />
                    <span className="text-gray-300">{categoryLabels[key] || key}</span>
                    <span className="text-gray-500">{Math.round(data.count / catTotal * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
