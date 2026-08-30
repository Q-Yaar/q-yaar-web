import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol as PMTilesProtocol } from 'pmtiles';
import { MapLayerRegistry } from '../layers/MapLayerRegistry';
import { MAP_HEADER_HEIGHT_PX, MAP_STYLE_URL } from '../theme';
import { MAP_ASSETS } from '../assets';
import { normalizePlayArea } from '../utils/geo';
import { differencePolygons, globalWorld } from '../../../utils/geoUtils';

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

    // TopBar floats over the map now (see TopBar.tsx) rather than pushing
    // it down, so MapLibre's own top-right zoom/geolocate buttons need a
    // manual push clear of it — otherwise they'd render right under the
    // Zones icon button.
    const topRightControls = container.querySelector<HTMLElement>('.maplibregl-ctrl-top-right');
    if (topRightControls) {
      topRightControls.style.marginTop = `calc(${MAP_HEADER_HEIGHT_PX}px + env(safe-area-inset-top))`;
    }

    const resizeObserver = new ResizeObserver(() => m.resize());
    resizeObserver.observe(container);

    m.on('load', () => {
      // Game area boundary — added directly to the map, not through a
      // GeoJsonLayerModule, so it never appears in the layer tree and has
      // no group/module/item visibility path that could hide it. Everything
      // outside it is excluded from the start (shaded unconditionally,
      // before any fact is ever applied) — Facts/Draft Facts shading only
      // ever has to account for reductions *within* this zone.
      fetch(MAP_ASSETS.bengaluruUrbanDistrict)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load game area: ${res.status}`);
          return res.json();
        })
        .then((geojson) => {
          const gameZone = normalizePlayArea(geojson);
          const outsideGameZone = differencePolygons(globalWorld, gameZone);

          m.addSource('game-area-exterior-source', { type: 'geojson', data: outsideGameZone });
          m.addLayer({
            id: 'game-area-exterior-fill',
            type: 'fill',
            source: 'game-area-exterior-source',
            paint: { 'fill-color': '#000000', 'fill-opacity': 0.4 },
          });

          m.addSource('game-area-source', { type: 'geojson', data: gameZone });
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
      // uses, loaded the same way. Source points at the local PMTiles
      // archive; the pmtiles protocol reads the archive header to derive
      // min/max zoom, so we use `url:` (not `tiles:`). Layers are defined
      // in public/transit-style.json (all reference the 'transit-pmtiles'
      // source) so the style lives in a data file rather than inline here.
      //
      // The old Map explicitly inserts these layers *before* its
      // shading-fill layer so facts render over the transit lines, not
      // under them. Every module here adds its own layers synchronously
      // inside registry.setMap() below, so the only way to keep transit
      // beneath all of them — without hardcoding some other module's layer
      // id as an anchor — is to finish loading transit first: awaited
      // (not fire-and-forget), so whether it succeeds or fails, it's
      // fully settled before any module layer exists to race against.
      const loadTransitOverlay = async (): Promise<void> => {
        try {
          m.addSource('transit-pmtiles', { type: 'vector', url: `pmtiles://${MAP_ASSETS.transitPmtiles()}` });
          const res = await fetch(MAP_ASSETS.transitStyle);
          if (!res.ok) throw new Error(`Failed to load transit-style.json: ${res.status}`);
          const layers = (await res.json()) as maplibregl.LayerSpecification[];
          layers.forEach((layer) => {
            if ((layer as { source?: string }).source === 'transit-pmtiles' && !m.getLayer(layer.id)) {
              m.addLayer(layer);
            }
          });
        } catch (err) {
          console.warn('[MapV2] Could not load transit overlay:', err);
        }
      };

      loadTransitOverlay().finally(() => {
        registry.setMap(m);
        setIsMapReady(true);
      });
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
