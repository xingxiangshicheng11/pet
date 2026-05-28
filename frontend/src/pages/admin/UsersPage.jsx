import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);

  const load = async (p) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p || page, limit: '15' });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get('/admin/users?' + params.toString());
      setUsers(res.data.users);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(1); }, [roleFilter, statusFilter]);

  const handleSearch = (e) => { e.preventDefault(); load(1); };

  const toggleActive = async (id, active) => {
    try {
      await api.patch('/admin/users/' + id + '/status', { isActive: !active });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !active } : u));
      if (selectedUser?.id === id) setSelectedUser({ ...selectedUser, isActive: !active });
    } catch (err) { alert('操作失败'); }
  };

  const viewDetail = async (id) => {
    try {
      const res = await api.get('/admin/users/' + id);
      setUserDetail(res.data);
    } catch { alert('加载失败'); }
  };

  const updateUserRole = async (id, roles) => {
    try {
      await api.put('/admin/users/' + id, { roles });
      load(page);
      if (userDetail?.id === id) setUserDetail({ ...userDetail, roles });
    } catch { alert('更新失败'); }
  };

  if (userDetail) {
    return (
      <div>
        <button onClick={() => setUserDetail(null)} className="text-green-400 hover:text-green-300 text-sm mb-4 flex items-center gap-1">← 返回用户列表</button>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{userDetail.name}</h3>
              <p className="text-gray-400 text-sm">{userDetail.email} · {userDetail.phone || '无电话'}</p>
            </div>
            <div className="flex gap-2">
              <span className={'text-xs px-3 py-1 rounded-full ' + (userDetail.isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400')}>
                {userDetail.isActive ? '正常' : '禁用'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-700/50 p-3 rounded-xl">
              <p className="text-xs text-gray-400">角色</p>
              <div className="flex gap-1 mt-1">
                {userDetail.roles?.split(',').map(r => (
                  <span key={r} className={'text-xs px-2 py-0.5 rounded ' + (r === 'ADMIN' ? 'bg-red-900/50 text-red-400' : r === 'SITTER' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400')}>
                    {r === 'ADMIN' ? '管理员' : r === 'SITTER' ? '接单者' : '宠物主'}
                  </span>
                ))}
              </div>
              <div className="mt-2">
                <select value={userDetail.roles} onChange={e => updateUserRole(userDetail.id, e.target.value)}
                  className="w-full p-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300">
                  <option value="OWNER">宠物主</option>
                  <option value="SITTER">接单者</option>
                  <option value="OWNER,SITTER">宠物主+接单者</option>
                  <option value="ADMIN">管理员</option>
                </select>
              </div>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-xl">
              <p className="text-xs text-gray-400">评分</p>
              <p className="text-lg font-bold text-yellow-400">{userDetail.rating?.toFixed(1) || '0.0'}</p>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-xl">
              <p className="text-xs text-gray-400">钱包</p>
              <p className="text-lg font-bold text-green-400">¥{(userDetail.walletBalance || 0).toFixed(2)}</p>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-xl">
              <p className="text-xs text-gray-400">注册时间</p>
              <p className="text-sm font-medium text-gray-300">{new Date(userDetail.createdAt).toLocaleDateString('zh-CN')}</p>
            </div>
          </div>
          {userDetail.bio && <p className="text-sm text-gray-400 bg-gray-700/30 p-3 rounded-xl">{userDetail.bio}</p>}
        </div>

        {userDetail.pets?.length > 0 && (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 mb-4">
            <h4 className="font-semibold text-gray-200 mb-3">宠物 ({userDetail.pets.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {userDetail.pets.map(p => (
                <div key={p.id} className="bg-gray-700/50 p-3 rounded-xl">
                  <p className="text-sm font-medium text-gray-200">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.species} · {p.breed || '未知'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {userDetail.services?.length > 0 && (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 mb-4">
            <h4 className="font-semibold text-gray-200 mb-3">最近服务 ({userDetail.services.length})</h4>
            <div className="space-y-2">
              {userDetail.services.map(s => (
                <div key={s.id} className="bg-gray-700/50 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-200">{s.title}</p>
                    <p className="text-xs text-gray-400">{s.owner?.name} → {s.sitter?.name} · ¥{s.price}</p>
                  </div>
                  <span className={'text-xs px-2 py-0.5 rounded-full ' + (
                    s.status === 'COMPLETED' ? 'bg-green-900/50 text-green-400' : s.status === 'CANCELLED' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'
                  )}>{s.status}</span>
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
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">用户管理</h2>
          <p className="text-gray-400 text-sm mt-1">管理平台所有用户账号</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 mb-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索姓名/邮箱/手机..."
            className="flex-1 min-w-[200px] p-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500" />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="p-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-gray-300">
            <option value="">全部角色</option>
            <option value="OWNER">宠物主</option>
            <option value="SITTER">接单者</option>
            <option value="ADMIN">管理员</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="p-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-gray-300">
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="disabled">禁用</option>
          </select>
          <button type="submit" className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">搜索</button>
        </form>
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
                <th className="p-4 text-gray-300 font-medium">评分</th>
                <th className="p-4 text-gray-300 font-medium">注册时间</th>
                <th className="p-4 text-gray-300 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-500">加载中...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-500">无用户</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors">
                  <td className="p-4 text-gray-400">{u.id}</td>
                  <td className="p-4 font-medium text-gray-200">
                    <button onClick={() => viewDetail(u.id)} className="hover:text-green-400 transition-colors">{u.name}</button>
                  </td>
                  <td className="p-4 text-gray-400">{u.email}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {(u.roles || '').split(',').map(r => (
                        <span key={r} className={'text-xs px-2 py-0.5 rounded-full ' + (
                          r === 'ADMIN' ? 'bg-red-900/50 text-red-400' : r === 'SITTER' ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'
                        )}>{r === 'ADMIN' ? '管理员' : r === 'SITTER' ? '接单者' : '宠物主'}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={'text-xs px-2 py-0.5 rounded-full ' + (u.isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400')}>
                      {u.isActive ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="p-4 text-yellow-400">{u.rating?.toFixed(1) || '0.0'}</td>
                  <td className="p-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => viewDetail(u.id)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50">详情</button>
                      <button onClick={() => toggleActive(u.id, u.isActive)}
                        className={'text-xs px-3 py-1.5 rounded-lg ' + (u.isActive ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50')}>
                        {u.isActive ? '禁用' : '启用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-700 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => load(p)}
                className={'px-3 py-1.5 rounded-lg text-sm ' + (p === page ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
