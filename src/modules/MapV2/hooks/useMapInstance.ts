import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol as PMTilesProtocol } from 'pmtiles';
import { MapLayerRegistry } from '../layers/MapLayerRegistry';
import { MAP_STYLE_URL } from '../theme';
import { MAP_ASSETS } from '../assets';

// Registered once per page load (module scope), mirroring the guard in the
// existing components/Map.tsx — calling addProtocol twice for the same
// protocol id is harmless but redundant, so both places skip it.
let pmtilesRegistered = false;
function ensurePmtilesProtocol(): void {
  if (pmtilesRegistered) return;
  const protocol = new PMTilesProtocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  pmtilesRegistered = true;
}

interface UseMapInstanceOptions {
  registry: MapLayerRegistry;
  center?: [number, number];
  zoom?: number;
}

interface UseMapInstanceResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.RefObject<maplibregl.Map | null>;
  isMapReady: boolean;
}

/**
 * Map lifecycle only: create the MapLibre instance, add controls, watch for
 * container resizes, load the transit overlay, and hand the map instance to
 * the layer registry once it's ready. Knows nothing about layer modules
 * beyond registry.setMap(map) — every module's own addLayers() runs from
 * there, on whatever modules had already registered by the time 'load'
 * fires.
 */
export function useMapInstance({
  registry,
  center = [77.591, 12.979],
  zoom = 10,
}: UseMapInstanceOptions): UseMapInstanceResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    ensurePmtilesProtocol();
    if (!containerRef.current) return;

    const container = containerRef.current;
    const m = new maplibregl.Map({
      container,
      style: MAP_STYLE_URL,
      center,
      zoom,
    });
    mapRef.current = m;

    m.addControl(new maplibregl.NavigationControl(), 'top-right');
    const geolocateControl = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: false,
    });
    m.addControl(geolocateControl, 'top-right');

    const resizeObserver = new ResizeObserver(() => m.resize());
    resizeObserver.observe(container);

    m.on('load', () => {
      // Game area boundary — added directly to the map, not through a
      // GeoJsonLayerModule, so it never appears in the layer tree and has
      // no group/module/item visibility path that could hide it.
      fetch(MAP_ASSETS.bengaluruUrbanDistrict)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load game area: ${res.status}`);
          return res.json();
        })
        .then((geojson) => {
          m.addSource('game-area-source', { type: 'geojson', data: geojson });
          m.addLayer({
            id: 'game-area-outline',
            type: 'line',
            source: 'game-area-source',
            layout: { 'line-join': 'round' },
            paint: { 'line-color': '#FFC043', 'line-width': 2.5, 'line-dasharray': [3, 2] },
          });
        })
        .catch((err) => console.warn('[MapV2] Could not load game area boundary:', err));

      // Transit overlay (PMTiles) — same asset and style file the old Map
      // uses, loaded the same way.
      m.addSource('transit-pmtiles', { type: 'vector', url: `pmtiles://${MAP_ASSETS.transitPmtiles()}` });

      fetch(MAP_ASSETS.transitStyle)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load transit-style.json: ${res.status}`);
          return res.json();
        })
        .then((layers: maplibregl.LayerSpecification[]) => {
          layers.forEach((layer) => {
            if ((layer as { source?: string }).source === 'transit-pmtiles' && !m.getLayer(layer.id)) {
              m.addLayer(layer);
            }
          });
        })
        .catch((err) => console.warn('[MapV2] Could not load transit overlay:', err));

      registry.setMap(m);
      setIsMapReady(true);
    });

    m.on('error', (e) => console.error('[MapV2] Map error:', e));

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current === m) mapRef.current = null;
      m.remove();
    };
    // Map is created once per mount; registry/center/zoom are expected stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, mapRef, isMapReady };
}
