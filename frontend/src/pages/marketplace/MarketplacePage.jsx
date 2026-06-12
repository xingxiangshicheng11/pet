import { useState, useEffect, useRef } from 'react';
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

function ReviewStars({ avg, count }) {
  if (!count) return <span className="text-xs text-gray-400">暂无评价</span>;
  const full = Math.round(avg);
  return (
    <span className="text-xs text-yellow-500">
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      <span className="text-gray-400 ml-1">({count})</span>
    </span>
  );
}

export default function MarketplacePage() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [buyForm, setBuyForm] = useState({ message: '', scheduledTime: '', address: '' });
  const [buying, setBuying] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [buyPassword, setBuyPassword] = useState('');
  const [buyError, setBuyError] = useState('');
  const [showSitter, setShowSitter] = useState(null);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(new Set());
  const [sitterReviews, setSitterReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    api.get('/owner/favorites').then(res => {
      const set = new Set(res.data.map(f => f.sitter?.id));
      setFavorites(set);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      params.set('all', 'true');
      api.get('/products?' + params.toString()).then(res => {
        setProducts(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [category, search]);

  let sorted = [...products];
  if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') sorted.sort((a, b) => (b.sitter?.reviewAvg || 0) - (a.sitter?.reviewAvg || 0));
  else sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const toggleFav = async (e, sitterId) => {
    e.stopPropagation();
    try {
      if (favorites.has(sitterId)) {
        const favs = await api.get('/owner/favorites');
        const found = favs.data.find(f => f.sitter?.id === sitterId);
        if (found) await api.delete('/owner/favorites/' + found.id);
        setFavorites(prev => { const n = new Set(prev); n.delete(sitterId); return n; });
      } else {
        await api.post('/owner/favorites', { sitterId });
        setFavorites(prev => { const n = new Set(prev); n.add(sitterId); return n; });
      }
    } catch {}
  };

  const loadReviews = async (sitterId) => {
    setReviewsLoading(true);
    try {
      const res = await api.get('/reviews/user/' + sitterId);
      setSitterReviews(res.data);
    } catch {}
    setReviewsLoading(false);
  };

  const handleSelect = (product) => {
    setSelected(product);
    loadReviews(product.sitter.id);
  };

  const handleBuy = async () => {
    setShowPasswordModal(true);
    setBuyPassword('');
    setBuyError('');
  };

  const confirmBuy = async () => {
    if (!buyPassword) { setBuyError('请输入当前密码'); return; }
    setBuying(true);
    setBuyError('');
    try {
      await api.post('/products/buy', { productId: selected.id, ...buyForm, password: buyPassword });
      setShowPasswordModal(false);
      alert('购买成功！等待接单者确认');
      setSelected(null);
      setBuyForm({ message: '', scheduledTime: '', address: '' });
    } catch (err) {
      setBuyError(err.response?.data?.error || '购买失败');
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
                  <button onClick={handleBuy} disabled={buying}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
                    {buying ? '购买中...' : '立即购买 ¥' + selected.price}
                  </button>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-green-800">用户评价</h3>
                  <span className="text-sm text-gray-400">
                    {selected.sitter.reviewCount || 0} 条评价 · 平均 {selected.sitter.reviewAvg || 0} 分
                  </span>
                </div>
                {reviewsLoading ? (
                  <div className="text-center py-4"><div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" /></div>
                ) : sitterReviews.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">暂无用户评价</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {sitterReviews.map(r => (
                      <div key={r.id} className="bg-green-50 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                              {r.reviewer?.name?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{r.reviewer?.name || '匿名'}</span>
                          </div>
                          <span className="text-yellow-500 text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        </div>
                        {r.order?.title && <p className="text-xs text-gray-400 mb-1">服务: {r.order.title}</p>}
                        {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2">确认购买</h3>
              <p className="text-sm text-gray-500 mb-4">支付金额: <span className="text-green-600 font-bold">¥{selected?.price}</span></p>
              {buyError && <p className="text-red-500 text-xs bg-red-50 p-2 rounded mb-3">{buyError}</p>}
              <input type="password" placeholder="请输入当前密码验证身份" autoFocus
                value={buyPassword} onChange={e => setBuyPassword(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400 mb-4"
                onKeyDown={e => e.key === 'Enter' && confirmBuy()} />
              <div className="flex gap-2">
                <button onClick={confirmBuy} disabled={buying}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium">
                  {buying ? '购买中...' : '确认购买'}
                </button>
                <button onClick={() => setShowPasswordModal(false)} disabled={buying}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium">
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
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
              placeholder="搜索服务或接单者..."
              className="p-2.5 border border-green-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none w-52" />
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
                onClick={() => handleSelect(p)}>
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
                        <ReviewStars avg={p.sitter.reviewAvg} count={p.sitter.reviewCount} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => toggleFav(e, p.sitter.id)}
                        className={'text-lg ' + (favorites.has(p.sitter.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400')}>
                        {favorites.has(p.sitter.id) ? '⭐' : '☆'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setShowSitter(p.sitter.id); }}
                        className="text-xs text-green-600 hover:text-green-700 underline">简历</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认购买</h3>
            <p className="text-sm text-gray-500 mb-4">支付金额: <span className="text-green-600 font-bold">¥{selected?.price}</span></p>
            {buyError && <p className="text-red-500 text-xs bg-red-50 p-2 rounded mb-3">{buyError}</p>}
            <input type="password" placeholder="请输入当前密码验证身份" autoFocus
              value={buyPassword} onChange={e => setBuyPassword(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-400 mb-4"
              onKeyDown={e => e.key === 'Enter' && confirmBuy()} />
            <div className="flex gap-2">
              <button onClick={confirmBuy} disabled={buying}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium">
                {buying ? '购买中...' : '确认购买'}
              </button>
              <button onClick={() => setShowPasswordModal(false)} disabled={buying}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
