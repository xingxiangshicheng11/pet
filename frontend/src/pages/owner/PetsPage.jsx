import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function PetsPage() {
  const [pets, setPets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', species: 'dog', breed: '', age: '', weight: '', notes: '' });

  const loadPets = async () => {
    const res = await api.get('/pets');
    setPets(res.data);
  };

  useEffect(() => { loadPets(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/pets', {
        ...form,
        age: form.age ? parseInt(form.age) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
      });
      setShowForm(false);
      setForm({ name: '', species: 'dog', breed: '', age: '', weight: '', notes: '' });
      loadPets();
    } catch (err) {
      setError(err.response?.data?.error || '保存失败，请重试');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除宠物？')) return;
    await api.delete('/pets/' + id);
    loadPets();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-green-900">我的宠物</h2>
          <p className="text-sm text-green-600 mt-1">管理您的宠物档案</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={'px-5 py-2.5 rounded-xl text-sm font-medium ' + (showForm ? 'bg-gray-200 text-gray-600' : 'bg-green-600 text-white shadow-md hover:bg-green-700')}>
          {showForm ? '取消' : '+ 添加宠物'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 mb-6">
          <h3 className="font-semibold text-green-800 mb-4">添加新宠物</h3>
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="宠物名" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
            <select value={form.species} onChange={e => setForm({ ...form, species: e.target.value })}
              className="p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm">
              <option value="dog">狗</option>
              <option value="cat">猫</option>
              <option value="other">其他</option>
            </select>
            <input placeholder="品种" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })}
              className="p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" />
            <input placeholder="年龄(岁)" type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
              className="p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" />
            <input placeholder="体重(kg)" type="number" step="0.1" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })}
              className="p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" />
          </div>
          <textarea placeholder="备注" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm mt-4" rows="2" />
          <button type="submit" disabled={submitting}
            className="mt-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            {submitting ? '保存中...' : '保存'}
          </button>
        </form>
      )}

      {pets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
          <span className="text-6xl block mb-4">🐾</span>
          <p className="text-gray-400">还没有添加宠物</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pets.map(pet => (
            <div key={pet.id} className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 card-hover">
              <div className="flex justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-2xl">
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{pet.name}</h3>
                    <p className="text-sm text-gray-500">{pet.species === 'dog' ? '狗' : pet.species === 'cat' ? '猫' : '其他'} · {pet.breed || '未知品种'}</p>
                    <p className="text-sm text-gray-400">{pet.age ? pet.age + '岁' : ''} {pet.weight ? pet.weight + 'kg' : ''}</p>
                    {pet.notes && <p className="text-xs text-gray-400 mt-1">{pet.notes}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(pet.id)} className="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
