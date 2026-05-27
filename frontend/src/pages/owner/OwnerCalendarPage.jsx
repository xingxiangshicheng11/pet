import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const statusColors = {
  OPEN: 'bg-blue-100 text-blue-700 border-blue-200',
  ACCEPTED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-700 border-purple-200',
  WAITING_PAYMENT: 'bg-orange-100 text-orange-700 border-orange-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function OwnerCalendarPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('userId') || '0');
    api.get('/services?ownerId=' + uid).then(res => {
      setServices(res.data.filter(s => s.status !== 'CANCELLED'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const getServicesForDate = (day) => {
    const dateStr = new Date(year, month, day).toDateString();
    return services.filter(s => {
      const start = new Date(s.scheduledStart).toDateString();
      const end = new Date(s.scheduledEnd).toDateString();
      return start === dateStr || end === dateStr || (new Date(s.scheduledStart) <= new Date(year, month, day) && new Date(s.scheduledEnd) >= new Date(year, month, day));
    });
  };

  const monthName = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'][month];

  const handleDateClick = (day) => {
    const d = new Date(year, month, day);
    setSelectedDate(d);
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-green-900">服务日历</h2>
        <p className="text-sm text-green-600 mt-1">按日历查看您的服务安排</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-green-50">
              <button onClick={prevMonth} className="text-green-600 hover:text-green-700 text-lg">◀</button>
              <h3 className="font-semibold text-green-800">{year}年 {monthName}</h3>
              <button onClick={nextMonth} className="text-green-600 hover:text-green-700 text-lg">▶</button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 bg-gray-50 py-2">
              {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="font-medium">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => <div key={'e-' + i} className="min-h-[80px] p-1" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayServices = getServicesForDate(day);
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                return (
                  <div key={day} onClick={() => handleDateClick(day)}
                    className={'min-h-[80px] p-1 border-t border-l cursor-pointer transition-colors ' + (isSelected ? 'bg-green-50' : 'hover:bg-green-50/50') + (isToday ? ' bg-yellow-50' : '')}>
                    <div className={'text-xs mb-1 ' + (isToday ? 'font-bold text-green-700' : 'text-gray-500')}>{day}</div>
                    <div className="space-y-0.5">
                      {dayServices.slice(0, 2).map(s => (
                        <div key={s.id} className={'text-xs px-1 py-0.5 rounded truncate border ' + (statusColors[s.status] || '')}>
                          {s.title?.slice(0, 4)}...
                        </div>
                      ))}
                      {dayServices.length > 2 && <div className="text-xs text-gray-400 px-1">+{dayServices.length - 2} 更多</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-4 sticky top-4">
            <h3 className="font-semibold text-green-800 mb-3">
              {selectedDate ? selectedDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }) : '选择日期查看'}
            </h3>
            {selectedDate ? (
              <>
                {getServicesForDate(selectedDate.getDate()).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">当天无服务</p>
                ) : (
                  <div className="space-y-3">
                    {getServicesForDate(selectedDate.getDate()).map(s => (
                      <div key={s.id} className="p-3 rounded-xl border border-green-100 hover:bg-green-50 cursor-pointer"
                        onClick={() => navigate('/owner/services')}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-700 truncate">{s.title}</p>
                          <span className={'text-xs px-2 py-0.5 rounded ' + (statusColors[s.status]?.split(' ')[0] || '')}>{s.status}</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(s.scheduledStart).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} ~ {new Date(s.scheduledEnd).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-gray-400">¥{s.price}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">点击日历中的日期查看详情</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
