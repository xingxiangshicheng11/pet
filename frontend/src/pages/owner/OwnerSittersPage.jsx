import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function OwnerSittersPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/owner/favorites').then(res => {
      setFavorites(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const removeFavorite = async (id) => {
    if (!confirm('确认取消收藏？')) return;
    try {
      await api.delete('/owner/favorites/' + id);
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch {}
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">收藏的接单者</h2>
        <p className="text-sm text-green-600 mt-1">您收藏的宠物保姆和接单者</p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
          <span className="text-6xl block mb-4">⭐</span>
          <p className="text-gray-400 mb-4">还没有收藏接单者</p>
          <Link to="/marketplace" className="inline-block bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">去商城看看</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favorites.map(fav => (
            <div key={fav.id} className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 card-hover">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-lg font-bold text-green-700 flex-shrink-0">
                  {fav.sitter?.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">{fav.sitter?.name}</h3>
                    <button onClick={() => removeFavorite(fav.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span className="text-yellow-500">{'⭐'.repeat(Math.round(fav.sitter?.rating || 0)) || '新'}</span>
                    <span>评分 {fav.sitter?.rating?.toFixed(1) || '暂无'}</span>
                  </div>
                  {fav.sitter?.bio && <p className="text-xs text-gray-400 mt-1 truncate">{fav.sitter.bio}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">服务 {fav.sitter?.totalServices || 0} 次</span>
                    {fav.sitter?.experience && <span className="text-xs text-gray-400">{fav.sitter.experience}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
