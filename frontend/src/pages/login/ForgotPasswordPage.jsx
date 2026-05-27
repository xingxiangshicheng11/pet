import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setResetToken(res.data.resetToken);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || '发送失败');
    }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, token: resetToken, password });
      alert('密码重置成功，请登录');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || '重置失败');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-green flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-green-800">找回密码</h1>
        </div>

        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl">{error}</p>}

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm text-green-700 mb-1 font-medium">注册邮箱</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
              {loading ? '发送中...' : '发送重置验证码'}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-green-500 hover:text-green-700">← 返回登录</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="bg-green-50 p-4 rounded-xl text-sm text-green-700 mb-2">
              验证码已发送至 <strong>{email}</strong>
              {resetToken && <p className="mt-2 text-xs text-green-500 break-all">(演示模式) 验证码: {resetToken}</p>}
            </div>
            <div>
              <label className="block text-sm text-green-700 mb-1 font-medium">新密码</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
            </div>
            <div>
              <label className="block text-sm text-green-700 mb-1 font-medium">确认密码</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full p-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors">
              {loading ? '重置中...' : '重置密码'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
