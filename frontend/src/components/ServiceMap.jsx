import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const categoryColors = { sitting: '#16a34a', walking: '#2563eb', feeding: '#ea580c', grooming: '#9333ea', training: '#ca8a04' };

export default function ServiceMap({ latitude, longitude, address, className, markers, userLocation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, { zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstance.current = map;

      // Return cleanup
      return () => {
        map.remove();
        mapInstance.current = null;
      };
    }
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear all layers
    map.eachLayer((l) => {
      if (l instanceof L.TileLayer) return;
      map.removeLayer(l);
    });

    if (userLocation) {
      L.circle([userLocation.lat, userLocation.lng], {
        radius: 100, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.2, weight: 2,
      }).addTo(map).bindPopup('我的位置');

      //精度圈
      if (userLocation.accuracy) {
        L.circle([userLocation.lat, userLocation.lng], {
          radius: userLocation.accuracy, color: '#16a34a40', fillColor: '#16a34a10', fillOpacity: 0.05, weight: 1,
        }).addTo(map);
      }
    }

    if (latitude && longitude && markers?.length > 0) {
      const bounds = L.latLngBounds([latitude, longitude]);
      markers.forEach(m => {
        if (!m.latitude || !m.longitude) return;
        const color = categoryColors[m.category] || '#16a34a';
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${color};color:white;padding:2px 6px;border-radius:10px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.2);border:2px solid white;">¥${m.price}</div>`,
          iconSize: [0, 0],
        });
        const marker = L.marker([m.latitude, m.longitude], { icon }).addTo(map);
        const dist = userLocation ? `距我 ${m._distance?.toFixed(1) || '?'} km` : '';
        marker.bindPopup(`
          <div style="font-family:sans-serif;min-width:180px;">
            <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${m.title}</div>
            <div style="color:#666;font-size:12px;">¥${m.price} ${dist}</div>
            ${m.address ? `<div style="color:#999;font-size:11px;margin-top:4px;">📍 ${m.address}</div>` : ''}
          </div>
        `);
        bounds.extend(m.latLng || [m.latitude, m.longitude]);
      });
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (latitude && longitude) {
      const marker = L.marker([latitude, longitude]).addTo(map)
        .bindPopup(address || '服务位置').openPopup();
      map.setView([latitude, longitude], 13);
    } else if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 12);
    } else {
      map.setView([39.9, 116.4], 5);
    }
  }, [latitude, longitude, address, markers, userLocation]);

  return <div ref={mapRef} className={className || 'w-full h-64 rounded-xl border border-green-200 z-0'} />;
}
