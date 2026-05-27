import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { connectSocket, joinRoom, joinRoleRoom } from '../../services/socket';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(form.email, form.password);
      const roles = (data.user.roles || '').split(',');
      if (!roles.includes('ADMIN')) {
        setError('该账号不是管理员，请使用用户入口登录');
        return;
      }
      const token = localStorage.getItem('token');
      connectSocket(token);
      joinRoom(data.user.id);
      joinRoleRoom(data.user.roles);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败');
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

        {error && <p className="text-red-400 text-sm mb-4 bg-red-900/30 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1 font-medium">管理员邮箱</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none text-sm" required />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1 font-medium">密码</label>
            <input type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none text-sm" required />
          </div>
          <button type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-500 transition-all">
            管理员登录
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-700 pt-4">
          <Link to="/login" className="text-sm text-green-400 hover:text-green-300 transition-colors">
            ← 返回用户登录
          </Link>
        </div>
      </div>
    </div>
  );
}
