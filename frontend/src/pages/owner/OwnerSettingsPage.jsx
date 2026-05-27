import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function OwnerSettingsPage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    address: user?.address || '',
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', profileForm);
      await refreshUser();
      alert('保存成功');
    } catch (err) {
      alert(err.response?.data?.error || '保存失败');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">设置中心</h2>
        <p className="text-sm text-green-600 mt-1">管理个人信息与账户安全</p>
      </div>

      <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl border border-green-100 w-fit">
        {[
          { key: 'profile', label: '个人信息' },
          { key: 'account', label: '账号安全' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={'px-4 py-2 text-sm rounded-lg transition-all ' + (tab === t.key ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-green-50')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">昵称</label>
            <input value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full p-3 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">手机号</label>
            <input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="w-full p-3 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">简介</label>
            <textarea value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
              className="w-full p-3 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" rows="3" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">地址</label>
            <input value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
              className="w-full p-3 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" />
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      )}

      {tab === 'account' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">邮箱</p>
              <p className="text-xs text-gray-400">{user?.email || '未设置'}</p>
            </div>
            <span className="text-xs text-green-600">已验证</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">手机号</p>
              <p className="text-xs text-gray-400">{user?.phone || '未绑定'}</p>
            </div>
            <button className="text-xs text-green-600 hover:underline">绑定</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">修改密码</p>
              <p className="text-xs text-gray-400">定期更换密码保障安全</p>
            </div>
            <button className="text-xs text-green-600 hover:underline" onClick={() => navigate('/forgot-password')}>修改</button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <button onClick={handleLogout}
          className="w-full text-left p-3 bg-white border border-red-100 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors">
          退出登录
        </button>
      </div>
    </div>
  );
}
