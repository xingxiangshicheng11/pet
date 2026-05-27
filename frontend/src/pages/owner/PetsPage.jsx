import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function PetsPage() {
  const [pets, setPets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedPet, setSelectedPet] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [medForm, setMedForm] = useState({ type: 'vaccination', title: '', description: '', date: '', vetName: '', notes: '' });
  const [form, setForm] = useState({ name: '', species: 'dog', breed: '', age: '', weight: '', notes: '', photo: '' });

  const loadPets = async () => {
    const res = await api.get('/pets');
    setPets(res.data);
  };

  useEffect(() => { loadPets(); }, []);

  const resetForm = () => {
    setForm({ name: '', species: 'dog', breed: '', age: '', weight: '', notes: '', photo: '' });
    setEditingPet(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        age: form.age ? parseInt(form.age) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
      };
      if (editingPet) {
        await api.put('/pets/' + editingPet.id, payload);
      } else {
        await api.post('/pets', payload);
      }
      setShowForm(false);
      resetForm();
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

  const handleEdit = (pet) => {
    setEditingPet(pet);
    setForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      age: pet.age ? String(pet.age) : '',
      weight: pet.weight ? String(pet.weight) : '',
      notes: pet.notes || '',
      photo: pet.photo || '',
    });
    setShowForm(true);
    setError('');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm({ ...form, photo: ev.target.result });
    reader.readAsDataURL(file);
  };

  const loadMedicalRecords = async (petId) => {
    try {
      const res = await api.get('/owner/pets/' + petId + '/medical');
      setMedicalRecords(res.data);
    } catch { setMedicalRecords([]); }
  };

  const handleViewPet = (pet) => {
    setSelectedPet(pet);
    loadMedicalRecords(pet.id);
    setShowMedicalForm(false);
  };

  const handleAddMedical = async (e) => {
    e.preventDefault();
    try {
      await api.post('/owner/pets/' + selectedPet.id + '/medical', {
        ...medForm,
        date: medForm.date ? new Date(medForm.date).toISOString() : new Date().toISOString(),
      });
      setShowMedicalForm(false);
      setMedForm({ type: 'vaccination', title: '', description: '', date: '', vetName: '', notes: '' });
      loadMedicalRecords(selectedPet.id);
    } catch (err) {
      alert(err.response?.data?.error || '保存失败');
    }
  };

  if (selectedPet) {
    return (
      <div>
        <button onClick={() => setSelectedPet(null)} className="text-green-600 hover:text-green-700 text-sm mb-4 flex items-center gap-1">← 返回宠物列表</button>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 mb-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center text-4xl overflow-hidden">
              {selectedPet.photo ? <img src={selectedPet.photo} className="w-full h-full object-cover" /> : (selectedPet.species === 'dog' ? '🐕' : selectedPet.species === 'cat' ? '🐱' : '🐾')}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-800">{selectedPet.name}</h3>
              <p className="text-sm text-gray-500">{selectedPet.species === 'dog' ? '狗' : selectedPet.species === 'cat' ? '猫' : '其他'} · {selectedPet.breed || '未知品种'}</p>
              <p className="text-sm text-gray-400">{selectedPet.age ? selectedPet.age + '岁' : ''} {selectedPet.weight ? selectedPet.weight + 'kg' : ''}</p>
              {selectedPet.notes && <p className="text-xs text-gray-400 mt-1">{selectedPet.notes}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-green-800">医疗档案</h3>
          <button onClick={() => setShowMedicalForm(!showMedicalForm)}
            className={'px-4 py-2 rounded-xl text-sm font-medium ' + (showMedicalForm ? 'bg-gray-200 text-gray-600' : 'bg-green-600 text-white')}>
            {showMedicalForm ? '取消' : '+ 添加记录'}
          </button>
        </div>

        {showMedicalForm && (
          <form onSubmit={handleAddMedical} className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={medForm.type} onChange={e => setMedForm({ ...medForm, type: e.target.value })}
                className="p-3 border border-green-200 rounded-xl text-sm">
                <option value="vaccination">疫苗接种</option>
                <option value="vet_visit">就诊记录</option>
                <option value="medication">用药记录</option>
                <option value="other">其他</option>
              </select>
              <input placeholder="标题" value={medForm.title} onChange={e => setMedForm({ ...medForm, title: e.target.value })}
                className="p-3 border border-green-200 rounded-xl text-sm" required />
              <input type="date" value={medForm.date} onChange={e => setMedForm({ ...medForm, date: e.target.value })}
                className="p-3 border border-green-200 rounded-xl text-sm" />
              <input placeholder="兽医姓名" value={medForm.vetName} onChange={e => setMedForm({ ...medForm, vetName: e.target.value })}
                className="p-3 border border-green-200 rounded-xl text-sm" />
              <div className="md:col-span-2">
                <textarea placeholder="描述" value={medForm.description} onChange={e => setMedForm({ ...medForm, description: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl text-sm" rows="2" />
              </div>
            </div>
            <button type="submit" className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">保存</button>
          </form>
        )}

        {medicalRecords.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-green-100">
            <p className="text-gray-400 text-sm">暂无医疗记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {medicalRecords.map(r => (
              <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{r.title}</span>
                    <span className={'text-xs px-2 py-0.5 rounded-full ' + (
                      r.type === 'vaccination' ? 'bg-blue-50 text-blue-600' :
                      r.type === 'vet_visit' ? 'bg-red-50 text-red-600' :
                      r.type === 'medication' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-600'
                    )}>
                      {r.type === 'vaccination' ? '疫苗' : r.type === 'vet_visit' ? '就诊' : r.type === 'medication' ? '用药' : '其他'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.date).toLocaleDateString('zh-CN')}</span>
                </div>
                {r.description && <p className="text-sm text-gray-500">{r.description}</p>}
                {r.vetName && <p className="text-xs text-gray-400 mt-1">兽医: {r.vetName}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-green-900">我的宠物</h2>
          <p className="text-sm text-green-600 mt-1">管理您的宠物档案</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}
          className={'px-5 py-2.5 rounded-xl text-sm font-medium ' + (showForm ? 'bg-gray-200 text-gray-600' : 'bg-green-600 text-white shadow-md hover:bg-green-700')}>
          {showForm ? '取消' : '+ 添加宠物'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 mb-6">
          <h3 className="font-semibold text-green-800 mb-4">{editingPet ? '编辑宠物' : '添加新宠物'}</h3>
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
            <div>
              <label className="block text-sm text-gray-500 mb-1">照片</label>
              <input type="file" accept="image/*" onChange={handlePhotoUpload}
                className="w-full p-2 border border-green-200 rounded-xl text-sm" />
              {form.photo && <img src={form.photo} className="w-16 h-16 object-cover rounded-lg mt-2" />}
            </div>
          </div>
          <textarea placeholder="备注" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm mt-4" rows="2" />
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={submitting}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              {submitting ? '保存中...' : '保存'}
            </button>
            {editingPet && (
              <button type="button" onClick={resetForm}
                className="border border-green-300 text-green-600 px-6 py-2.5 rounded-xl text-sm font-medium">
                取消
              </button>
            )}
          </div>
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
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                    {pet.photo ? <img src={pet.photo} className="w-full h-full object-cover" /> : (pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{pet.name}</h3>
                    <p className="text-sm text-gray-500">{pet.species === 'dog' ? '狗' : pet.species === 'cat' ? '猫' : '其他'} · {pet.breed || '未知品种'}</p>
                    <p className="text-sm text-gray-400">{pet.age ? pet.age + '岁' : ''} {pet.weight ? pet.weight + 'kg' : ''}</p>
                    {pet.notes && <p className="text-xs text-gray-400 mt-1">{pet.notes}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => handleEdit(pet)} className="text-blue-400 hover:text-blue-600 text-xs px-2 py-1">编辑</button>
                  <button onClick={() => handleViewPet(pet)} className="text-green-400 hover:text-green-600 text-xs px-2 py-1">档案</button>
                  <button onClick={() => handleDelete(pet.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
