import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function SitterProfile({ userId, showBack }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/profile/' + userId).then(res => {
      setProfile(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="text-center py-8"><div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" /></div>;
  if (!profile) return <p className="text-gray-400 text-center py-4">用户信息未找到</p>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
      {showBack && (
        <button onClick={() => navigate(-1)} className="text-green-600 hover:text-green-700 text-sm mb-4 flex items-center gap-1">← 返回</button>
      )}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl font-bold text-green-700">
          {profile.name?.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-800">{profile.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{'⭐'.repeat(Math.round(profile.rating || 0)) || '暂无评分'}</span>
            <span>· {profile.reviews?.length || 0} 条评价</span>
          </div>
        </div>
      </div>

      {profile.bio && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">个人简介</p>
          <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-xl">{profile.bio}</p>
        </div>
      )}

      {profile.experience && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">工作经验</p>
          <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-xl">{profile.experience}</p>
        </div>
      )}

      {profile.skills && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">专业技能</p>
          <div className="flex flex-wrap gap-2">
            {profile.skills.split(',').map((s, i) => (
              <span key={i} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">{s.trim()}</span>
            ))}
          </div>
        </div>
      )}

      {profile.reviews?.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium">用户评价</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {profile.reviews.map(r => (
              <div key={r.id} className="bg-gray-50 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-gray-700">{r.reviewer.name}</span>
                  <span className="text-yellow-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                {r.comment && <p className="text-xs text-gray-500 mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
