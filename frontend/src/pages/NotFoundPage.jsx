import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-8xl mb-6">🐾</div>
        <h1 className="text-4xl font-bold text-gray-800 mb-3">404</h1>
        <p className="text-gray-500 mb-8">页面不存在或已被移除</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">返回首页</Link>
          <Link to="/login" className="border border-green-300 text-green-600 px-6 py-3 rounded-xl font-medium hover:bg-green-50 transition-colors">登录</Link>
        </div>
      </div>
    </div>
  );
}
