import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    api.get('/admin/config').then(res => {
      setConfigs(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async (key) => {
    try {
      await api.put('/admin/config/' + key, { value: editValue, description: editing?.description });
      setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: editValue } : c));
      setEditing(null);
    } catch (err) { alert('保存失败'); }
  };

  const addNew = () => {
    const key = prompt('请输入配置键名：');
    if (!key) return;
    const value = prompt('请输入配置值：');
    if (value === null) return;
    const desc = prompt('请输入配置描述（可选）：');
    api.put('/admin/config/' + key, { value, description: desc || '' }).then(res => {
      setConfigs(prev => [...prev, res.data]);
    }).catch(() => alert('添加失败'));
  };

  if (loading) return <p className="text-center py-8 text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">平台配置</h2>
          <p className="text-gray-400 text-sm mt-1">管理系统运行参数</p>
        </div>
        <button onClick={addNew} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">+ 添加配置</button>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-700/50 text-left">
              <th className="p-4 text-gray-300 font-medium">配置键</th>
              <th className="p-4 text-gray-300 font-medium">配置值</th>
              <th className="p-4 text-gray-300 font-medium">描述</th>
              <th className="p-4 text-gray-300 font-medium">更新时间</th>
              <th className="p-4 text-gray-300 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {configs.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">暂无配置</td></tr>
            ) : configs.map(c => (
              <tr key={c.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                <td className="p-4 text-gray-200 font-mono text-xs">{c.key}</td>
                <td className="p-4">
                  {editing?.id === c.id ? (
                    <div className="flex gap-2">
                      <input value={editValue} onChange={e => setEditValue(e.target.value)}
                        className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200" />
                      <button onClick={() => save(c.key)} className="text-xs text-green-400 hover:underline">保存</button>
                      <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:underline">取消</button>
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs">{c.value}</span>
                  )}
                </td>
                <td className="p-4 text-gray-500 text-xs">{c.description || '-'}</td>
                <td className="p-4 text-gray-500 text-xs">{c.updatedAt ? new Date(c.updatedAt).toLocaleString('zh-CN') : '-'}</td>
                <td className="p-4">
                  <button onClick={() => { setEditing(c); setEditValue(c.value); }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50">编辑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
