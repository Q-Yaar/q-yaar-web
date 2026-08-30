import { useEffect, useState } from 'react';
import { Feature, LineString, MultiPolygon, Polygon } from 'geojson';
import { GeometryRegistries, RegistryEntry } from './factTypes';
import { globalWorld } from '../../../utils/geoUtils';
import { CORPORATION_ASSET_URLS, MAP_ASSETS, METRO_LINE_ASSET_URLS, METRO_LINE_REGION_ASSET_URLS } from '../assets';
import { normalizePlayArea } from '../utils/geo';

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

/**
 * Backend doesn't serve named registries yet, so one GeoJSON file per
 * region (CORPORATION_ASSET_URLS / METRO_LINE_ASSET_URLS /
 * METRO_LINE_REGION_ASSET_URLS from assets.ts) stands in for
 * POLYGON_REGISTRY / LINE_REGISTRY from "Ask to Fact". Each map's key *is*
 * its registry key — which is enough to know a key *exists* (POLYGON_CATALOG
 * below) without ever fetching anything; only resolving one key's actual
 * geometry requires a fetch, and that's lazy (getPolygon/getLine) and
 * cached, so the map only pays for the specific regions something on
 * screen actually references — never all of them just because the page
 * loaded. Only the play area (below) is fetched eagerly: it's the universe
 * every fold starts from, needed the moment the map itself is ready.
 */
const POLYGON_SOURCES: Record<string, { url: string; kind: RegionKind }> = {
  ...Object.fromEntries(
    Object.entries(CORPORATION_ASSET_URLS).map(([key, url]) => [key, { url, kind: REGION_KIND.CORPORATION }]),
  ),
  ...Object.fromEntries(
    Object.entries(METRO_LINE_REGION_ASSET_URLS).map(([key, url]) => [key, { url, kind: REGION_KIND.METRO_CATCHMENT }]),
  ),
};

/** Every polygon registry key that exists, known statically (from assets.ts)
 * without fetching anything — for consumers that need the full catalog of
 * *available* zones (the Registry Polygons overlay, the wizard's zone
 * picker) before any one zone's geometry has actually been loaded. */
export const POLYGON_CATALOG: { key: string; kind: RegionKind }[] = Object.entries(POLYGON_SOURCES).map(
  ([key, { kind }]) => ({ key, kind }),
);

async function fetchPolygonEntry(key: string): Promise<RegistryEntry<Polygon | MultiPolygon> | undefined> {
  const source = POLYGON_SOURCES[key];
  if (!source) return undefined;
  const feature = (await fetch(source.url).then((r) => r.json())) as Feature<Polygon | MultiPolygon>;
  const displayName =
    source.kind === REGION_KIND.CORPORATION
      ? (feature.properties?.name ?? key)
      : `${feature.properties?.name ?? key} region`;
  return { display_name: displayName, geometry: feature.geometry };
}

async function fetchLineEntry(key: string): Promise<RegistryEntry<LineString> | undefined> {
  const url = METRO_LINE_ASSET_URLS[key];
  if (!url) return undefined;
  const feature = (await fetch(url).then((r) => r.json())) as Feature<LineString>;
  return { display_name: `${feature.properties?.ref ?? key} Line`, geometry: feature.geometry };
}

// Module-level, shared for the page's whole lifetime: a key fetched once
// (for a fact's resolver, the overlay module, the wizard...) from anywhere
// is never fetched again, and concurrent callers for the same in-flight key
// share one request instead of issuing two.
const polygonPromiseCache = new Map<string, Promise<RegistryEntry<Polygon | MultiPolygon> | undefined>>();
const polygonResolvedCache = new Map<string, RegistryEntry<Polygon | MultiPolygon>>();
const linePromiseCache = new Map<string, Promise<RegistryEntry<LineString> | undefined>>();
const lineResolvedCache = new Map<string, RegistryEntry<LineString>>();

/** The only way any named polygon's geometry is ever fetched — on demand,
 * by key, cached. */
export function getPolygon(key: string): Promise<RegistryEntry<Polygon | MultiPolygon> | undefined> {
  let cached = polygonPromiseCache.get(key);
  if (!cached) {
    cached = fetchPolygonEntry(key).then((entry) => {
      if (entry) polygonResolvedCache.set(key, entry);
      return entry;
    });
    polygonPromiseCache.set(key, cached);
  }
  return cached;
}

/** Same as getPolygon(), for the (small) line registry. */
export function getLine(key: string): Promise<RegistryEntry<LineString> | undefined> {
  let cached = linePromiseCache.get(key);
  if (!cached) {
    cached = fetchLineEntry(key).then((entry) => {
      if (entry) lineResolvedCache.set(key, entry);
      return entry;
    });
    linePromiseCache.set(key, cached);
  }
  return cached;
}

/**
 * Best-effort synchronous snapshot of whatever's already resolved — used
 * only by FactsLayerModule's main-thread fallback path (triggered if the
 * worker call itself fails), which can't await a fetch mid-render. A key
 * not yet resolved is simply absent, same as an unpopulated registry was
 * before any of this existed; the resolver throws the same "unknown
 * registry key" error it always has.
 */
export function getCachedRegistriesSnapshot(): GeometryRegistries {
  return {
    polygons: Object.fromEntries(polygonResolvedCache),
    lines: Object.fromEntries(lineResolvedCache),
  };
}

export interface PlayAreaResult {
  playArea: Feature<Polygon | MultiPolygon>;
  /** True only until the play area itself loads — corporation/metro
   * geometry is never part of this gate. */
  loading: boolean;
}

let playAreaPromise: Promise<Feature<Polygon | MultiPolygon>> | null = null;

async function loadPlayArea(): Promise<Feature<Polygon | MultiPolygon>> {
  const geojson = await fetch(MAP_ASSETS.bengaluruUrbanDistrict).then((r) => r.json());
  return normalizePlayArea(geojson);
}

/** Loads *only* the play area eagerly — it's the universe every fold starts
 * from, needed the moment the map is ready. Every other named region is
 * fetched lazily by key (getPolygon/getLine above) wherever it's actually
 * needed, never as part of this hook. */
export function usePlayArea(): PlayAreaResult {
  const [playArea, setPlayArea] = useState<Feature<Polygon | MultiPolygon>>(globalWorld);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!playAreaPromise) playAreaPromise = loadPlayArea();
    playAreaPromise
      .then((area) => {
        if (cancelled) return;
        setPlayArea(area);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[MapV2] Failed to load play area', err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { playArea, loading };
}

export interface PolygonCatalogResult {
  items: PolygonOverlayItemData[];
  loading: boolean;
}

/**
 * Fetches every known polygon's geometry in the background — via the same
 * lazy, cached getPolygon() everything else uses, so nothing here is
 * fetched twice just because two consumers both wanted the full catalog —
 * for the two places that genuinely need *all* of them: the Registry
 * Polygons overlay module (draws every boundary at once when toggled on)
 * and the wizard's zone picker (lists every zone by name in a dropdown).
 * Runs independently of usePlayArea()'s `loading`, so it never blocks the
 * map or fact rendering from becoming usable.
 */
export function usePolygonCatalog(): PolygonCatalogResult {
  const [items, setItems] = useState<PolygonOverlayItemData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      POLYGON_CATALOG.map(async ({ key, kind }) => {
        const entry = await getPolygon(key);
        if (!entry) return null;
        return { id: key, registryKey: key, displayName: entry.display_name, kind, geometry: entry.geometry } satisfies PolygonOverlayItemData;
      }),
    ).then((results) => {
      if (cancelled) return;
      setItems(results.filter((r): r is PolygonOverlayItemData => r !== null));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading };
}
