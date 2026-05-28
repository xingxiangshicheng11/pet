import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import socket from '../../services/socket';
import ChatBox from '../../components/ChatBox';
import ServiceMap from '../../components/ServiceMap';

const categoryLabels = { sitting: '宠物陪伴', walking: '遛狗', feeding: '喂食', grooming: '美容', training: '训练' };
const petTypeLabels = { dog: '狗', cat: '猫', other: '其他' };
const tabs = [
  { key: 'pending', label: '待接单', icon: '🆕' },
  { key: 'waiting', label: '待服务', icon: '⏳' },
  { key: 'active', label: '进行中', icon: '🔧' },
  { key: 'completed', label: '已完成', icon: '✅' },
  { key: 'cancelled', label: '已取消', icon: '❌' },
];

const statusMap = {
  pending: 'OPEN',
  waiting: 'ACCEPTED',
  active: 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

export default function SitterOrdersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [emergencyForm, setEmergencyForm] = useState({ type: 'accident', description: '' });
  const [loading, setLoading] = useState(true);

  const uid = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    api.get('/services?all=true').then(res => {
      setServices(res.data.filter(s => s.sitter?.id === uid || (s.status === 'OPEN')));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    socket.on('service:status', (svc) => {
      setServices(prev => prev.map(s => s.id === svc.id ? svc : s));
      if (selected?.id === svc.id) setSelected(svc);
    });
    return () => socket.off('service:status');
  }, [selected]);

  const filtered = services.filter(s => s.status === statusMap[tab]);

  const updateStatus = async (id, status) => {
    try {
      const res = await api.patch('/services/' + id + '/status', { status });
      setServices(prev => prev.map(s => s.id === id ? res.data : s));
      setSelected(res.data);
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const cancelOrder = async (id) => {
    if (!confirm('确认取消此订单？')) return;
    try {
      const res = await api.patch('/services/' + id + '/status', { status: 'CANCELLED' });
      setServices(prev => prev.map(s => s.id === id ? res.data : s));
      setSelected(res.data);
    } catch (err) {
      alert(err.response?.data?.error || '取消失败');
    }
  };

  const submitEmergency = async () => {
    if (!emergencyForm.description) { alert('请描述异常情况'); return; }
    try {
      await api.post('/sitter/emergency', { serviceId: selected.id, ...emergencyForm });
      alert('异常已上报，平台客服将尽快处理');
      setEmergencyForm({ type: 'accident', description: '' });
    } catch (err) {
      alert(err.response?.data?.error || '上报失败');
    }
  };

  // 详情视图
  if (selected) {
    const s = selected;
    const isPending = s.status === 'OPEN';
    const isWaiting = s.status === 'ACCEPTED';
    const isActive = s.status === 'IN_PROGRESS' || s.status === 'WAITING_PAYMENT';
    const isDone = s.status === 'COMPLETED';
    const isCancelled = s.status === 'CANCELLED';

    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-green-600 hover:text-green-700 text-sm mb-4 flex items-center gap-1">← 返回列表</button>

        <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden mb-4">
          <div className={'p-4 ' + (isPending ? 'bg-blue-50' : isWaiting ? 'bg-yellow-50' : isActive ? 'bg-purple-50' : isDone ? 'bg-green-50' : 'bg-red-50')}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{s.title}</h3>
              <span className={'text-xs px-3 py-1 rounded-full ' + (
                s.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                s.status === 'ACCEPTED' ? 'bg-yellow-100 text-yellow-700' :
                s.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' :
                s.status === 'WAITING_PAYMENT' ? 'bg-orange-100 text-orange-700' :
                s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>{s.status === 'WAITING_PAYMENT' ? '待付款' : categoryLabels[s.category] || s.status}</span>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* 宠物信息 */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-xs text-gray-400">宠物</p>
                <p className="text-sm font-medium text-gray-700">{s.pet?.name} ({petTypeLabels[s.pet?.species] || s.pet?.species})</p>
                {s.pet?.breed && <p className="text-xs text-gray-400">品种: {s.pet.breed}</p>}
                {s.pet?.age && <p className="text-xs text-gray-400">年龄: {s.pet.age}岁</p>}
                {s.pet?.weight && <p className="text-xs text-gray-400">体重: {s.pet.weight}kg</p>}
                {s.pet?.notes && <p className="text-xs text-gray-500 mt-1">备注: {s.pet.notes}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400">服务信息</p>
                <p className="text-sm text-gray-700">价格: ¥{s.price}{s.extraTip ? ` + 小费¥${s.extraTip}` : ''}</p>
                <p className="text-xs text-gray-400">{s.isUrgent ? '🚨 加急单' : ''} {s.sitter ? '' : '· 待接单'}</p>
                <p className="text-xs text-gray-400">{new Date(s.scheduledStart).toLocaleString('zh-CN')} ~ {new Date(s.scheduledEnd).toLocaleString('zh-CN')}</p>
                {s.address && <p className="text-xs text-gray-400">📍 {s.address}</p>}
              </div>
            </div>

            {s.description && (
              <div>
                <p className="text-xs text-gray-400 mb-1">需求描述</p>
                <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-xl">{s.description}</p>
              </div>
            )}

            {/* 宠物主信息 */}
            {s.owner && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-700">
                  {s.owner.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{s.owner.name}</p>
                  <p className="text-xs text-gray-400">宠物主 {s.owner.phone ? '· ' + s.owner.phone : ''}</p>
                </div>
                {s.owner.phone && <a href={'tel:' + s.owner.phone} className="ml-auto text-green-600 text-sm">📞 联系</a>}
              </div>
            )}

            {/* 地图 */}
            {s.latitude && <ServiceMap latitude={s.latitude} longitude={s.longitude} address={s.address} className="w-full h-40 rounded-xl border" />}

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-2">
              {isPending && (
                <>
                  <button onClick={() => updateStatus(s.id, 'ACCEPTED')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm">接单</button>
                  <button onClick={() => cancelOrder(s.id)}
                    className="border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm hover:bg-red-50">拒绝</button>
                </>
              )}
              {isWaiting && (
                <button onClick={() => updateStatus(s.id, 'IN_PROGRESS')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm">开始服务</button>
              )}
              {isActive && s.status === 'IN_PROGRESS' && (
                <>
                  <button onClick={() => updateStatus(s.id, 'WAITING_PAYMENT')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm">完成服务</button>
                  <button onClick={() => cancelOrder(s.id)}
                    className="border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm hover:bg-red-50">取消订单</button>
                </>
              )}
              {isActive && s.status === 'WAITING_PAYMENT' && (
                <p className="text-sm text-orange-600">等待宠物主付款完成</p>
              )}
              {isDone && (
                <p className="text-sm text-green-600">服务已完成</p>
              )}
              <button onClick={() => setSelected(null)}
                className="border border-green-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-green-50">返回列表</button>
            </div>

            {/* 聊天 */}
            {!isPending && s.owner && (
              <div className="border-t pt-4">
                <ChatBox orderId={s.id} currentUserId={uid} otherUser={s.owner} />
              </div>
            )}

            {/* 进行中: 签到打卡 + 服务记录 */}
            {s.status === 'IN_PROGRESS' && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium text-green-800">服务记录</h4>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">上传服务照片</label>
                  <div className="flex gap-2">
                    <input type="file" accept="image/*" className="text-sm"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => setPhotos([...photos, ev.target.result]);
                        reader.readAsDataURL(file);
                      }} />
                  </div>
                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {photos.map((p, i) => (
                        <div key={i} className="relative">
                          <img src={p} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                          <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 异常上报 */}
                <div className="p-3 bg-red-50 rounded-xl">
                  <p className="text-sm font-medium text-red-700 mb-2">异常上报</p>
                  <select value={emergencyForm.type} onChange={e => setEmergencyForm({ ...emergencyForm, type: e.target.value })}
                    className="w-full p-2 border border-red-200 rounded-lg text-sm mb-2 outline-none">
                    <option value="accident">宠物意外受伤</option>
                    <option value="illness">宠物突发疾病</option>
                    <option value="environment">环境问题</option>
                    <option value="other">其他</option>
                  </select>
                  <textarea value={emergencyForm.description} onChange={e => setEmergencyForm({ ...emergencyForm, description: e.target.value })}
                    className="w-full p-2 border border-red-200 rounded-lg text-sm outline-none mb-2" rows="2" placeholder="描述异常情况..." />
                  <button onClick={submitEmergency}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs">上报异常</button>
                </div>
              </div>
            )}

            {/* 已完成: 评价 */}
            {isDone && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-green-800 mb-2">用户评价</h4>
                <div className="space-y-2">
                  {(selected.reviews || []).length === 0 ? (
                    <p className="text-sm text-gray-400">暂无评价</p>
                  ) : selected.reviews.map(r => (
                    <div key={r.id} className="bg-green-50 p-3 rounded-xl">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-gray-700">{r.reviewer?.name}</span>
                        <span className="text-yellow-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      </div>
                      {r.comment && <p className="text-xs text-gray-500 mt-1">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 已取消: 原因 */}
            {isCancelled && (
              <div className="bg-red-50 p-3 rounded-xl text-sm text-red-600 text-center">该订单已取消</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 列表视图
  if (loading) return <p className="text-center py-8 text-gray-400">加载中...</p>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">我的订单</h2>
        <p className="text-sm text-green-600 mt-1">管理所有接单状态</p>
      </div>

      {/* Tab 标签 */}
      <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl border border-green-100 overflow-x-auto">
        {tabs.map(t => {
          const count = services.filter(s => s.status === statusMap[t.key]).length;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); }}
              className={'flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-all ' + (tab === t.key ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-green-50')}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span className={'text-xs ml-1 ' + (tab === t.key ? 'text-white/70' : 'text-gray-400')}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* 订单列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-green-100">
          <span className="text-5xl block mb-3">
            {tab === 'pending' ? '📭' : tab === 'cancelled' ? '🗑️' : '✅'}
          </span>
          <p className="text-gray-400 text-sm">
            {tab === 'pending' ? '暂无待接单' : tab === 'waiting' ? '暂无待服务订单' : tab === 'active' ? '暂无进行中订单' : tab === 'completed' ? '暂无已完成订单' : '暂无已取消订单'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} onClick={() => setSelected(s)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-green-100 card-hover cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.pet?.species === 'dog' ? '🐕' : s.pet?.species === 'cat' ? '🐱' : '🐾'}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">{s.title}</h3>
                    <p className="text-xs text-gray-400">{s.pet?.name} · {categoryLabels[s.category] || s.category}</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-700">¥{s.price}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                <span>{s.owner?.name}</span>
                <span>📍 {s.address || '未知地址'}</span>
                <span>{new Date(s.scheduledStart).toLocaleDateString('zh-CN')}</span>
                {s.isUrgent && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded">加急</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
