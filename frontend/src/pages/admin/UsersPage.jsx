import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users').then(res => {
      setUsers(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleActive = async (id, active) => {
    try {
      await api.patch('/admin/users/' + id + '/status', { isActive: !active });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !active } : u));
    } catch (err) {
      alert('操作失败');
    }
  };

  if (loading) return <p className="text-center py-8 text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">用户管理</h2>
        <p className="text-gray-400 text-sm mt-1">管理平台所有用户账号</p>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700/50 text-left">
                <th className="p-4 text-gray-300 font-medium">ID</th>
                <th className="p-4 text-gray-300 font-medium">姓名</th>
                <th className="p-4 text-gray-300 font-medium">邮箱</th>
                <th className="p-4 text-gray-300 font-medium">角色</th>
                <th className="p-4 text-gray-300 font-medium">状态</th>
                <th className="p-4 text-gray-300 font-medium">注册时间</th>
                <th className="p-4 text-gray-300 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors">
                  <td className="p-4 text-gray-400">{u.id}</td>
                  <td className="p-4 font-medium text-gray-200">{u.name}</td>
                  <td className="p-4 text-gray-400">{u.email}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {(u.roles || u.role || '').split(',').map(r => (
                        <span key={r} className={'text-xs px-2 py-0.5 rounded-full ' + (
                          r === 'ADMIN' ? 'bg-red-900/50 text-red-400' :
                          r === 'SITTER' ? 'bg-green-900/50 text-green-400' :
                          'bg-blue-900/50 text-blue-400'
                        )}>
                          {r === 'ADMIN' ? '管理员' : r === 'SITTER' ? '接单者' : '宠物主'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={'text-xs px-2 py-0.5 rounded-full ' + (u.isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400')}>
                      {u.isActive ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="p-4">
                    <button onClick={() => toggleActive(u.id, u.isActive)}
                      className={'text-xs px-3 py-1.5 rounded-lg ' + (u.isActive ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50')}>
                      {u.isActive ? '禁用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
