import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function SitterSettingsPage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState('general');
  const [receiveEnabled, setReceiveEnabled] = useState(user?.receiveEnabled !== false);
  const [saving, setSaving] = useState(false);

  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const saveSetting = async (key, val) => {
    try {
      await api.put('/auth/profile', { [key]: val });
      await refreshUser();
    } catch {}
  };

  const toggleReceive = async () => {
    try {
      await api.put('/sitter/receive-toggle', { receiveEnabled: !receiveEnabled });
      setReceiveEnabled(!receiveEnabled);
    } catch {}
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (pwdForm.newPassword.length < 8) { setPwdError('密码至少需要 8 个字符'); return; }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { setPwdError('两次密码不一致'); return; }
    setPwdSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      });
      alert('密码修改成功');
      setShowChangePwd(false);
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwdError(err.response?.data?.error || '修改失败');
    }
    setPwdSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">设置中心</h2>
        <p className="text-sm text-green-600 mt-1">管理接单偏好与账户安全</p>
      </div>

      <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl border border-green-100 w-fit">
        {[
          { key: 'general', label: '接单设置' },
          { key: 'account', label: '账号安全' },
          { key: 'blacklist', label: '黑名单' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={'px-4 py-2 text-sm rounded-lg transition-all ' + (tab === t.key ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-green-50')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">接单开关</p>
              <p className="text-xs text-gray-400">关闭后将不再推送新订单</p>
            </div>
            <button onClick={toggleReceive}
              className={'relative inline-flex h-7 w-12 items-center rounded-full transition-colors ' + (receiveEnabled ? 'bg-green-500' : 'bg-gray-300')}>
              <span className={'inline-block h-5 w-5 transform rounded-full bg-white transition-transform ' + (receiveEnabled ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1 font-medium">接单距离范围 (km)</label>
            <input type="number" defaultValue={user?.maxDistance || 20}
              onBlur={e => saveSetting('maxDistance', +e.target.value)}
              className="w-full p-2.5 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" />
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" defaultChecked={user?.acceptUrgent !== false}
              onChange={e => saveSetting('acceptUrgent', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-gray-600">接收加急订单</span>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" defaultChecked={user?.acceptNight || false}
              onChange={e => saveSetting('acceptNight', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-gray-600">接收夜间订单（22:00-06:00）</span>
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">手机号</p>
              <p className="text-xs text-gray-400">{user?.phone || '未绑定'}</p>
            </div>
            <button className="text-xs text-green-600 hover:underline">绑定</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">邮箱</p>
              <p className="text-xs text-gray-400">{user?.email || '未设置'}</p>
            </div>
            <span className="text-xs text-green-600">已验证</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">实名认证</p>
              <p className="text-xs text-gray-400">未认证</p>
            </div>
            <button className="text-xs text-green-600 hover:underline">去认证</button>
          </div>

          {!showChangePwd ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-700">修改密码</p>
                <p className="text-xs text-gray-400">需验证旧密码，定期更换保障安全</p>
              </div>
              <button className="text-xs text-green-600 hover:underline" onClick={() => setShowChangePwd(true)}>修改</button>
            </div>
          ) : (
            <form onSubmit={handleChangePwd} className="p-4 bg-gray-50 rounded-xl space-y-3 border border-green-100">
              <p className="text-sm font-medium text-gray-700">修改密码</p>
              {pwdError && <p className="text-red-500 text-xs bg-red-50 p-2 rounded">{pwdError}</p>}
              <input type="password" placeholder="当前密码" required
                value={pwdForm.oldPassword} onChange={e => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                className="w-full p-2.5 border border-green-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400" />
              <input type="password" placeholder="新密码 (至少8位，含大小写字母、数字、特殊字符)" required
                value={pwdForm.newPassword} onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                className="w-full p-2.5 border border-green-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400" />
              <input type="password" placeholder="确认新密码" required
                value={pwdForm.confirmPassword} onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                className="w-full p-2.5 border border-green-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400" />
              <div className="flex gap-2">
                <button type="submit" disabled={pwdSaving}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  {pwdSaving ? '修改中...' : '确认修改'}
                </button>
                <button type="button" onClick={() => { setShowChangePwd(false); setPwdError(''); setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}
                  className="text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg text-sm">取消</button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === 'blacklist' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
          <p className="text-sm text-gray-400 text-center py-8">暂无拉黑的用户</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button onClick={() => navigate('/sitter/profile')}
          className="w-full text-left p-3 bg-white border border-green-100 rounded-xl text-sm text-gray-600 hover:bg-green-50 transition-colors">
          服务规则与平台协议
        </button>
        <button onClick={() => navigate('/sitter/profile')}
          className="w-full text-left p-3 bg-white border border-green-100 rounded-xl text-sm text-gray-600 hover:bg-green-50 transition-colors">
          帮助中心
        </button>
        <button onClick={handleLogout}
          className="w-full text-left p-3 bg-white border border-red-100 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors">
          退出登录
        </button>
      </div>
    </div>
  );
}
