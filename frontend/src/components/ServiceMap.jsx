import { useEffect, useRef } from 'react';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function ServiceMap({ latitude, longitude, address, className, markers, userLocation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const lat = latitude || 39.9;
    const lng = longitude || 116.4;

    const map = L.map(mapRef.current).setView([lat, lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    if (markers && markers.length > 0) {
      const bounds = [];
      markers.forEach(m => {
        if (!m.latitude || !m.longitude) return;
        bounds.push([m.latitude, m.longitude]);
        const distText = userLocation && m._distance ? `<br/>距我 ${m._distance.toFixed(1)} km` : '';
        L.marker([m.latitude, m.longitude]).addTo(map)
          .bindPopup(`<b>${m.title}</b><br/>¥${m.price}${distText}${m.address ? '<br/>📍 ' + m.address : ''}`);
      });
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
      if (userLocation) {
        L.circle([userLocation.lat, userLocation.lng], {
          radius: 100, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.2, weight: 2,
        }).addTo(map).bindPopup('我的位置');
      }
    } else if (latitude && longitude) {
      L.marker([lat, lng]).addTo(map)
        .bindPopup(address || '服务位置')
        .openPopup();
    }

    mapInstance.current = map;
  }, [latitude, longitude, address, markers, userLocation]);

  return <div ref={mapRef} className={className || 'w-full h-64 rounded border'} />;
}

export function calcDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}
