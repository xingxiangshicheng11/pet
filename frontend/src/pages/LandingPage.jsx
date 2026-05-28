import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <header className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🐾</span>
          <span className="text-xl font-bold text-green-800">宠享</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-green-600 hover:text-green-700 px-4 py-2 rounded-xl text-sm font-medium">登录</Link>
          <Link to="/login" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-sm">免费注册</Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">宠物上门服务，<span className="text-green-600">安心又省心</span></h1>
        <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
          宠享连接宠物主与专业接单者，提供陪伴、遛狗、喂食、美容等一站式上门服务
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/login?register=1" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3.5 rounded-xl font-medium shadow-lg shadow-green-200 text-lg transition-all">
            立即开始
          </Link>
          <Link to="/login" className="border border-green-300 text-green-600 px-8 py-3.5 rounded-xl font-medium hover:bg-green-50 transition-all text-lg">
            了解更多
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-12">我们的服务</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: '🤗', title: '宠物陪伴', desc: '上门陪伴宠物，喂食、玩耍、清理，让宠物不孤单' },
            { icon: '🚶', title: '专业遛狗', desc: '专业遛狗师，确保狗狗充足运动' },
            { icon: '🍽️', title: '上门喂食', desc: '定时喂食+陪伴，出差期间无忧' },
            { icon: '✂️', title: '美容护理', desc: '全套美容：洗澡、修剪、清洁耳朵' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 text-center card-hover">
              <span className="text-4xl block mb-3">{s.icon}</span>
              <h3 className="font-semibold text-gray-800 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-green-600 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">加入宠享，开启宠物服务之旅</h2>
          <p className="text-green-100 mb-8">无论是寻找专业服务，还是发挥您的宠物照看技能</p>
          <Link to="/login" className="bg-white text-green-700 px-8 py-3 rounded-xl font-medium shadow-lg inline-block hover:bg-green-50 transition-all">
            免费注册
          </Link>
        </div>
      </section>

      <footer className="bg-gray-50 py-8 text-center text-sm text-gray-400">
        <p>© 2026 宠享 · 宠物上门服务平台</p>
      </footer>
    </div>
  );
}
