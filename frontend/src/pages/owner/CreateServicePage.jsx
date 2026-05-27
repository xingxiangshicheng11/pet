import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const serviceTemplates = {
  sitting: [
    { title: '日常宠物陪伴', desc: '上门陪伴宠物，喂食、玩耍、清理，让您的宠物不孤单', duration: 120 },
    { title: '猫咪陪伴照顾', desc: '专业猫咪陪伴，包含喂食、梳毛、清理猫砂', duration: 60 },
    { title: '宠物寄养照看', desc: '全天候宠物照看服务，包含喂食、遛弯、玩耍', duration: 480 },
  ],
  walking: [
    { title: '每日遛狗服务', desc: '专业遛狗师，每次30分钟，确保狗狗充足运动', duration: 30 },
    { title: '狗狗跑步陪练', desc: '适合精力旺盛的狗狗，1小时户外跑步运动', duration: 60 },
    { title: '宠物散步陪护', desc: '悠闲散步，适合老年犬或小型犬', duration: 30 },
  ],
  feeding: [
    { title: '上门喂猫服务', desc: '专业上门喂猫，包含喂食、换水、清理猫砂', duration: 30 },
    { title: '宠物喂食照顾', desc: '定时喂食+陪伴，适合出差期间', duration: 60 },
    { title: '宠物餐饮服务', desc: '包含自制宠物餐食、营养搭配', duration: 60 },
  ],
  grooming: [
    { title: '宠物美容护理', desc: '全套美容服务：洗澡、修剪、清洁耳朵', duration: 60 },
    { title: '宠物洗澡服务', desc: '专业宠物洗澡+吹干+梳毛', duration: 45 },
    { title: '宠物修剪造型', desc: '专业造型修剪，含指甲、毛发修剪', duration: 60 },
  ],
};

export default function CreateServicePage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', category: 'sitting', price: '',
    petId: '', scheduledStart: '', scheduledEnd: '',
    address: '', latitude: '', longitude: '',
    isUrgent: false, extraTip: '', photos: [],
  });

  useEffect(() => {
    api.get('/pets').then(res => setPets(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/services', {
        ...form,
        scheduledStart: form.scheduledStart + ':00+08:00',
        scheduledEnd: form.scheduledEnd + ':00+08:00',
        price: parseFloat(form.price),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        petId: parseInt(form.petId),
        extraTip: form.extraTip ? parseFloat(form.extraTip) : null,
        photos: undefined,
      });
      setCreated(res.data);
      // 推荐匹配的商城接单者
      const prodRes = await api.get('/products?all=true&category=' + form.category).catch(() => ({ data: [] }));
      setRecommended(prodRes.data);
    } catch (err) {
      setError(err.response?.data?.error || '发布失败，请重试');
    }
    setSubmitting(false);
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const readers = files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target.result);
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(results => {
      setForm(prev => ({ ...prev, photos: [...prev.photos, ...results] }));
    });
  };

  const removePhoto = (idx) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };

  const applyTemplate = (tpl) => {
    setForm(prev => ({
      ...prev,
      title: tpl.title,
      description: tpl.desc,
    }));
  };

  const templates = serviceTemplates[form.category] || [];

  if (created) {
    return (
      <div>
        <div className="bg-green-50 border border-green-200 p-6 rounded-2xl mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">✅</span>
            <div>
              <h2 className="text-xl font-bold text-green-900">需求已发布</h2>
              <p className="text-sm text-green-600">等待接单者接单，同时也为您推荐了合适的服务商</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/owner/services" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors inline-block">
              查看我的服务
            </Link>
            <Link to="/marketplace" className="border border-green-300 text-green-600 px-5 py-2 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors inline-block">
              去商城逛逛
            </Link>
            <button onClick={() => setCreated(null)} className="border border-green-300 text-green-600 px-5 py-2 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors">
              继续发布
            </button>
          </div>
        </div>

        {recommended.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-green-900 mb-4">根据您的需求，为您推荐以下接单者</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommended.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden card-hover">
                  <div className="bg-green-600 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{p.category === 'walking' ? '🚶' : p.category === 'feeding' ? '🍽️' : p.category === 'grooming' ? '✂️' : '🤗'}</span>
                      <span className="text-xl font-bold text-white">¥{p.price}</span>
                    </div>
                    <h4 className="font-semibold text-white mt-2">{p.title}</h4>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description || '暂无描述'}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700">
                          {p.sitter?.name?.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-600">{p.sitter?.name}</span>
                      </div>
                      <Link to={'/marketplace?buy=' + p.id}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                        购买
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">发布服务需求</h2>
        <p className="text-sm text-green-600 mt-1">选择服务模板快速填写，或自定义输入</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 sticky top-4">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">快捷模板</h3>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, title: '', description: '' })}
              className="w-full p-2.5 border border-green-200 rounded-xl text-sm mb-3 focus:ring-2 focus:ring-green-400 outline-none">
              <option value="sitting">宠物陪伴</option>
              <option value="walking">遛狗</option>
              <option value="feeding">喂食</option>
              <option value="grooming">美容</option>
            </select>
            <div className="space-y-2">
              {templates.map((tpl, i) => (
                <button key={i} type="button" onClick={() => applyTemplate(tpl)}
                  className={'w-full text-left p-3 rounded-xl border text-sm transition-colors ' + (form.title === tpl.title ? 'border-green-500 bg-green-50' : 'border-green-100 hover:border-green-300')}>
                  <strong className="block text-green-800">{tpl.title}</strong>
                  <span className="text-gray-400 text-xs">{tpl.desc}</span>
                  <span className="text-gray-400 ml-2">{tpl.duration}分钟</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
            {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1 font-medium">标题</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required placeholder="输入标题或从左侧模板选择" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1 font-medium">描述</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" rows="3" placeholder="详细描述您的需求..." />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 font-medium">服务类型</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, title: '', description: '' })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm">
                  <option value="sitting">宠物陪伴</option>
                  <option value="walking">遛狗</option>
                  <option value="feeding">喂食</option>
                  <option value="grooming">美容</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 font-medium">价格 (¥)</label>
                <input type="number" min="0" step="1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 font-medium">选择宠物</label>
                <select value={form.petId} onChange={e => setForm({ ...form, petId: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required>
                  <option value="">选择宠物</option>
                  {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 font-medium">服务地址</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" placeholder="请输入地址" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 font-medium">开始时间</label>
                <input type="datetime-local" value={form.scheduledStart} onChange={e => setForm({ ...form, scheduledStart: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 font-medium">结束时间</label>
                <input type="datetime-local" value={form.scheduledEnd} onChange={e => setForm({ ...form, scheduledEnd: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center gap-4 p-3 bg-yellow-50 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isUrgent} onChange={e => setForm({ ...form, isUrgent: e.target.checked })}
                      className="w-4 h-4" />
                    <span className="text-sm font-medium text-yellow-700">加急服务</span>
                  </label>
                  {form.isUrgent && (
                    <input placeholder="加急费用 (¥)" type="number" min="0" value={form.extraTip}
                      onChange={e => setForm({ ...form, extraTip: e.target.value })}
                      className="w-32 p-2 border border-yellow-300 rounded-xl text-sm" />
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1 font-medium">上传照片</label>
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload}
                  className="w-full p-2 border border-green-200 rounded-xl text-sm" />
                {form.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.photos.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p} className="w-16 h-16 object-cover rounded-lg" />
                        <button type="button" onClick={() => removePhoto(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="submit" disabled={submitting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                {submitting ? '发布中...' : '发布'}
              </button>
              <button type="button" onClick={() => navigate('/marketplace')}
                className="border border-green-300 text-green-600 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors">
                去商城购买
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
