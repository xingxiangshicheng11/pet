import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? '?rating=' + filter : '';
    api.get('/admin/reviews' + params).then(res => {
      setReviews(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  const remove = async (id) => {
    if (!confirm('确认删除此评价？')) return;
    try {
      await api.delete('/admin/reviews/' + id);
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch { alert('删除失败'); }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">评价管理</h2>
        <p className="text-gray-400 text-sm mt-1">审核和管理平台评价</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['', '1', '2', '3', '4', '5'].map(r => (
          <button key={r} onClick={() => setFilter(r)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium ' + (filter === r ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300')}>
            {r ? r + ' 星' : '全部'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center py-8 text-gray-400">加载中...</p> : reviews.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700">
          <span className="text-6xl block mb-4">⭐</span>
          <p className="text-gray-400">暂无评价</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-400">{'⭐'.repeat(r.rating)}</span>
                    <span className="text-sm text-gray-300">{r.rating}分</span>
                  </div>
                  <p className="text-sm text-gray-400">{r.reviewer?.name} → {r.reviewee?.name}</p>
                  {r.order && <p className="text-xs text-gray-500">服务: {r.order.title}</p>}
                </div>
                <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-300 text-xs px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50">删除</button>
              </div>
              {r.comment && <p className="text-sm text-gray-300 bg-gray-700/30 p-3 rounded-xl">{r.comment}</p>}
              <p className="text-xs text-gray-500 mt-2">{new Date(r.createdAt).toLocaleString('zh-CN')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
