import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminNotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', targetRole: '' });
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/notifications').then(res => {
      setNotifs(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/admin/notifications', form);
      setNotifs(prev => [res.data, ...prev]);
      setForm({ title: '', content: '', targetRole: '' });
      alert('发送成功');
    } catch (err) { alert(err.response?.data?.error || '发送失败'); }
    setSending(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">发送通知</h2>
          <p className="text-gray-400 text-sm mt-1">向用户发送系统通知</p>
        </div>

        <form onSubmit={send} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1 font-medium">通知标题</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-green-500" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1 font-medium">通知内容</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-green-500" rows="4" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1 font-medium">发送目标</label>
            <select value={form.targetRole} onChange={e => setForm({ ...form, targetRole: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-gray-200">
              <option value="">全部用户</option>
              <option value="OWNER">仅宠物主</option>
              <option value="SITTER">仅接单者</option>
            </select>
          </div>
          <button type="submit" disabled={sending}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-medium">
            {sending ? '发送中...' : '发送通知'}
          </button>
        </form>
      </div>

      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">发送历史</h2>
          <p className="text-gray-400 text-sm mt-1">最近50条通知记录</p>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {loading ? <p className="text-gray-400 text-sm text-center py-8">加载中...</p> : notifs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">暂无发送记录</p>
          ) : notifs.map(n => (
            <div key={n.id} className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-200">{n.title}</span>
                <span className="text-xs text-gray-500">{n.targetRole ? (n.targetRole === 'OWNER' ? '仅宠物主' : '仅接单者') : '全部用户'}</span>
              </div>
              {n.content && <p className="text-xs text-gray-400">{n.content}</p>}
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                <span>发送人: {n.sender?.name}</span>
                <span>{new Date(n.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
