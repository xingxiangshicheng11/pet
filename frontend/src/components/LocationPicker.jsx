import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function LocationPicker({ latitude, longitude, address, onLocationChange, className }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [addr, setAddr] = useState(address || '');
  const [lat, setLat] = useState(latitude || '');
  const [lng, setLng] = useState(longitude || '');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const initLat = latitude || 39.9;
    const initLng = longitude || 116.4;

    const map = L.map(mapRef.current).setView([initLat, initLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
    marker.bindPopup('拖动或点击地图重新定位').openPopup();

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setLat(pos.lat.toFixed(6));
      setLng(pos.lng.toFixed(6));
      onLocationChange && onLocationChange({ latitude: pos.lat, longitude: pos.lng, address: addr });
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      const pos = e.latlng;
      setLat(pos.lat.toFixed(6));
      setLng(pos.lng.toFixed(6));
      onLocationChange && onLocationChange({ latitude: pos.lat, longitude: pos.lng, address: addr });
    });

    mapInstance.current = map;
    markerRef.current = marker;
  }, []);

  const handleAddrChange = (val) => {
    setAddr(val);
    onLocationChange && onLocationChange({ latitude: parseFloat(lat) || null, longitude: parseFloat(lng) || null, address: val });
  };

  const getCurrentPosition = () => {
    if (!navigator.geolocation) { alert('浏览器不支持定位'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setLat(la.toFixed(6));
        setLng(lo.toFixed(6));
        if (mapInstance.current && markerRef.current) {
          mapInstance.current.setView([la, lo], 15);
          markerRef.current.setLatLng([la, lo]);
        }
        onLocationChange && onLocationChange({ latitude: la, longitude: lo, address: addr });
        setLocating(false);
      },
      () => { alert('定位失败，请手动输入'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={className || 'space-y-3'}>
      <div ref={mapRef} className="w-full h-64 rounded-xl border border-green-200 z-0" />
      <div className="flex items-center gap-2">
        <input value={addr} onChange={e => handleAddrChange(e.target.value)}
          placeholder="详细地址" className="flex-1 p-2.5 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none" />
        <button type="button" onClick={getCurrentPosition} disabled={locating}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm whitespace-nowrap">
          {locating ? '定位中...' : '📍 定位'}
        </button>
      </div>
      <div className="flex gap-2 text-xs text-gray-400">
        <span>纬度: {lat || '未设置'}</span>
        <span>经度: {lng || '未设置'}</span>
      </div>
    </div>
  );
}
