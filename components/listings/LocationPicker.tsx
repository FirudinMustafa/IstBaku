'use client';

import * as React from 'react';
import { MapPin, RotateCcw } from 'lucide-react';
// PB-05: self-hosted Leaflet CSS — see components/listings/MapView.tsx for
// the full justification. Keeps the CSP `style-src` allowlist clean of
// 3rd-party origins and removes the runtime `unpkg.com` fetch.
import 'leaflet/dist/leaflet.css';

interface Props {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
  /** İlk açılışta merkezlenecek konum */
  center?: { lat: number; lng: number };
}

export function LocationPicker({ lat, lng, onChange, center }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markerRef = React.useRef<any>(null);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (disposed || !ref.current) return;
      const el = ref.current as HTMLDivElement & { _leaflet_id?: number };
      if (el._leaflet_id) { try { delete el._leaflet_id; } catch {} }

      const startLat = lat ?? center?.lat ?? 41.015;
      const startLng = lng ?? center?.lng ?? 28.97;
      const startZoom = lat ? 15 : 11;

      const map = L.map(el, { scrollWheelZoom: true, preferCanvas: true })
        .setView([startLat, startLng], startZoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());

      const updatePin = (newLat: number, newLng: number) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        } else {
          const icon = L.divIcon({
            html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#CAAE99;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,0.4);"></div>`,
            className: 'leaflet-loc-pin',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });
          markerRef.current = L.marker([newLat, newLng], { icon, draggable: true }).addTo(map);
          markerRef.current.on('dragend', (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
            const p = e.target.getLatLng();
            onChangeRef.current(p.lat, p.lng);
          });
        }
      };

      if (lat && lng) updatePin(lat, lng);

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        updatePin(e.latlng.lat, e.latlng.lng);
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
      });
    })();
    return () => {
      disposed = true;
      try {
        markerRef.current?.remove?.();
        mapRef.current?.off?.();
        mapRef.current?.remove?.();
      } catch {}
      markerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External lat/lng change → marker'ı güncelle (city değişince merkez al)
  React.useEffect(() => {
    if (!mapRef.current || !center) return;
    if (!lat || !lng) {
      mapRef.current.setView([center.lat, center.lng], 11);
      markerRef.current?.remove?.();
      markerRef.current = null;
    }
  }, [center?.lat, center?.lng, lat, lng]);

  function clear() {
    markerRef.current?.remove?.();
    markerRef.current = null;
    onChangeRef.current(0, 0);
    if (center && mapRef.current) {
      mapRef.current.setView([center.lat, center.lng], 11);
    }
  }

  return (
    <div className="rounded-2xl border bg-[color:var(--bg-elev)] overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b text-xs">
        <span className="inline-flex items-center gap-1.5 text-[color:var(--fg-muted)]">
          <MapPin size={12} className="text-gold-300" />
          {lat && lng
            ? <span>Konum: <strong>{lat.toFixed(5)}, {lng.toFixed(5)}</strong></span>
            : <span>Haritada bir noktaya tıkla veya pin'i sürükle</span>}
        </span>
        {lat && lng && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 text-[color:var(--fg-muted)] hover:text-gold-300"
          >
            <RotateCcw size={11} /> Sıfırla
          </button>
        )}
      </div>
      <div ref={ref} className="h-72 w-full" />
    </div>
  );
}
