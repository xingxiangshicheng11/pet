import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import api from '../../services/api';
import socket from '../../services/socket';
import { calcDistance } from '../../utils/geo';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const categoryLabels = { sitting: '宠物陪伴', walking: '遛狗', feeding: '喂食', grooming: '美容', training: '训练' };
const categoryColors = { sitting: '#16a34a', walking: '#2563eb', feeding: '#ea580c', grooming: '#9333ea', training: '#ca8a04' };

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid white;cursor:pointer;">¥</div>`,
    iconSize: [0, 0], iconAnchor: [0, 0],
  });
}

export default function MapBrowsePage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const clusterRef = useRef(null);
  const circleRef = useRef(null);
  const watchIdRef = useRef(null);
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(50);
  const [locating, setLocating] = useState(true);
  const [layerType, setLayerType] = useState('street');
  const [searchText, setSearchText] = useState('');

  const acceptRef = useRef(null);
  const tileRef = useRef(null);

  const acceptService = useCallback(async (id) => {
    setAccepting(true);
    try {
      const res = await api.post('/services/' + id + '/accept');
      setServices(prev => {
        const updated = prev.map(s => s.id === id ? { ...s, status: 'ACCEPTED' } : s);
        refreshCluster(updated);
        return updated;
      });
      setSelected(prev => prev?.id === id ? { ...res.data, distance: prev.distance } : prev);
    } catch (err) {
      alert(err.response?.data?.error || '接单失败');
    }
    setAccepting(false);
  }, []);

  acceptRef.current = acceptService;

  function makePopupContent(s) {
    const div = L.DomUtil.create('div');
    div.style.cssText = 'min-width:220px;font-family:sans-serif;';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="width:32px;height:32px;background:${categoryColors[s.category] || '#16a34a'};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;color:white;flex-shrink:0;">${s.category === 'walking' ? '🚶' : s.category === 'feeding' ? '🍽️' : s.category === 'grooming' ? '✂️' : s.category === 'training' ? '🎯' : '🤗'}</div>
        <div style="flex:1;"><b style="font-size:14px;">${s.title}</b><br/><span style="font-size:11px;color:#666;">${categoryLabels[s.category] || s.category}${s.distance ? ` · ${s.distance.toFixed(1)}km` : ''}</span></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;color:#555;margin-bottom:8px;">
        <span>🐾 ${s.pet?.name || '未知'} · 主人 ${s.owner?.name || '未知'}</span>
        <span style="text-align:right;font-weight:bold;color:#16a34a;font-size:16px;">¥${s.price}</span>
      </div>
      ${s.address ? `<p style="font-size:11px;color:#999;margin:0 0 8px;">📍 ${s.address}</p>` : ''}
    `;
    if (s.status === 'OPEN') {
      const btn = L.DomUtil.create('button');
      btn.textContent = '确认接单';
      btn.style.cssText = 'background:#16a34a;color:white;border:none;padding:8px 0;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;width:100%;';
      const sid = s.id;
      btn.onclick = () => { acceptRef.current(sid); div.closest('.leaflet-popup')?.remove(); };
      div.appendChild(btn);
    }
    return div;
  }

  function refreshCluster(svcs, loc) {
    const map = mapInstance.current;
    const cl = clusterRef.current;
    if (!map || !cl) return;

    cl.clearLayers();

    svcs.forEach(s => {
      if (!s.latitude || !s.longitude) return;
      const color = categoryColors[s.category] || '#16a34a';
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid white;">¥${s.price}</div>`,
        iconSize: [0, 0], iconAnchor: [0, 0],
      });
      const marker = L.marker([s.latitude, s.longitude], { icon });
      marker.bindPopup(makePopupContent(s));
      marker.on('click', () => setSelected(s));
      cl.addLayer(marker);
    });

    if (loc && cl.getLayers().length > 0) {
      const bounds = L.latLngBounds([loc.lat, loc.lng]);
      cl.getLayers().forEach(m => { try { bounds.extend(m.getLatLng()); } catch {} });
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }

  const initMap = useCallback((lat, lng, rad) => {
    if (mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 12);

    tileRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    circleRef.current = L.circle([lat, lng], {
      radius: rad * 1000, color: '#16a34a', fillColor: '#16a34a20', fillOpacity: 0.1, weight: 2, dashArray: '5, 10',
    }).addTo(map);

    L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div style="width:20px;height:20px;background:#16a34a;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px rgba(22,163,74,0.3),0 2px 8px rgba(0,0,0,0.3);"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
    }).addTo(map).bindPopup('我的位置');

    map.on('click', () => setSelected(null));

    clusterRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cl) => {
        const count = cl.getChildCount();
        let color = '#16a34a';
        if (count > 10) color = '#ca8a04';
        if (count > 20) color = '#ea580c';
        return L.divIcon({
          html: `<div style="background:${color};color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);">${count}</div>`,
          className: '', iconSize: [36, 36], iconAnchor: [18, 18],
        });
      },
    });
    map.addLayer(clusterRef.current);

    mapInstance.current = map;
  }, []);

  function switchLayer(type) {
    if (!mapInstance.current) return;
    setLayerType(type);
    if (tileRef.current) mapInstance.current.removeLayer(tileRef.current);
    const url = type === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attr = type === 'satellite'
      ? '&copy; Esri'
      : '&copy; OpenStreetMap contributors';
    tileRef.current = L.tileLayer(url, { attribution: attr, maxZoom: 19 }).addTo(mapInstance.current);
  }

  const fetchNearby = useCallback((lat, lng) => {
    api.get(`/services/nearby?lat=${lat}&lng=${lng}&radius=${radius}`).then(res => {
      setServices(res.data);
      refreshCluster(res.data, { lat, lng });
    }).catch(() => {});
  }, [radius]);

  const startWith = useCallback((loc) => {
    initMap(loc.lat, loc.lng, radius);
    fetchNearby(loc.lat, loc.lng);
    setUserLocation(loc);
    setLocating(false);
  }, [initMap, fetchNearby, radius]);

  const getLocation = useCallback(() => {
    setLocating(true);

    if (!navigator.geolocation) {
      startWith({ lat: 39.9, lng: 116.4 });
      return;
    }

    // Step 1: fast initial fix with getCurrentPosition (low accuracy first)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!mapInstance.current) startWith(loc);
        setUserLocation(loc);
        if (circleRef.current) circleRef.current.setLatLng([loc.lat, loc.lng]);
      },
      () => {
        if (!mapInstance.current) startWith({ lat: 39.9, lng: 116.4 });
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
    );

    // Step 2: continuous tracking with watchPosition (high accuracy)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!mapInstance.current) startWith(loc);
        setUserLocation(loc);
        if (circleRef.current) circleRef.current.setLatLng([loc.lat, loc.lng]);
        setLocating(false);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 },
    );
  }, [startWith]);

  useEffect(() => {
    getLocation();
    return () => { if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  useEffect(() => {
    if (!userLocation || !radius) return;
    if (circleRef.current) {
      circleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      circleRef.current.setRadius(radius * 1000);
    }
    fetchNearby(userLocation.lat, userLocation.lng);
  }, [radius, userLocation, fetchNearby]);

  useEffect(() => {
    if (!userLocation) return;
    const handler = (svc) => {
      if (!svc.latitude || !svc.longitude) return;
      setServices(prev => {
        if (prev.find(s => s.id === svc.id)) return prev;
        const dist = calcDistance(userLocation.lat, userLocation.lng, svc.latitude, svc.longitude);
        const next = [...prev, { ...svc, distance: dist }];
        refreshCluster(next);
        return next;
      });
    };
    socket.on('service:new', handler);
    return () => socket.off('service:new');
  }, [userLocation]);

  const handleSearchLocation = async () => {
    if (!searchText.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchText)}&format=json&limit=5&accept-language=zh`, {
        headers: { 'User-Agent': 'PetServiceApp/1.0' },
      });
      const data = await res.json();
      if (data.length === 0) { alert('未找到该地点'); return; }
      const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      if (mapInstance.current) mapInstance.current.setView([loc.lat, loc.lng], 15);
      setUserLocation(loc);
      if (circleRef.current) {
        circleRef.current.setLatLng([loc.lat, loc.lng]);
        circleRef.current.setRadius(radius * 1000);
      }
      fetchNearby(loc.lat, loc.lng);
    } catch { alert('搜索失败'); }
  };

  if (locating) {
    return <div className="flex items-center justify-center h-96"><p className="text-gray-400">正在获取位置...</p></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-green-900">地图浏览</h2>
          <p className="text-sm text-green-600 mt-1">发现附近服务需求</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-white border border-green-200 rounded-xl overflow-hidden">
            <div className="flex items-center px-2">
              <span className="text-gray-400 text-sm">🔍</span>
            </div>
            <input value={searchText} onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchLocation()}
              placeholder="搜索地点..."
              className="p-2 text-sm outline-none w-32" />
            <button onClick={handleSearchLocation}
              className="bg-green-600 hover:bg-green-700 text-white px-3 text-sm">搜索</button>
          </div>
          <select value={radius} onChange={e => setRadius(Number(e.target.value))}
            className="p-2 border border-green-200 rounded-xl text-sm bg-white outline-none">
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
          </select>
          <select value={layerType} onChange={e => switchLayer(e.target.value)}
            className="p-2 border border-green-200 rounded-xl text-sm bg-white outline-none">
            <option value="street">🗺️ 街道</option>
            <option value="satellite">🛰️ 卫星</option>
          </select>
        </div>
      </div>

      <div className="relative flex-1 rounded-2xl overflow-hidden border border-green-200">
        <div ref={mapRef} className="w-full h-full" />

        <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg text-xs space-y-1.5">
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
          <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-2xl shadow-2xl border-t border-green-100 p-5 max-w-lg mx-auto animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div style={{ background: categoryColors[selected.category] || '#16a34a' }} className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-white">
                  {selected.category === 'walking' ? '🚶' : selected.category === 'feeding' ? '🍽️' : selected.category === 'grooming' ? '✂️' : selected.category === 'training' ? '🎯' : '🤗'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{selected.title}</h3>
                  <span className="text-xs text-gray-400">{categoryLabels[selected.category] || selected.category}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-3 bg-green-50 rounded-xl p-3">
              <span>🐾 {selected.pet?.name || '未知'}</span>
              <span>👤 {selected.owner?.name}</span>
              <span className="text-green-700 font-bold text-lg">¥{selected.price}</span>
              {selected.distance && <span>📏 {selected.distance.toFixed(1)} km</span>}
            </div>
            {selected.address && <p className="text-xs text-gray-400 mb-3">📍 {selected.address}</p>}
            <button onClick={() => acceptService(selected.id)} disabled={accepting}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white w-full py-3 rounded-xl text-sm font-medium transition-colors">
              {accepting ? '接单中...' : '确认接单'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
