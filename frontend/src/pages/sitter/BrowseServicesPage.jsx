import { useState, useEffect } from 'react';
import api from '../../services/api';
import socket from '../../services/socket';

const sortOptions = [
  { key: 'newest', label: '最新发布' },
  { key: 'price_asc', label: '价格从低到高' },
  { key: 'price_desc', label: '价格从高到低' },
];

const petTypeLabels = { dog: '狗', cat: '猫', other: '其他' };
const categoryLabels = { sitting: '宠物陪伴', walking: '遛狗', feeding: '喂食', grooming: '美容', training: '训练' };

export default function BrowseServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPet, setFilterPet] = useState('');
  const [selected, setSelected] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    api.get('/services?all=true').then(res => {
      setServices(res.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    socket.on('service:new', (svc) => {
      setServices(prev => [svc, ...prev]);
    });
    return () => socket.off('service:new');
  }, []);

  const acceptService = async (id) => {
    setAccepting(true);
    try {
      const res = await api.post('/services/' + id + '/accept');
      setServices(prev => prev.map(s => s.id === id ? res.data : s));
      setSelected(res.data);
    } catch (err) {
      alert(err.response?.data?.error || '接单失败');
    }
    setAccepting(false);
  };

  let filtered = services.filter(s => s.status === 'OPEN');
  if (filterCategory) filtered = filtered.filter(s => s.category === filterCategory);
  if (filterPet) filtered = filtered.filter(s => (s.pet?.species || 'other') === filterPet);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price_asc') return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (selected) {
    const s = selected;
    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-green-600 hover:text-green-700 text-sm mb-4 flex items-center gap-1">← 返回列表</button>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-semibold text-lg text-gray-800">{s.title}</h3>
            {s.status === 'ACCEPTED' ? (
              <span className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full">已接单</span>
            ) : (
              <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">待接单</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">宠物</p>
              <p className="text-sm text-gray-700">{s.pet?.name} ({petTypeLabels[s.pet?.species] || s.pet?.species}) {s.pet?.breed ? '· ' + s.pet.breed : ''}</p>
              {s.pet?.age && <p className="text-xs text-gray-400">{s.pet.age}岁 {s.pet.weight ? '· ' + s.pet.weight + 'kg' : ''}</p>}
              {s.pet?.notes && <p className="text-xs text-gray-400 mt-1">{s.pet.notes}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">服务内容</p>
              <p className="text-sm text-gray-700">{categoryLabels[s.category] || s.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">价格</p>
              <p className="text-sm font-semibold text-green-700">¥{s.price}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">宠物主</p>
              <p className="text-sm text-gray-700">{s.owner?.name}</p>
            </div>
            {s.description && (
              <div className="md:col-span-2">
                <p className="text-xs text-gray-400 mb-1">需求描述</p>
                <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-xl">{s.description}</p>
              </div>
            )}
            {s.address && (
              <div>
                <p className="text-xs text-gray-400 mb-1">服务地址</p>
                <p className="text-sm text-gray-700">📍 {s.address}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">时间段</p>
              <p className="text-sm text-gray-700">{new Date(s.scheduledStart).toLocaleString('zh-CN')} ~ {new Date(s.scheduledEnd).toLocaleString('zh-CN')}</p>
            </div>
          </div>
          {s.status === 'OPEN' ? (
            <button onClick={() => acceptService(s.id)} disabled={accepting}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              {accepting ? '接单中...' : '确认接单'}
            </button>
          ) : (
            <div className="bg-green-50 p-4 rounded-xl text-sm text-green-700">
              已成功接单！前往「<a href="/sitter/jobs" className="underline font-medium">我的服务</a>」查看详情
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <p className="text-center py-8 text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">浏览需求</h2>
        <p className="text-sm text-green-600 mt-1">筛选和排序所有待接单的服务</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="p-2.5 border border-green-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none">
          {sortOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="p-2.5 border border-green-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none">
          <option value="">全部服务</option>
          {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPet} onChange={e => setFilterPet(e.target.value)}
          className="p-2.5 border border-green-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none">
          <option value="">全部宠物</option>
          {Object.entries(petTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="text-sm text-gray-400 self-center ml-auto">共 {sorted.length} 个需求</span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
          <span className="text-6xl block mb-4">🔍</span>
          <p className="text-gray-400">暂无匹配的需求</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map(s => (
            <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 card-hover cursor-pointer"
              onClick={() => setSelected(s)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{s.pet?.species === 'dog' ? '🐕' : s.pet?.species === 'cat' ? '🐱' : '🐾'}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">{s.title}</h3>
                    <p className="text-xs text-gray-400">{s.pet?.name} · {s.pet?.breed || '未知品种'}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-700">¥{s.price}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 flex-wrap">
                <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{categoryLabels[s.category] || s.category}</span>
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{petTypeLabels[s.pet?.species] || s.pet?.species}</span>
                <span>{s.owner?.name}</span>
                {s.address && <span>📍 {s.address}</span>}
              </div>
              {s.description && <p className="text-sm text-gray-500 line-clamp-2">{s.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
