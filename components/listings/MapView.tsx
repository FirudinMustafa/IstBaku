'use client';

import * as React from 'react';
// PB-05: self-host Leaflet CSS via the bundled package instead of the runtime
// `<link href="https://unpkg.com/...">` injection. This:
//   - removes a 3rd-party origin from the runtime (no `unpkg.com` request),
//   - makes the stylesheet load identically to every other CSS module
//     (Next.js/Turbopack hashes + serves it from /_next/static), and
//   - eliminates the `style-src` CSP violation that previously left the map
//     unstyled on `/listings` (map toggle) and the new-listing location step.
import 'leaflet/dist/leaflet.css';
import type { Property } from '@/lib/types';
import { formatPrice } from '@/lib/currency';

interface Props {
  properties: Property[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

export function MapView({ properties, activeId, onSelect }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;

  // Track latest props so the async init effect can read them without restart.
  const propsRef = React.useRef({ properties, activeId });
  propsRef.current = { properties, activeId };

  // 1) Mount-only: create the map once, destroy on unmount.
  React.useEffect(() => {
    let disposed = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (disposed || !containerRef.current) return;

      // Defensive: if a previous map is still bound to this DIV (HMR / Strict mode), clean it.
      const el = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (el._leaflet_id) {
        try {
          // remove any leftover handler
          delete el._leaflet_id;
        } catch {}
      }

      const map = L.map(el, {
        zoomControl: true,
        scrollWheelZoom: true,
        preferCanvas: true,
      }).setView([40.7, 36], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // After mount, force a size recalc once styles settle.
      requestAnimationFrame(() => {
        if (!disposed && mapRef.current) mapRef.current.invalidateSize();
      });

      // Initial marker draw using latest props.
      drawMarkers(L);
    })();

    return () => {
      disposed = true;
      try {
        markersRef.current.forEach((m) => m.remove?.());
      } catch {}
      markersRef.current.clear();
      try {
        mapRef.current?.off?.();
        mapRef.current?.remove?.();
      } catch {}
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Whenever properties or activeId changes, re-draw markers.
  React.useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = (await import('leaflet')).default;
      drawMarkers(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, activeId]);

  function drawMarkers(L: any) {
    const map = mapRef.current;
    if (!map) return;

    const { properties: ps, activeId: aid } = propsRef.current;

    // Remove markers that no longer exist
    const nextIds = new Set(ps.map((p) => p.id));
    markersRef.current.forEach((m, id) => {
      if (!nextIds.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    });

    ps.forEach((p) => {
      const existing = markersRef.current.get(p.id);
      const active = aid === p.id;
      const html = `<div style="background:${active ? '#CAAE99' : '#1e3148'};color:${active ? '#07142a' : '#fff'};padding:4px 9px;border-radius:999px;border:1px solid #CAAE99;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.4);">${formatPrice(p.price, p.currency)}</div>`;
      const icon = L.divIcon({ html, className: 'leaflet-price-pin', iconSize: [70, 24], iconAnchor: [35, 12] });

      if (existing) {
        existing.setIcon(icon);
        existing.setLatLng([p.coords.lat, p.coords.lng]);
        return;
      }

      const marker = L.marker([p.coords.lat, p.coords.lng], { icon }).addTo(map);
      marker.bindPopup(
        `<div style="min-width:200px"><strong>${p.title}</strong><br/><span style="opacity:.7">${p.city} · ${p.district}</span><br/><a href="/property/${p.slug}" style="color:#CAAE99">Detay →</a></div>`,
      );
      marker.on('click', () => onSelectRef.current?.(p.id));
      markersRef.current.set(p.id, marker);
    });

    // Fit bounds only when there are multiple markers and we're not zoomed in.
    if (ps.length > 1) {
      try {
        const bounds = L.latLngBounds(ps.map((p) => [p.coords.lat, p.coords.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12, animate: false });
      } catch {}
    } else if (ps.length === 1) {
      map.setView([ps[0].coords.lat, ps[0].coords.lng], 13, { animate: false });
    }
  }

  // Parent kontrol eder: yükseklik + border-radius. MapView yalnızca 100% doldurur.
  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: 0 }} />;
}
