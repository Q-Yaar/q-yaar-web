import { useEffect, useRef, useState } from 'react';
import { Feature, LineString, MultiPolygon, Polygon } from 'geojson';
import { GeometryRegistries } from './factTypes';
import { globalWorld } from '../../../utils/geoUtils';
import { CORPORATION_ASSET_URLS, MAP_ASSETS, METRO_LINE_ASSET_URLS, METRO_LINE_REGION_ASSET_URLS } from '../assets';

export const REGION_KIND = {
  CORPORATION: 'corporation',
  METRO_CATCHMENT: 'metro_catchment',
} as const;

export type RegionKind = (typeof REGION_KIND)[keyof typeof REGION_KIND];

export interface PolygonOverlayItemData {
  id: string;
  registryKey: string;
  displayName: string;
  kind: RegionKind;
  geometry: Polygon | MultiPolygon;
}

export interface MetroLineItemData {
  id: string;
  lineKey: string;
  displayName: string;
  color?: string;
  geometry: LineString;
}

interface LoadedGeometry {
  registries: GeometryRegistries;
  polygonItems: PolygonOverlayItemData[];
  lineItems: MetroLineItemData[];
  playArea: Feature<Polygon | MultiPolygon>;
}

/**
 * Backend doesn't serve named registries yet, so one GeoJSON file per
 * region (CORPORATION_ASSET_URLS / METRO_LINE_ASSET_URLS /
 * METRO_LINE_REGION_ASSET_URLS from assets.ts) stands in for
 * POLYGON_REGISTRY / LINE_REGISTRY from "Ask to Fact": corporation
 * boundaries, metro-line regions (the "catchments are the trick" collapse —
 * same POLYGON_INSIDE op as corporations), and the metro route lines
 * themselves. Each map's key *is* its registry key.
 */
async function loadGeometry(): Promise<LoadedGeometry> {
  const registries: GeometryRegistries = { polygons: {}, lines: {} };
  const polygonItems: PolygonOverlayItemData[] = [];
  const lineItems: MetroLineItemData[] = [];

  for (const [key, url] of Object.entries(CORPORATION_ASSET_URLS)) {
    const feature = (await fetch(url).then((r) => r.json())) as Feature<Polygon | MultiPolygon>;
    const displayName: string = feature.properties?.name ?? key;
    registries.polygons[key] = { display_name: displayName, geometry: feature.geometry };
    polygonItems.push({ id: key, registryKey: key, displayName, kind: REGION_KIND.CORPORATION, geometry: feature.geometry });
  }

  for (const [key, url] of Object.entries(METRO_LINE_ASSET_URLS)) {
    const feature = (await fetch(url).then((r) => r.json())) as Feature<LineString>;
    const displayName = `${feature.properties?.ref ?? key} Line`;
    registries.lines[key] = { display_name: displayName, geometry: feature.geometry };
    lineItems.push({ id: key, lineKey: key, displayName, color: feature.properties?.colour, geometry: feature.geometry });
  }

  for (const [key, url] of Object.entries(METRO_LINE_REGION_ASSET_URLS)) {
    const feature = (await fetch(url).then((r) => r.json())) as Feature<Polygon | MultiPolygon>;
    const displayName = `${feature.properties?.name ?? key} region`;
    registries.polygons[key] = { display_name: displayName, geometry: feature.geometry };
    polygonItems.push({ id: key, registryKey: key, displayName, kind: REGION_KIND.METRO_CATCHMENT, geometry: feature.geometry });
  }

  const playAreaGeoJson = await fetch(MAP_ASSETS.bengaluruUrbanDistrict).then((r) => r.json());

  return {
    registries,
    polygonItems,
    lineItems,
    playArea: playAreaGeoJson.type === 'Feature' ? playAreaGeoJson : { type: 'Feature', geometry: playAreaGeoJson, properties: {} },
  };
}

let cachedPromise: Promise<LoadedGeometry> | null = null;

export interface GeometryRegistriesResult {
  /** Referentially stable for the component's lifetime — populated in
   * place once loadGeometry() resolves, so a FactsLayerModule constructed
   * against it on first render transparently sees the loaded data once
   * `loading` flips (as long as its item list is re-set after that, which
   * MapCanvas does by withholding real items while loading is true). */
  registries: GeometryRegistries;
  polygonItems: PolygonOverlayItemData[];
  lineItems: MetroLineItemData[];
  playArea: Feature<Polygon | MultiPolygon>;
  loading: boolean;
}

/**
 * Loads the mock registries once per page load (module-level cache) and
 * exposes them to whichever component builds PolygonOverlayModule,
 * MetroLinesModule, and FactsLayerModule items.
 */
export function useGeometryRegistries(): GeometryRegistriesResult {
  const registriesRef = useRef<GeometryRegistries>({ polygons: {}, lines: {} });
  const [polygonItems, setPolygonItems] = useState<PolygonOverlayItemData[]>([]);
  const [lineItems, setLineItems] = useState<MetroLineItemData[]>([]);
  const [playArea, setPlayArea] = useState<Feature<Polygon | MultiPolygon>>(globalWorld);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!cachedPromise) cachedPromise = loadGeometry();
    cachedPromise
      .then((loaded) => {
        if (cancelled) return;
        Object.assign(registriesRef.current.polygons, loaded.registries.polygons);
        Object.assign(registriesRef.current.lines, loaded.registries.lines);
        setPolygonItems(loaded.polygonItems);
        setLineItems(loaded.lineItems);
        setPlayArea(loaded.playArea);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[MapV2] Failed to load geometry registries', err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { registries: registriesRef.current, polygonItems, lineItems, playArea, loading };
}
