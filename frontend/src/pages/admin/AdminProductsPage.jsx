import { useState, useEffect } from 'react';
import api from '../../services/api';

const categoryIcons = { sitting: '🤗', walking: '🚶', feeding: '🍽️', grooming: '✂️', training: '🎯' };
const categoryLabels = { sitting: '宠物陪伴', walking: '遛狗', feeding: '喂食', grooming: '美容', training: '训练' };

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? '?isActive=' + filter : '';
    api.get('/admin/products' + params).then(res => {
      setProducts(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  const toggle = async (id, active) => {
    try {
      await api.patch('/admin/products/' + id, { isActive: !active });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !active } : p));
    } catch (err) { alert('操作失败'); }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">商城商品管理</h2>
        <p className="text-gray-400 text-sm mt-1">审核和管理接单者发布的商品</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'true', 'false'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium ' + (filter === s ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300')}>
            {s === '' ? '全部' : s === 'true' ? '上架中' : '已下架'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center py-8 text-gray-400">加载中...</p> : products.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700">
          <span className="text-6xl block mb-4">🏪</span>
          <p className="text-gray-400">暂无商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
              <div className={'p-4 ' + (p.isActive ? 'bg-green-900/20' : 'bg-gray-700/50')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{categoryIcons[p.category] || '📦'}</span>
                  <span className={'text-xs px-2 py-0.5 rounded ' + (p.isActive ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400')}>
                    {p.isActive ? '上架' : '下架'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-200">{p.title}</h3>
                <p className="text-lg font-bold text-green-400 mt-1">¥{p.price}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-400 mb-2">发布者: {p.sitter?.name} · {categoryLabels[p.category] || p.category}</p>
                {p.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>订单: {p._count?.orders || 0}</span>
                  <button onClick={() => toggle(p.id, p.isActive)}
                    className={'px-3 py-1 rounded-lg ' + (p.isActive ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50')}>
                    {p.isActive ? '下架' : '上架'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
