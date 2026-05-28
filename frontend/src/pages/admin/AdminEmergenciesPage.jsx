import { useState, useEffect } from 'react';
import api from '../../services/api';

const typeLabels = { injury: '宠物受伤', illness: '突发疾病', escape: '宠物走失', accident: '意外事故', other: '其他紧急' };
const typeIcons = { injury: '🩹', illness: '🤒', escape: '🏃', accident: '⚠️', other: '🆘' };

export default function AdminEmergenciesPage() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? '?status=' + filter : '';
    api.get('/admin/emergencies' + params).then(res => {
      setEmergencies(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  const handle = async (id, status, note) => {
    try {
      await api.patch('/admin/emergencies/' + id, { status, handlingNote: note || '已处理' });
      setEmergencies(prev => prev.map(e => e.id === id ? { ...e, status, handlingNote: note || '已处理' } : e));
    } catch (err) { alert('操作失败'); }
  };

  const resolve = (id) => {
    const note = prompt('处理备注（可选）：');
    handle(id, 'RESOLVED', note || undefined);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">紧急告警</h2>
        <p className="text-gray-400 text-sm mt-1">处理平台紧急事件</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'PENDING', 'RESOLVED', 'DISMISSED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium ' + (filter === s ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300')}>
            {s ? (s === 'PENDING' ? '待处理' : s === 'RESOLVED' ? '已解决' : '已忽略') : '全部'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center py-8 text-gray-400">加载中...</p> : emergencies.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700">
          <span className="text-6xl block mb-4">🆘</span>
          <p className="text-gray-400">暂无告警</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emergencies.map(e => (
            <div key={e.id} className={'bg-gray-800 p-5 rounded-2xl border ' + (e.status === 'PENDING' ? 'border-red-700/50' : 'border-gray-700')}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{typeIcons[e.type] || '🆘'}</span>
                  <div>
                    <p className="font-semibold text-gray-200">{typeLabels[e.type] || e.type}</p>
                    <p className="text-sm text-gray-400">{e.user?.name} ({e.user?.phone})</p>
                  </div>
                </div>
                <span className={'text-xs px-3 py-1 rounded-full ' + (
                  e.status === 'PENDING' ? 'bg-red-900/50 text-red-400' :
                  e.status === 'RESOLVED' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'
                )}>
                  {e.status === 'PENDING' ? '待处理' : e.status === 'RESOLVED' ? '已解决' : '已忽略'}
                </span>
              </div>
              {e.description && <p className="text-sm text-gray-400 bg-gray-700/30 p-3 rounded-xl mb-3">{e.description}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{new Date(e.createdAt).toLocaleString('zh-CN')}</span>
                {e.service && <span>关联服务: {e.service.title}</span>}
              </div>
              {e.handler && <p className="text-xs text-gray-500 mt-2">处理人: {e.handler.name} · {e.handledAt ? new Date(e.handledAt).toLocaleString('zh-CN') : ''}</p>}
              {e.handlingNote && <p className="text-xs text-gray-400 mt-1">处理备注: {e.handlingNote}</p>}
              {e.status === 'PENDING' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => resolve(e.id)} className="px-4 py-2 bg-green-600/50 text-green-300 rounded-xl text-sm hover:bg-green-600/70">标记已处理</button>
                  <button onClick={() => handle(e.id, 'DISMISSED', '已忽略')} className="px-4 py-2 bg-gray-600/50 text-gray-300 rounded-xl text-sm hover:bg-gray-600/70">忽略</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
