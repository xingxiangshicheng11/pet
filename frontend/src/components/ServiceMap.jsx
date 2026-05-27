import { useEffect, useRef } from 'react';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function ServiceMap({ latitude, longitude, address, className }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const lat = latitude || 39.9;
    const lng = longitude || 116.4;

    const map = L.map(mapRef.current).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.marker([lat, lng]).addTo(map)
      .bindPopup(address || '服务位置')
      .openPopup();

    mapInstance.current = map;
  }, [latitude, longitude, address]);

  return <div ref={mapRef} className={className || 'w-full h-64 rounded border'} />;
}
