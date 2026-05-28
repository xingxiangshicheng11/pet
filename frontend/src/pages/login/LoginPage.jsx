import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { connectSocket, joinRoom, joinRoleRoom } from '../../services/socket';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', name: '', phone: '',
    roles: [],
  });
  const [error, setError] = useState('');

  const toggleRole = (r) => {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(r) ? prev.roles.filter(x => x !== r) : [...prev.roles, r],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isRegister) {
      if (form.password.length < 6) { setError('密码至少6位'); return; }
      if (form.password !== form.confirmPassword) { setError('两次密码不一致'); return; }
      if (form.phone && !/^1\d{10}$/.test(form.phone)) { setError('手机号格式不正确'); return; }
    }
    try {
      const payload = { email: form.email, password: form.password };
      if (isRegister) {
        payload.name = form.name;
        payload.phone = form.phone;
        payload.roles = form.roles.length > 0 ? form.roles.join(',') : 'OWNER';
      }
      const data = isRegister ? await register(payload) : await login(payload.email, payload.password);
      const token = localStorage.getItem('token');
      connectSocket(token);
      joinRoom(data.user.id);
      joinRoleRoom(data.user.roles);
      navigate('/' + data.user.roles.split(',')[0].toLowerCase());
    } catch (err) {
      setError(err.response?.data?.error || '操作失败');
    }
  };

  return (
    <div className="min-h-screen gradient-green flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🐾</div>
          <h1 className="text-2xl font-bold text-green-800">宠享</h1>
          <p className="text-green-600 text-sm mt-1">宠物上门服务平台</p>
        </div>

        <div className="flex mb-6 bg-green-50 rounded-lg p-1">
          <button onClick={() => setIsRegister(false)}
            className={'flex-1 py-2.5 rounded-md text-sm font-medium transition-all ' + (!isRegister ? 'bg-white text-green-700 shadow-sm' : 'text-green-500 hover:text-green-700')}>登录</button>
          <button onClick={() => setIsRegister(true)}
            className={'flex-1 py-2.5 rounded-md text-sm font-medium transition-all ' + (isRegister ? 'bg-white text-green-700 shadow-sm' : 'text-green-500 hover:text-green-700')}>注册</button>
        </div>

        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-green-700 mb-1 font-medium">邮箱</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none text-sm" required />
          </div>
              <div>
                <label className="block text-sm text-green-700 mb-1 font-medium">密码</label>
                <input type="password" value={form.password} minLength={6}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none text-sm" required />
              </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-sm text-green-700 mb-1 font-medium">确认密码</label>
                <input type="password" value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm text-green-700 mb-1 font-medium">姓名</label>
                <input type="text" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm text-green-700 mb-1 font-medium">手机号</label>
                <input type="text" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" />
              </div>
              <div>
                <p className="text-sm text-green-700 mb-2 font-medium">选择角色（可多选）:</p>
                <div className="flex gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 border border-green-200 rounded-xl cursor-pointer hover:bg-green-50 transition-colors">
                    <input type="checkbox" checked={form.roles.includes('OWNER')}
                      onChange={() => toggleRole('OWNER')} className="accent-green-600" />
                    <span className="text-sm">🐱 宠物主</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 border border-green-200 rounded-xl cursor-pointer hover:bg-green-50 transition-colors">
                    <input type="checkbox" checked={form.roles.includes('SITTER')}
                      onChange={() => toggleRole('SITTER')} className="accent-green-600" />
                    <span className="text-sm">🦮 接单者</span>
                  </label>
                </div>
              </div>
            </>
          )}

          <button type="submit"
            className="w-full gradient-green text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all">
            {isRegister ? '注册' : '登录'}
          </button>
          {!isRegister && (
            <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-green-500 hover:text-green-700 transition-colors">
                忘记密码？
              </Link>
            </div>
          )}
        </form>

        <div className="mt-6 text-center border-t border-green-100 pt-4 space-y-2">
          <Link to="/admin/login" className="block text-sm text-green-500 hover:text-green-700 transition-colors">
            🔐 管理员入口
          </Link>
        </div>
      </div>
    </div>
  );
}
