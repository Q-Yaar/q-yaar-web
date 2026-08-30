// Web Worker for MapV2's fact-region resolution. Offloads the turf-heavy
// parts of computeFactsArea()/differencePolygons() — run against real,
// many-vertex registry polygons (Bengaluru corporation boundaries) and
// chained once per confirmed fact — off the main thread, the same reason
// src/utils/geoWorker.ts exists for the old Map's drawing tools. Kept
// separate from that one: different API shape (FactDto/resolver-based, not
// op_type strings), and MapV2 doesn't touch old code.
import { expose } from 'comlink';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import { computeFactsArea } from './resolveClue';
import { FactDto, GeometryRegistries } from './factTypes';
import { differencePolygons } from '../../../utils/geoUtils';

// Merged into (never replaced) via mergeRegistries() — see
// geoWorkerClient.ts, which fetches only the specific registry keys a batch
// of facts actually references (lazily, on the main thread, where the
// fetch+cache lives) and sends just those over before every fold/shading
// call. A key merged in once is never re-sent.
let cachedRegistries: GeometryRegistries = { polygons: {}, lines: {} };

function mergeRegistries(partial: Partial<GeometryRegistries>): void {
  Object.assign(cachedRegistries.polygons, partial.polygons ?? {});
  Object.assign(cachedRegistries.lines, partial.lines ?? {});
}

/** The cumulative fold "Ask to Fact" describes for testing candidate hider
 * locations: start from `playArea`, intersect/difference each fact's
 * region in, in order. Used both for the confirmed-facts area Draft Facts
 * start from (useFactsLayers.ts) and, composed with a difference below,
 * for what a FactsLayerModule actually draws. */
function foldFactsArea(playArea: Feature<Polygon | MultiPolygon>, facts: FactDto[]): Feature<Polygon | MultiPolygon> {
  return computeFactsArea(playArea, facts, cachedRegistries);
}

/** What FactsLayerModule.render() draws: fold every visible fact down to
 * whatever "possible area" remains, then shade everything that *isn't* in
 * it. Returns null for an empty result (nothing left to shade), matching
 * FactsLayerModule's own empty-geometry check. */
function resolveShading(universe: Feature<Polygon | MultiPolygon>, facts: FactDto[]): Feature<Polygon | MultiPolygon> | null {
  const remaining = foldFactsArea(universe, facts);
  const shaded = differencePolygons(universe, remaining);
  return shaded.geometry.coordinates.length === 0 ? null : shaded;
}

expose({ mergeRegistries, foldFactsArea, resolveShading });
