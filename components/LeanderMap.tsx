'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapPin } from '@/lib/spots';
import { directionsUrl, isApple, haversineMi } from '@/lib/map';
import { evalHours, statusLabel, type HourState } from '@/lib/hours';

const LEANDER: [number, number] = [-97.853, 30.572];

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Live open/closed pill, computed at popup-open time against Central now.
function pillHtml(periods: number[][], open24: boolean): string {
  const st = evalHours(periods, open24);
  const cls: Record<HourState, string> = { open: 'open', open24: 'open', closing_soon: 'soon', closed: 'closed', unknown: 'unknown' };
  return `<span class="llg-pill llg-pill-${cls[st.state]}">${esc(statusLabel(st))}</span>`;
}

function fc(pins: MapPin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pins.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { slug: p.slug, name: p.name, cat: p.cat, lat: p.lat, lng: p.lng, gem: p.hiddenGem ? 1 : 0, price: p.priceTier || 0, blurb: p.hook || '', visited: p.visited ? 1 : 0, periods: JSON.stringify(p.periods), open24: p.open24 ? 1 : 0 },
    })),
  };
}

export default function LeanderMap({ pins, userLoc, openSlug }: { pins: MapPin[]; userLoc: { lat: number; lng: number } | null; openSlug?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const ready = useRef(false);

  // init once
  useEffect(() => {
    if (!ref.current || map.current) return;
    const m = new maplibregl.Map({
      container: ref.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: LEANDER, zoom: 11.4, maxZoom: 18, minZoom: 9,
      dragRotate: false, pitchWithRotate: false, attributionControl: { compact: true },
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.touchZoomRotate.disableRotation();

    m.on('load', () => {
      m.addSource('spots', { type: 'geojson', data: fc(pins), cluster: true, clusterRadius: 46, clusterMaxZoom: 13 });
      m.addLayer({ id: 'clusters', type: 'circle', source: 'spots', filter: ['has', 'point_count'],
        paint: { 'circle-color': '#16130F', 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 21, 30, 27], 'circle-stroke-width': 2, 'circle-stroke-color': '#F4EFE6' } });
      m.addLayer({ id: 'cluster-count', type: 'symbol', source: 'spots', filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['Noto Sans Bold'], 'text-size': 13 }, paint: { 'text-color': '#F4EFE6' } });
      m.addLayer({ id: 'pins', type: 'circle', source: 'spots', filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 8, 'circle-stroke-width': 2.5, 'circle-stroke-color': '#F4EFE6',
          'circle-color': ['case', ['==', ['get', 'gem'], 1], '#E8A33D', '#E03A1E'],
        } });

      // hover (desktop)
      const hover = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'llg-tip', offset: 12 });
      m.on('mouseenter', 'pins', (e) => {
        m.getCanvas().style.cursor = 'pointer';
        const f = e.features![0]; const p = f.properties as Record<string, string>;
        hover.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setHTML(`<strong>${esc(p.name)}</strong>`).addTo(m);
      });
      m.on('mouseleave', 'pins', () => { m.getCanvas().style.cursor = ''; hover.remove(); });
      m.on('click', 'pins', (e) => { hover.remove(); openPopup(m, e.features![0], userLocRef.current); });
      m.on('mouseenter', 'clusters', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'clusters', () => { m.getCanvas().style.cursor = ''; });
      m.on('click', 'clusters', async (e) => {
        const f = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        const id = f.properties!.cluster_id;
        const src = m.getSource('spots') as maplibregl.GeoJSONSource;
        const zoom = await src.getClusterExpansionZoom(id);
        m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });
      ready.current = true;
      if (openSlugRef.current) flyToSlug(m, pinsRef.current, openSlugRef.current);
    });
    return () => { m.remove(); map.current = null; ready.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep refs fresh for event handlers
  const pinsRef = useRef(pins); pinsRef.current = pins;
  const userLocRef = useRef(userLoc); userLocRef.current = userLoc;
  const openSlugRef = useRef(openSlug); openSlugRef.current = openSlug;

  // update markers when filtered pins change
  useEffect(() => {
    const m = map.current; if (!m || !ready.current) return;
    const src = m.getSource('spots') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(fc(pins));
  }, [pins]);

  // user location marker + flyTo
  useEffect(() => {
    const m = map.current; if (!m) return;
    if (userMarker.current) { userMarker.current.remove(); userMarker.current = null; }
    if (userLoc) {
      const el = document.createElement('div');
      el.className = 'llg-here';
      el.innerHTML = '<span class="llg-here-ring"></span><span class="llg-here-dot"></span>';
      userMarker.current = new maplibregl.Marker({ element: el }).setLngLat([userLoc.lng, userLoc.lat]).addTo(m);
      m.flyTo({ center: [userLoc.lng, userLoc.lat], zoom: 13.5 });
    }
  }, [userLoc]);

  // open a specific spot (deep-link)
  useEffect(() => {
    const m = map.current; if (!m || !ready.current || !openSlug) return;
    flyToSlug(m, pins, openSlug);
  }, [openSlug, pins]);

  return <div ref={ref} className="w-full h-full" />;
}

function openPopup(m: maplibregl.Map, f: maplibregl.MapGeoJSONFeature, userLoc: { lat: number; lng: number } | null) {
  const p = f.properties as Record<string, string | number>;
  const lat = Number(p.lat), lng = Number(p.lng);
  const apple = isApple();
  const dist = userLoc ? haversineMi(userLoc, { lat, lng }) : null;
  const price = Number(p.price) ? '$'.repeat(Number(p.price)) : '';
  const meta = [esc(String(p.cat)), price, p.gem ? 'Hidden Gem' : '', dist != null ? `${dist.toFixed(dist < 10 ? 1 : 0)} mi` : ''].filter(Boolean).join(' · ');
  let periods: number[][] = [];
  try { periods = JSON.parse(String(p.periods || '[]')); } catch { /* ignore */ }
  const html = `<div class="llg-pop">
    <a class="llg-pop-name" href="/r/${esc(String(p.slug))}">${esc(String(p.name))}</a>
    <div class="llg-pop-status">${pillHtml(periods, Number(p.open24) === 1)}</div>
    <div class="llg-pop-meta">${meta}</div>
    ${p.blurb ? `<p class="llg-pop-blurb">${esc(String(p.blurb))}</p>` : ''}
    <div class="llg-pop-btns">
      <a class="llg-pop-view" href="/r/${esc(String(p.slug))}">View</a>
      <a class="llg-pop-dir" href="${directionsUrl({ lat, lng }, apple)}" target="_blank" rel="noopener">Directions</a>
    </div></div>`;
  new maplibregl.Popup({ offset: 14, maxWidth: '260px', className: 'llg-popup' })
    .setLngLat([lng, lat]).setHTML(html).addTo(m);
}

function flyToSlug(m: maplibregl.Map, pins: MapPin[], slug: string) {
  const p = pins.find((x) => x.slug === slug);
  if (!p) return;
  m.flyTo({ center: [p.lng, p.lat], zoom: 15 });
  const html = `<div class="llg-pop"><a class="llg-pop-name" href="/r/${p.slug}">${esc(p.name)}</a>
    <div class="llg-pop-status">${pillHtml(p.periods, p.open24)}</div>
    <div class="llg-pop-meta">${esc(p.cat)}</div>
    <div class="llg-pop-btns"><a class="llg-pop-view" href="/r/${p.slug}">View</a>
    <a class="llg-pop-dir" href="${directionsUrl(p, isApple())}" target="_blank" rel="noopener">Directions</a></div></div>`;
  new maplibregl.Popup({ offset: 14, maxWidth: '260px', className: 'llg-popup' }).setLngLat([p.lng, p.lat]).setHTML(html).addTo(m);
}
