// Mirrors src/utils/geoWorkerWrapper.ts's pattern exactly: a real Worker in
// the browser, wrapped with comlink; a synchronous fallback (still async
// from the caller's perspective, via Promise.resolve) for SSR/tests, or if
// the Worker constructor itself throws.
import { wrap } from 'comlink';
import { Feature, LineString, MultiPolygon, Polygon } from 'geojson';
import { FactDto, GeometryRegistries, OP_TYPE, RegistryEntry } from './factTypes';
import { getLine, getPolygon } from './geometryAssets';

interface MapV2GeoWorkerAPI {
  mergeRegistries: (partial: Partial<GeometryRegistries>) => Promise<void>;
  foldFactsArea: (
    playArea: Feature<Polygon | MultiPolygon>,
    facts: FactDto[],
  ) => Promise<Feature<Polygon | MultiPolygon>>;
  resolveShading: (
    universe: Feature<Polygon | MultiPolygon>,
    facts: FactDto[],
  ) => Promise<Feature<Polygon | MultiPolygon> | null>;
}

async function buildFallback(): Promise<MapV2GeoWorkerAPI> {
  const { computeFactsArea } = await import('./resolveClue');
  const { differencePolygons } = await import('../../../utils/geoUtils');
  const cachedRegistries: GeometryRegistries = { polygons: {}, lines: {} };

  const foldFactsArea = (playArea: Feature<Polygon | MultiPolygon>, facts: FactDto[]) =>
    computeFactsArea(playArea, facts, cachedRegistries);

  return {
    mergeRegistries: async (partial) => {
      Object.assign(cachedRegistries.polygons, partial.polygons ?? {});
      Object.assign(cachedRegistries.lines, partial.lines ?? {});
    },
    foldFactsArea: async (playArea, facts) => foldFactsArea(playArea, facts),
    resolveShading: async (universe, facts) => {
      const remaining = foldFactsArea(universe, facts);
      const shaded = differencePolygons(universe, remaining);
      return shaded.geometry.coordinates.length === 0 ? null : shaded;
    },
  };
}

let workerPromise: Promise<MapV2GeoWorkerAPI> | null = null;

async function getMapV2GeoWorker(): Promise<MapV2GeoWorkerAPI> {
  if (!workerPromise) {
    if (typeof window !== 'undefined') {
      try {
        const worker = new Worker(new URL('./geoWorker.ts', import.meta.url));
        workerPromise = Promise.resolve(wrap<MapV2GeoWorkerAPI>(worker));
      } catch (err) {
        console.warn('[MapV2] Could not start geo worker, falling back to main-thread resolution:', err);
        workerPromise = buildFallback();
      }
    } else {
      workerPromise = buildFallback();
    }
  }
  return workerPromise;
}

/** Which polygon/line registry keys a batch of facts actually reference —
 * skipping anything carrying an inline `geometry` override (that escape
 * hatch means the fact never touches the registry at all) and every
 * op_type that has no registry slot to begin with. */
function extractRegistryKeys(facts: FactDto[]): { polygonKeys: Set<string>; lineKeys: Set<string> } {
  const polygonKeys = new Set<string>();
  const lineKeys = new Set<string>();
  for (const fact of facts) {
    const { op_type, op_meta } = fact.fact_info;
    if (op_meta.geometry) continue;
    if (op_type === OP_TYPE.POLYGON_INSIDE && typeof op_meta.polygon === 'string') {
      polygonKeys.add(op_meta.polygon);
    } else if (
      (op_type === OP_TYPE.LINE_BUFFER_INSIDE || op_type === OP_TYPE.LINE_POINT_BUFFER_INSIDE) &&
      typeof op_meta.line === 'string'
    ) {
      lineKeys.add(op_meta.line);
    }
  }
  return { polygonKeys, lineKeys };
}

/**
 * Resolves (lazily, cached — see geometryAssets.ts) just the registry keys
 * this batch of facts references, then merges them into the worker's cache.
 * Called before every fold/shading call below rather than once up front:
 * there's no single "geometry finished loading" moment any more, and a key
 * already merged in is a no-op here (getPolygon/getLine's own cache makes
 * this cheap even when called on every render).
 */
async function ensureFactRegistriesHydrated(facts: FactDto[]): Promise<void> {
  const { polygonKeys, lineKeys } = extractRegistryKeys(facts);
  if (polygonKeys.size === 0 && lineKeys.size === 0) return;

  const polygons: Record<string, RegistryEntry<Polygon | MultiPolygon>> = {};
  const lines: Record<string, RegistryEntry<LineString>> = {};
  await Promise.all([
    ...Array.from(polygonKeys, async (key) => {
      const entry = await getPolygon(key);
      if (entry) polygons[key] = entry;
    }),
    ...Array.from(lineKeys, async (key) => {
      const entry = await getLine(key);
      if (entry) lines[key] = entry;
    }),
  ]);

  const worker = await getMapV2GeoWorker();
  await worker.mergeRegistries({ polygons, lines });
}

export async function foldFactsAreaInWorker(
  playArea: Feature<Polygon | MultiPolygon>,
  facts: FactDto[],
): Promise<Feature<Polygon | MultiPolygon>> {
  await ensureFactRegistriesHydrated(facts);
  const worker = await getMapV2GeoWorker();
  return worker.foldFactsArea(playArea, facts);
}

export async function resolveShadingInWorker(
  universe: Feature<Polygon | MultiPolygon>,
  facts: FactDto[],
): Promise<Feature<Polygon | MultiPolygon> | null> {
  await ensureFactRegistriesHydrated(facts);
  const worker = await getMapV2GeoWorker();
  return worker.resolveShading(universe, facts);
}
