import { useState, useEffect } from 'react';
import api from '../../services/api';

const categories = [
  { key: 'sitting', label: '宠物陪伴' },
  { key: 'walking', label: '遛狗' },
  { key: 'feeding', label: '喂食' },
  { key: 'grooming', label: '美容' },
  { key: 'training', label: '训练' },
];

export default function MyProductsPage() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'sitting',
    price: '', duration: 60,
  });

  const loadProducts = async () => {
    try {
      const uid = parseInt(localStorage.getItem('userId') || '0');
      const res = await api.get('/products?all=true&sitterId=' + uid);
      setProducts(res.data);
    } catch {}
  };

  useEffect(() => { loadProducts(); }, []);

  const resetForm = () => {
    setForm({ title: '', description: '', category: 'sitting', price: '', duration: 60 });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put('/products/' + editing.id, { ...form, price: parseFloat(form.price) });
      } else {
        await api.post('/products', { ...form, price: parseFloat(form.price) });
      }
      resetForm();
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleEdit = (p) => {
    setForm({ title: p.title, description: p.description || '', category: p.category, price: String(p.price), duration: p.duration });
    setEditing(p);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除该商品？')) return;
    await api.delete('/products/' + id);
    loadProducts();
  };

  const toggleActive = async (p) => {
    await api.put('/products/' + p.id, { isActive: !p.isActive });
    loadProducts();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-green-900">服务商品</h2>
          <p className="text-sm text-green-600 mt-1">在商城中展示您的服务</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className={'px-5 py-2.5 rounded-xl text-sm font-medium transition-all ' + (showForm ? 'bg-gray-200 text-gray-600' : 'gradient-green text-white shadow-md')}>
          {showForm ? '取消' : '+ 发布商品'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 mb-6">
          <h3 className="font-semibold text-green-800 mb-4">{editing ? '编辑商品' : '发布新商品'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">商品标题</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">描述</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" rows="3" placeholder="详细介绍您的服务内容..." />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">服务类型</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm">
                {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">价格 (¥)</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">时长 (分钟)</label>
              <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: +e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" />
            </div>
          </div>
          <button type="submit" className="mt-4 gradient-green text-white px-6 py-2.5 rounded-xl text-sm font-medium">
            {editing ? '保存修改' : '发布'}
          </button>
        </form>
      )}

      {products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
          <span className="text-6xl block mb-4">🏪</span>
          <p className="text-gray-400">还没有发布服务商品</p>
          <button onClick={() => setShowForm(true)} className="mt-4 gradient-green text-white px-6 py-2.5 rounded-xl text-sm font-medium">
            立即发布
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map(p => (
            <div key={p.id} className={'bg-white p-5 rounded-2xl shadow-sm border transition-all ' + (p.isActive ? 'border-green-100' : 'border-gray-200 opacity-70')}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{p.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{categories.find(c => c.key === p.category)?.label} · {p.duration}分钟</p>
                </div>
                <span className="text-xl font-bold text-green-700">¥{p.price}</span>
              </div>
              {p.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.description}</p>}
              <div className="flex items-center justify-between">
                <button onClick={() => toggleActive(p)}
                  className={'text-xs px-3 py-1.5 rounded-lg ' + (p.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500')}>
                  {p.isActive ? '上架中' : '已下架'}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(p)} className="text-xs text-blue-500 hover:text-blue-700">编辑</button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:text-red-700">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
