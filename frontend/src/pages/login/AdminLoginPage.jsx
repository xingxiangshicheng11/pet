import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { connectSocket, joinRoom, joinRoleRoom } from '../../services/socket';

export default function AdminLoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', name: '', phone: '', adminCode: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (form.password.length < 6) { setError('密码至少6位'); return; }
      if (form.password !== form.confirmPassword) { setError('两次密码不一致'); return; }
      if (!form.adminCode.trim()) { setError('请输入管理员注册码'); return; }
    }

    try {
      let data;
      if (isRegister) {
        data = await register({
          email: form.email, password: form.password,
          name: form.name, phone: form.phone,
          roles: 'ADMIN', adminCode: form.adminCode,
        });
      } else {
        data = await login(form.email, form.password);
        const roles = (data.user.roles || '').split(',');
        if (!roles.includes('ADMIN')) {
          setError('该账号不是管理员，请使用用户入口登录');
          return;
        }
      }
      const token = localStorage.getItem('token');
      connectSocket(token);
      joinRoom(data.user.id);
      joinRoleRoom(data.user.roles);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || '操作失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚙️</div>
          <h1 className="text-2xl font-bold text-white">管理后台</h1>
          <p className="text-gray-400 text-sm mt-1">宠物服务平台 · 管理员专用</p>
        </div>

        <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
          <button onClick={() => { setIsRegister(false); setError(''); }}
            className={'flex-1 py-2.5 rounded-md text-sm font-medium transition-all ' + (!isRegister ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-white')}>登录</button>
          <button onClick={() => { setIsRegister(true); setError(''); }}
            className={'flex-1 py-2.5 rounded-md text-sm font-medium transition-all ' + (isRegister ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-white')}>注册</button>
        </div>

        {error && <p className="text-red-400 text-sm mb-4 bg-red-900/30 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1 font-medium">邮箱</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none text-sm" required />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1 font-medium">密码</label>
            <input type="password" value={form.password} minLength={6}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none text-sm" required />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-sm text-gray-300 mb-1 font-medium">确认密码</label>
                <input type="password" value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1 font-medium">姓名</label>
                <input type="text" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none text-sm" required />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1 font-medium">手机号</label>
                <input type="text" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1 font-medium">
                  管理员注册码 <span className="text-red-400">*</span>
                </label>
                <input type="text" value={form.adminCode}
                  onChange={e => setForm({ ...form, adminCode: e.target.value })}
                  placeholder="请输入管理员注册码"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none text-sm" required />
              </div>
            </>
          )}

          <button type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-500 transition-all">
            {isRegister ? '管理员注册' : '管理员登录'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-700 pt-4 space-y-2">
          <Link to="/login" className="block text-sm text-green-400 hover:text-green-300 transition-colors">
            ← 返回用户登录
          </Link>
          {isRegister && (
            <p className="text-xs text-gray-500">提示：注册码请联系系统管理员获取</p>
          )}
        </div>
      </div>
    </div>
  );
}
