import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const defaultTags = ['上门喂猫', '遛狗', '洗护', '寄养', '驱虫', '剪毛', '生病陪护'];
const petTypeOptions = ['猫', '狗', '异宠', '全部'];

export default function SitterProfilePage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({
    name: '', phone: '', gender: '', age: '', address: '', serviceArea: '',
    bio: '', experience: '', skills: '', serviceTags: '',
    holidayPrice: '{}', distancePrice: '{}', certificates: '[]',
    avatar: '', maxDistance: 20, acceptUrgent: true, acceptNight: false,
  });
  const [reviews, setReviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const uid = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        gender: user.gender || '',
        age: user.age || '',
        address: user.address || '',
        serviceArea: user.serviceArea || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
        experience: user.experience || '',
        skills: user.skills || '',
        serviceTags: user.serviceTags || '',
        holidayPrice: JSON.stringify(user.holidayPrice || {}),
        distancePrice: JSON.stringify(user.distancePrice || {}),
        certificates: JSON.stringify(user.certificates || []),
        maxDistance: user.maxDistance || 20,
        acceptUrgent: user.acceptUrgent !== false,
        acceptNight: user.acceptNight || false,
      });
    }
    api.get('/auth/profile/' + uid).then(res => {
      setReviews(res.data.reviews || []);
    }).catch(() => {});
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let data = { ...form, age: form.age ? parseInt(form.age) : null };
      try { data.holidayPrice = JSON.parse(data.holidayPrice); } catch { data.holidayPrice = {}; }
      try { data.distancePrice = JSON.parse(data.distancePrice); } catch { data.distancePrice = {}; }
      try { data.certificates = JSON.parse(data.certificates); } catch { data.certificates = []; }
      await api.put('/auth/profile', data);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('保存失败: ' + (err.response?.data?.error || err.message));
    }
    setSaving(false);
  };

  const tagList = form.serviceTags ? form.serviceTags.split(',').map(t => t.trim()).filter(Boolean) : [];

  const toggleTag = (tag) => {
    const list = [...tagList];
    const idx = list.indexOf(tag);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(tag);
    setForm({ ...form, serviceTags: list.join(',') });
  };

  const addCert = () => {
    const certs = JSON.parse(form.certificates || '[]');
    certs.push({ type: '', url: '', verified: false });
    setForm({ ...form, certificates: JSON.stringify(certs) });
  };

  const updateCert = (i, field, val) => {
    const certs = JSON.parse(form.certificates || '[]');
    certs[i][field] = val;
    setForm({ ...form, certificates: JSON.stringify(certs) });
  };

  const removeCert = (i) => {
    const certs = JSON.parse(form.certificates || '[]');
    certs.splice(i, 1);
    setForm({ ...form, certificates: JSON.stringify(certs) });
  };

  const reviewAvg = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const goodCount = reviews.filter(r => r.rating >= 4).length;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">个人资料 & 资质认证</h2>
        <p className="text-sm text-green-600 mt-1">完善信息让宠物主更信任您</p>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl border border-green-100 w-fit">
        {[
          { key: 'info', label: '基本信息' },
          { key: 'tags', label: '服务标签' },
          { key: 'price', label: '价格体系' },
          { key: 'certs', label: '资质证书' },
          { key: 'reviews', label: '评价数据' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={'px-4 py-2 text-sm rounded-lg transition-all ' + (tab === t.key ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-green-50')}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
        {tab === 'info' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="relative">
                {form.avatar ? (
                  <img src={form.avatar} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-green-200"
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                ) : null}
                <div className={'w-20 h-20 bg-green-100 rounded-full items-center justify-center text-3xl font-bold text-green-700 ' + (form.avatar ? 'hidden' : 'flex')}>
                  {form.name?.charAt(0) || '?'}
                </div>
                <label className="absolute bottom-0 right-0 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs cursor-pointer hover:bg-green-700 transition-colors">
                  📷
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => setForm({ ...form, avatar: ev.target.result });
                      reader.readAsDataURL(file);
                    }} />
                </label>
              </div>
              <div>
                <p className="font-medium text-gray-700 text-lg">{form.name || '未设置姓名'}</p>
                <p className="text-xs text-gray-400">综合评分: {'⭐'.repeat(Math.round(+reviewAvg))} {reviewAvg}</p>
                <p className="text-xs text-gray-400">{reviews.length} 条评价 · {goodCount} 好评</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: '姓名', key: 'name', type: 'text' },
                { label: '手机号', key: 'phone', type: 'text' },
                { label: '性别', key: 'gender', type: 'select', options: [{v:'',l:'请选择'},{v:'男',l:'男'},{v:'女',l:'女'}] },
                { label: '年龄', key: 'age', type: 'number' },
                { label: '地址', key: 'address', type: 'text' },
                { label: '服务区域', key: 'serviceArea', type: 'text', placeholder:'如：北京市朝阳区' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-600 mb-1 font-medium">{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full p-2.5 border border-green-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none">
                      {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} value={form[f.key]} placeholder={f.placeholder}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full p-2.5 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" />
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">个人简介</label>
              <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" rows="2"
                placeholder="介绍一下自己..." />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">工作经验</label>
              <textarea value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" rows="2"
                placeholder="描述相关经验" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">专业技能</label>
              <input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })}
                className="w-full p-2.5 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
                placeholder="如：宠物美容、专业训练（逗号分隔）" />
            </div>

            <h4 className="font-medium text-green-800 pt-2">接单偏好</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">最大接单距离 (km)</label>
                <input type="number" value={form.maxDistance} onChange={e => setForm({ ...form, maxDistance: +e.target.value })}
                  className="w-full p-2.5 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="acceptUrgent" checked={form.acceptUrgent}
                  onChange={e => setForm({ ...form, acceptUrgent: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="acceptUrgent" className="text-sm text-gray-600">接加急单</label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="acceptNight" checked={form.acceptNight}
                  onChange={e => setForm({ ...form, acceptNight: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="acceptNight" className="text-sm text-gray-600">接夜间单</label>
              </div>
            </div>
          </div>
        )}

        {tab === 'tags' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">选择您擅长的服务项目，点击切换选中状态</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {defaultTags.map(t => (
                <button key={t} onClick={() => toggleTag(t)}
                  className={'px-4 py-2 rounded-xl text-sm transition-all ' + (tagList.includes(t) ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-green-50')}>
                  {t}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">自定义标签（逗号分隔）</label>
              <input value={form.serviceTags} onChange={e => setForm({ ...form, serviceTags: e.target.value })}
                className="w-full p-2.5 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
                placeholder="上门喂猫,遛狗,洗护" />
            </div>
          </div>
        )}

        {tab === 'price' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">节假日加价 (JSON)</label>
              <textarea value={form.holidayPrice} onChange={e => setForm({ ...form, holidayPrice: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-green-400 outline-none" rows="2"
                placeholder='{"holidayMultiplier": 1.5, "weekendMultiplier": 1.2}' />
              <p className="text-xs text-gray-400 mt-1">节假日倍数、周末倍数，如 1.5 表示加价50%</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">距离加价 (JSON)</label>
              <textarea value={form.distancePrice} onChange={e => setForm({ ...form, distancePrice: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-green-400 outline-none" rows="2"
                placeholder='{"perKm": 2, "freeKm": 5, "maxKm": 20}' />
              <p className="text-xs text-gray-400 mt-1">每公里加价、免费公里数、最远距离</p>
            </div>
          </div>
        )}

        {tab === 'certs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">资质证明、身份证、宠物护理证等</p>
              <button onClick={addCert} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">+ 添加资质</button>
            </div>
            {JSON.parse(form.certificates || '[]').length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">暂无资质，点击添加</p>
            ) : (
              <div className="space-y-3">
                {JSON.parse(form.certificates || '[]').map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <select value={c.type} onChange={e => updateCert(i, 'type', e.target.value)}
                      className="p-2 border border-green-200 rounded-lg text-sm bg-white outline-none">
                      <option value="">选择类型</option>
                      <option value="id">身份证</option>
                      <option value="cert">宠物护理证</option>
                      <option value="vaccine">疫苗证明</option>
                      <option value="case">服务案例</option>
                      <option value="photo">实拍作品</option>
                    </select>
                    <input value={c.url} onChange={e => updateCert(i, 'url', e.target.value)}
                      placeholder="图片URL" className="flex-1 p-2 border border-green-200 rounded-lg text-sm outline-none" />
                    <span className={'text-xs px-2 py-1 rounded ' + (c.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                      {c.verified ? '已认证' : '未认证'}
                    </span>
                    <button onClick={() => removeCert(i)} className="text-red-500 hover:text-red-700 text-sm">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'reviews' && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-green-50 rounded-xl">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{reviewAvg}</p>
                <p className="text-xs text-gray-500">综合评分</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{goodCount}</p>
                <p className="text-xs text-gray-500">好评数</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{reviews.length}</p>
                <p className="text-xs text-gray-500">服务次数</p>
              </div>
            </div>
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">暂无评价</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {reviews.map(r => (
                  <div key={r.id} className="p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{r.reviewer?.name}</span>
                      <span className="text-yellow-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && <p className="text-sm text-gray-500">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            {saving ? '保存中...' : saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
