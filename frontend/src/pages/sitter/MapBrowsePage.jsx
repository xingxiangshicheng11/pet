import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import api from '../../services/api';
import socket from '../../services/socket';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const categoryLabels = { sitting: '宠物陪伴', walking: '遛狗', feeding: '喂食', grooming: '美容', training: '训练' };
const categoryColors = { sitting: '#16a34a', walking: '#2563eb', feeding: '#ea580c', grooming: '#9333ea', training: '#ca8a04' };

export default function MapBrowsePage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(50);
  const [locating, setLocating] = useState(true);

  const fetchNearby = (lat, lng) => {
    api.get(`/services/nearby?lat=${lat}&lng=${lng}&radius=${radius}`).then(res => {
      setServices(res.data);
      updateMarkers(res.data, lat, lng);
    }).catch(() => {});
  };

  const getLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      const def = { lat: 39.9, lng: 116.4 };
      setUserLocation(def);
      fetchNearby(def.lat, def.lng);
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        initMap(loc.lat, loc.lng);
        fetchNearby(loc.lat, loc.lng);
        setLocating(false);
      },
      () => {
        const def = { lat: 39.9, lng: 116.4 };
        setUserLocation(def);
        initMap(def.lat, def.lng);
        fetchNearby(def.lat, def.lng);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { getLocation(); }, []);

  useEffect(() => {
    socket.on('service:new', (svc) => {
      if (userLocation && svc.latitude && svc.longitude) {
        setServices(prev => {
          const exists = prev.find(s => s.id === svc.id);
          if (exists) return prev;
          const dist = calcDistance(userLocation.lat, userLocation.lng, svc.latitude, svc.longitude);
          return [...prev, { ...svc, distance: dist }];
        });
      }
    });
    return () => socket.off('service:new');
  }, [userLocation]);

  useEffect(() => {
    if (userLocation && radius) {
      fetchNearby(userLocation.lat, userLocation.lng);
    }
  }, [radius]);

  const initMap = (lat, lng) => {
    if (mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.circle([lat, lng], {
      radius: radius * 1000, color: '#16a34a', fillColor: '#16a34a20', fillOpacity: 0.1, weight: 2, dashArray: '5, 10',
    }).addTo(map);

    L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div style="width:24px;height:24px;background:#16a34a;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>', iconSize: [24, 24], iconAnchor: [12, 12] }),
    }).addTo(map).bindPopup('我的位置');

    map.on('click', () => setSelected(null));
    mapInstance.current = map;
  };

  const updateMarkers = (svcs, lat, lng) => {
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    svcs.forEach(s => {
      if (!s.latitude || !s.longitude) return;
      const color = categoryColors[s.category] || '#16a34a';
      const marker = L.marker([s.latitude, s.longitude], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:${color};color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:2px solid white;">¥${s.price}</div>`,
          iconSize: [0, 0], iconAnchor: [0, 0],
        }),
      }).addTo(map);

      const distText = s.distance ? `<br/><span style="color:#666;font-size:12px;">距我 ${s.distance.toFixed(1)} km</span>` : '';
      marker.bindPopup(`
        <div style="min-width:200px;">
          <b style="font-size:14px;">${s.title}</b>
          <p style="margin:4px 0;font-size:12px;color:#666;">${categoryLabels[s.category] || s.category} ${distText}</p>
          <p style="margin:4px 0;font-size:12px;color:#666;">🐾 ${s.pet?.name || '未知'} · 主人 ${s.owner?.name || '未知'}</p>
          <p style="margin:4px 0;font-size:13px;color:#16a34a;font-weight:bold;">¥${s.price}</p>
          ${s.address ? `<p style="margin:4px 0;font-size:11px;color:#999;">📍 ${s.address}</p>` : ''}
          <button onclick="window.__acceptService && window.__acceptService(${s.id})" style="background:#16a34a;color:white;border:none;padding:6px 16px;border-radius:8px;font-size:12px;cursor:pointer;margin-top:4px;width:100%;">确认接单</button>
        </div>
      `);

      marker.on('click', () => setSelected(s));
      markersRef.current.push(marker);
    });

    if (lat && lng) {
      map.eachLayer(l => {
        if (l instanceof L.Circle) map.removeLayer(l);
      });
      L.circle([lat, lng], {
        radius: radius * 1000, color: '#16a34a', fillColor: '#16a34a20', fillOpacity: 0.1, weight: 2, dashArray: '5, 10',
      }).addTo(map);
    }
  };

  const acceptService = async (id) => {
    setAccepting(true);
    try {
      const res = await api.post('/services/' + id + '/accept');
      setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'ACCEPTED' } : s));
      if (selected?.id === id) setSelected(res.data);
      alert('接单成功！');
    } catch (err) {
      alert(err.response?.data?.error || '接单失败');
    }
    setAccepting(false);
  };

  window.__acceptService = acceptService;

  if (locating) {
    return <div className="flex items-center justify-center h-96"><p className="text-gray-400">正在获取位置...</p></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-green-900">地图浏览</h2>
          <p className="text-sm text-green-600 mt-1">在地图上查看附近的服务需求</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={radius} onChange={e => setRadius(e.target.value)}
            className="p-2 border border-green-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none">
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
          </select>
          <button onClick={getLocation}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm">重新定位</button>
        </div>
      </div>

      <div className="relative flex-1 rounded-2xl overflow-hidden border border-green-200">
        <div ref={mapRef} className="w-full h-full" />

        <div className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded-xl shadow-lg text-xs space-y-1.5">
          <p className="font-semibold text-gray-600 mb-1">图例</p>
          {Object.entries(categoryLabels).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span style={{ background: categoryColors[k], width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
              <span className="text-gray-500">{v}</span>
            </div>
          ))}
          <div className="border-t pt-1 mt-1">
            <span className="text-gray-400">{services.length} 个服务</span>
          </div>
        </div>

        {selected && selected.status === 'OPEN' && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white rounded-2xl shadow-xl border p-4 max-w-md mx-auto">
            <button onClick={() => setSelected(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ background: categoryColors[selected.category], width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }} />
              <span className="font-semibold text-gray-800">{selected.title}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
              <span>🐾 {selected.pet?.name || '未知'}</span>
              <span>👤 {selected.owner?.name}</span>
              <span>💰 ¥{selected.price}</span>
              {selected.distance && <span>📏 {selected.distance.toFixed(1)} km</span>}
            </div>
            {selected.address && <p className="text-xs text-gray-400 mb-3">📍 {selected.address}</p>}
            <button onClick={() => acceptService(selected.id)} disabled={accepting}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white w-full py-2 rounded-xl text-sm font-medium">
              {accepting ? '接单中...' : '确认接单'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
