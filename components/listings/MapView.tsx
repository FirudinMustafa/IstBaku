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

export interface MapBounds { n: number; s: number; e: number; w: number }

interface Props {
  properties: Property[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Kullanıcı haritayı oynattığında görünür alan sınırlarını bildirir (Airbnb tarzı, Tur6). */
  onBoundsChange?: (b: MapBounds) => void;
}

export function MapView({ properties, activeId, onSelect, onBoundsChange }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;
  const onBoundsChangeRef = React.useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  // Programatik hareketleri (fitBounds/setView) kullanıcı hareketinden ayır →
  // sol listeyi yalnızca KULLANICI pan/zoom yapınca filtrele (geri besleme döngüsü yok).
  const programmaticRef = React.useRef(false);
  // H2 perf: haritayı yalnız ilk çizimde sığdır (sonraki filtre/hover'da zıplatma);
  // aktif (hover) ilan değişince tüm marker'lar değil yalnız ilgili iki marker güncellenir.
  const fittedRef = React.useRef(false);
  const activeIdRef = React.useRef<string | undefined>(undefined);

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
        // Tur6: pürüzsüz/kademesiz zoom (Airbnb hissi)
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 120,
        wheelDebounceTime: 40,
      }).setView([40.7, 36], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Kullanıcı pan/zoom bitince görünür alanı bildir (programatik hareketleri atla).
      map.on('moveend', () => {
        if (programmaticRef.current) { programmaticRef.current = false; return; }
        const b = map.getBounds();
        onBoundsChangeRef.current?.({ n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() });
      });

      // After mount, force a size recalc once styles settle.
      requestAnimationFrame(() => {
        if (!disposed && mapRef.current) mapRef.current.invalidateSize();
      });

      // Initial marker draw using latest props.
      syncMarkers(L);
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

  // 2) Properties değişince marker'ları senkronla (ayrıldı — H2 perf).
  React.useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = (await import('leaflet')).default;
      syncMarkers(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties]);

  // 3) Yalnız aktif (hover) ilan değişince ilgili iki marker'ı güncelle — ucuz.
  React.useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = (await import('leaflet')).default;
      updateActiveMarker(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function iconFor(L: any, p: Property, active: boolean) {
    const html = `<div style="background:${active ? '#CAAE99' : '#1e3148'};color:${active ? '#07142a' : '#fff'};padding:4px 9px;border-radius:999px;border:1px solid #CAAE99;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.4);">${formatPrice(p.price, p.currency)}</div>`;
    return L.divIcon({ html, className: 'leaflet-price-pin', iconSize: [70, 24], iconAnchor: [35, 12] });
  }

  function syncMarkers(L: any) {
    const map = mapRef.current;
    if (!map) return;
    const { properties: ps, activeId: aid } = propsRef.current;

    const nextIds = new Set(ps.map((p) => p.id));
    markersRef.current.forEach((m, id) => {
      if (!nextIds.has(id)) { m.remove(); markersRef.current.delete(id); }
    });

    ps.forEach((p) => {
      const existing = markersRef.current.get(p.id);
      if (existing) {
        existing.setLatLng([p.coords.lat, p.coords.lng]);
        existing.setIcon(iconFor(L, p, aid === p.id));
        return;
      }
      const marker = L.marker([p.coords.lat, p.coords.lng], { icon: iconFor(L, p, aid === p.id) }).addTo(map);
      marker.bindPopup(
        `<div style="min-width:200px"><strong>${p.title}</strong><br/><span style="opacity:.7">${p.city} · ${p.district}</span><br/><a href="/property/${p.slug}" style="color:#CAAE99">Detay →</a></div>`,
      );
      marker.on('click', () => onSelectRef.current?.(p.id));
      markersRef.current.set(p.id, marker);
    });
    activeIdRef.current = aid;

    // İlk çizimde bir kez sığdır — sonraki filtre/hover'da haritayı zıplatma.
    if (!fittedRef.current && ps.length > 0) {
      fittedRef.current = true;
      if (ps.length > 1) {
        try {
          const bounds = L.latLngBounds(ps.map((p) => [p.coords.lat, p.coords.lng]));
          programmaticRef.current = true;
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12, animate: false });
        } catch { programmaticRef.current = false; }
      } else {
        programmaticRef.current = true;
        map.setView([ps[0].coords.lat, ps[0].coords.lng], 13, { animate: false });
      }
    }
  }

  function updateActiveMarker(L: any) {
    const next = propsRef.current.activeId;
    const prev = activeIdRef.current;
    if (prev === next) return;
    const ps = propsRef.current.properties;
    [prev, next].forEach((id) => {
      if (!id) return;
      const m = markersRef.current.get(id);
      const p = ps.find((x) => x.id === id);
      if (m && p) m.setIcon(iconFor(L, p, id === next));
    });
    activeIdRef.current = next;
  }

  // Parent kontrol eder: yükseklik + border-radius. MapView yalnızca 100% doldurur.
  // `isolation:isolate` + `relative`: Leaflet pane/kontrol z-index'lerini (400–1000)
  // haritanın kendi stacking context'ine hapseder; böylece sticky header'ı ve
  // komşu bölümleri aşmaz (overflow taşması düzeltmesi).
  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: 0, isolation: 'isolate' }}
    />
  );
}
