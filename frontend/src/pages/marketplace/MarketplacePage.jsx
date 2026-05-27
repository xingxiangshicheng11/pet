import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import SitterProfile from '../../components/SitterProfile';

const categories = [
  { key: '', label: '全部', icon: '📋' },
  { key: 'sitting', label: '宠物陪伴', icon: '🤗' },
  { key: 'walking', label: '遛狗', icon: '🚶' },
  { key: 'feeding', label: '喂食', icon: '🍽️' },
  { key: 'grooming', label: '美容', icon: '✂️' },
  { key: 'training', label: '训练', icon: '🎯' },
];

const sortOptions = [
  { key: 'newest', label: '最新上架' },
  { key: 'price_asc', label: '价格从低到高' },
  { key: 'price_desc', label: '价格从高到低' },
  { key: 'rating', label: '好评优先' },
];

export default function MarketplacePage() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [buyForm, setBuyForm] = useState({ message: '', scheduledTime: '', address: '' });
  const [buying, setBuying] = useState(false);
  const [showSitter, setShowSitter] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    params.set('all', 'true');
    api.get('/products?' + params.toString()).then(res => {
      setProducts(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [category]);

  let sorted = [...products];
  if (search) sorted = sorted.filter(p => (p.sitter?.name || '').toLowerCase().includes(search.toLowerCase()));
  if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') sorted.sort((a, b) => (b.sitter?.rating || 0) - (a.sitter?.rating || 0));
  else sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleBuy = async (productId) => {
    setBuying(true);
    try {
      await api.post('/products/buy', { productId, ...buyForm });
      alert('购买成功！等待接单者确认');
      setSelected(null);
      setBuyForm({ message: '', scheduledTime: '', address: '' });
    } catch (err) {
      alert(err.response?.data?.error || '购买失败');
    }
    setBuying(false);
  };

  if (showSitter) {
    return (
      <div className="min-h-screen bg-green-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button onClick={() => setShowSitter(null)} className="text-green-600 hover:text-green-700 flex items-center gap-1">← 返回商城</button>
          </div>
        </header>
        <main className="max-w-4xl mx-auto p-4 lg:p-8">
          <SitterProfile userId={showSitter} />
        </main>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="min-h-screen bg-green-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => setSelected(null)} className="text-green-600 hover:text-green-700 flex items-center gap-1">← 返回商城</button>
            <Link to="/owner" className="text-sm text-green-600">← 回到面板</Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto p-4 lg:p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
            <div className="bg-green-600 p-8 text-white">
              <h2 className="text-2xl font-bold mb-2">{selected.title}</h2>
              <div className="flex items-center gap-3">
                <span>由 {selected.sitter.name} 提供</span>
                <button onClick={() => setShowSitter(selected.sitter.id)}
                  className="text-xs bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors">查看简历</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full">
                  {categories.find(c => c.key === selected.category)?.icon} {categories.find(c => c.key === selected.category)?.label || selected.category}
                </span>
                <span className="text-2xl font-bold text-green-700">¥{selected.price}</span>
                <span className="text-gray-500">时长: {selected.duration}分钟</span>
              </div>
              <p className="text-gray-600 leading-relaxed">{selected.description || '暂无描述'}</p>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-green-800 mb-4">下单购买</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">备注信息</label>
                    <textarea value={buyForm.message}
                      onChange={e => setBuyForm({ ...buyForm, message: e.target.value })}
                      className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" rows="2" placeholder="如：宠物信息、特殊要求..." />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">预约时间</label>
                    <input type="datetime-local" value={buyForm.scheduledTime}
                      onChange={e => setBuyForm({ ...buyForm, scheduledTime: e.target.value })}
                      className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">服务地址</label>
                    <input value={buyForm.address}
                      onChange={e => setBuyForm({ ...buyForm, address: e.target.value })}
                      className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" placeholder="请输入地址" />
                  </div>
                  <button onClick={() => handleBuy(selected.id)} disabled={buying}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
                    {buying ? '购买中...' : '立即购买 ¥' + selected.price}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏪</span>
            <h1 className="text-xl font-bold text-green-800">服务商城</h1>
          </div>
          <Link to="/owner" className="text-sm text-green-600 hover:text-green-700">← 回到面板</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-8">
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(c => (
              <button key={c.key} onClick={() => setCategory(c.key)}
                className={'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ' + (category === c.key ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 border border-green-100 hover:bg-green-50')}>
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索接单者..."
              className="p-2.5 border border-green-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none w-44" />
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="p-2.5 border border-green-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none">
              {sortOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
            <span className="text-6xl block mb-4">📭</span>
            <p className="text-gray-400">暂无可用服务</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden card-hover cursor-pointer"
                onClick={() => setSelected(p)}>
                <div className="bg-green-600 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">
                      {p.category === 'walking' ? '🚶' : p.category === 'feeding' ? '🍽️' : p.category === 'grooming' ? '✂️' : p.category === 'training' ? '🎯' : '🤗'}
                    </span>
                    <span className="text-2xl font-bold text-white">¥{p.price}</span>
                  </div>
                  <h3 className="font-semibold text-white text-lg">{p.title}</h3>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{p.description || '暂无描述'}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700">
                        {p.sitter.name?.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block">{p.sitter.name}</span>
                        <span className="text-xs text-yellow-500">{'⭐'.repeat(Math.round(p.sitter.rating || 0)) || '新'}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setShowSitter(p.sitter.id); }}
                      className="text-xs text-green-600 hover:text-green-700 underline">简历</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
