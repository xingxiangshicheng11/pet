import { useState, useEffect } from 'react';
import api from '../../services/api';

const categoryLabels = { sitting: '宠物陪伴', walking: '遛狗', feeding: '喂食', grooming: '美容', training: '训练' };

export default function SitterDashboardDataPage() {
  const [data, setData] = useState({ monthlyData: {}, categoryData: {}, totalCompleted: 0, totalRevenue: 0, goodRate: 0, reviewCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sitter/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center py-8 text-gray-400">加载中...</p>;

  const months = Object.keys(data.monthlyData).sort();
  const maxMonthly = Math.max(...months.map(m => data.monthlyData[m].revenue), 1);

  const categories = Object.keys(data.categoryData);
  const maxCatCount = Math.max(...categories.map(c => data.categoryData[c].count), 1);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">数据看板</h2>
        <p className="text-sm text-green-600 mt-1">服务统计与分析</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 text-center">
          <p className="text-xs text-gray-400">累计完成</p>
          <p className="text-2xl font-bold text-green-700">{data.totalCompleted} 单</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 text-center">
          <p className="text-xs text-gray-400">累计收入</p>
          <p className="text-2xl font-bold text-green-700">¥{data.totalRevenue}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 text-center">
          <p className="text-xs text-gray-400">好评率</p>
          <p className="text-2xl font-bold text-green-700">{data.goodRate}%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 text-center">
          <p className="text-xs text-gray-400">评价数</p>
          <p className="text-2xl font-bold text-green-700">{data.reviewCount}</p>
        </div>
      </div>

      {/* 月度收益趋势 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 mb-6">
        <h3 className="font-semibold text-green-800 mb-4">月度收益趋势</h3>
        {months.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">暂无数据</p>
        ) : (
          <div className="space-y-3">
            {months.map(m => {
              const rev = data.monthlyData[m].revenue;
              const count = data.monthlyData[m].count;
              const pct = (rev / maxMonthly * 100).toFixed(0);
              return (
                <div key={m}>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span className="font-medium">{m}</span>
                    <span>¥{rev} ({count}单)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all" style={{ width: pct + '%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 服务类型分析 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100">
          <h3 className="font-semibold text-green-800 mb-4">服务类型分析</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {categories.map(c => {
                const count = data.categoryData[c].count;
                const rev = data.categoryData[c].revenue;
                const pct = (count / maxCatCount * 100).toFixed(0);
                return (
                  <div key={c}>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span className="font-medium">{categoryLabels[c] || c}</span>
                      <span>{count}单 · ¥{rev}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: pct + '%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100">
          <h3 className="font-semibold text-green-800 mb-4">优化建议</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">暂无数据</p>
          ) : (
            <div className="space-y-3 text-sm text-gray-600">
              {/* 找出最优类别 */}
              {categories.sort((a, b) => data.categoryData[b].count - data.categoryData[a].count).slice(0, 3).map((c, i) => (
                <div key={c} className="p-3 bg-green-50 rounded-xl">
                  <p className="font-medium text-green-700">🏆 热门服务 #{i + 1}: {categoryLabels[c] || c}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    共 {data.categoryData[c].count} 单，收入 ¥{data.categoryData[c].revenue}，
                    占比 {(data.categoryData[c].count / data.totalCompleted * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="font-medium text-blue-700">💡 建议</p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.totalCompleted > 0
                    ? '保持高质量服务，好评率 ' + data.goodRate + '%' + (data.goodRate < 90 ? '，建议关注服务质量提升' : '，表现优秀！')
                    : '开始接单积累数据吧'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
