import { useState, useEffect } from 'react';
import api from '../../services/api';

const emergencyTypes = [
  { key: 'injury', label: '宠物受伤', icon: '🩹' },
  { key: 'illness', label: '突发疾病', icon: '🤒' },
  { key: 'escape', label: '宠物走失', icon: '🏃' },
  { key: 'accident', label: '意外事故', icon: '⚠️' },
  { key: 'other', label: '其他紧急', icon: '🆘' },
];

export default function EmergencySOSPage() {
  const [step, setStep] = useState('type');
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ serviceId: '', type: 'injury', description: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const uid = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    api.get('/services?ownerId=' + uid).then(res => {
      setServices(res.data.filter(s => ['ACCEPTED', 'IN_PROGRESS'].includes(s.status)));
    }).catch(() => {});
  }, []);

  const handleSend = async () => {
    setSending(true);
    try {
      await api.post('/owner/emergency', {
        serviceId: form.serviceId ? parseInt(form.serviceId) : null,
        type: form.type,
        description: form.description,
      });
      setSent(true);
    } catch (err) {
      alert(err.response?.data?.error || '发送失败');
    }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <span className="text-6xl block mb-4">✅</span>
        <h2 className="text-xl font-bold text-green-900 mb-2">紧急求助已发送</h2>
        <p className="text-gray-500 mb-6">已通知相关人员和平台管理员，请保持手机畅通</p>
        <button onClick={() => { setStep('type'); setSent(false); setForm({ serviceId: '', type: 'injury', description: '' }); }}
          className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
          <span>🆘</span> 紧急求助
        </h2>
        <p className="text-sm text-gray-500 mt-1">仅用于紧急情况，发送后接单者和平台将立即收到通知</p>
      </div>

      {step === 'type' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
          <h3 className="font-semibold text-gray-800 mb-4">选择紧急类型</h3>
          <div className="grid grid-cols-2 gap-3">
            {emergencyTypes.map(t => (
              <button key={t.key} onClick={() => { setForm({ ...form, type: t.key }); setStep('detail'); }}
                className={'p-4 rounded-xl border-2 text-center transition-all ' + (form.type === t.key ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:border-red-200')}>
                <span className="text-3xl block mb-2">{t.icon}</span>
                <span className="text-sm font-medium text-gray-700">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'detail' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">紧急类型</label>
            <p className="text-lg font-medium text-red-600">{emergencyTypes.find(t => t.key === form.type)?.icon} {emergencyTypes.find(t => t.key === form.type)?.label}</p>
          </div>
          {services.length > 0 && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">关联服务（可选）</label>
              <select value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })}
                className="w-full p-3 border border-green-200 rounded-xl text-sm">
                <option value="">不关联服务</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.title} - {s.sitter?.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">情况描述</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full p-3 border border-green-200 rounded-xl text-sm" rows="4" placeholder="请描述发生了什么紧急情况..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('type')} className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl text-sm font-medium">返回</button>
            <button onClick={handleSend} disabled={sending || !form.description.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-medium">
              {sending ? '发送中...' : '发送紧急求助'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
