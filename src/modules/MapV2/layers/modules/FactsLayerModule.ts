import { Feature, MultiPolygon, Polygon } from 'geojson';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { FactDto } from '../../factsV2/factTypes';
import { computeFactsArea } from '../../factsV2/resolveClue';
import { resolveShadingInWorker } from '../../factsV2/geoWorkerClient';
import { getCachedRegistriesSnapshot } from '../../factsV2/geometryAssets';
import { differencePolygons } from '../../../../utils/geoUtils';

export interface FactItem {
  id: string;
  fact: FactDto;
}

export interface FactsLayerConfig {
  id: string;
  groupId: string;
  label: string;
  fillColor: string;
  fillOpacity: number;
  dashed?: boolean;
}

/**
 * Capabilities #5 and #6 — Draft Facts and Facts. Not one tinted polygon per
 * fact: every currently-visible fact is folded, in order, from this
 * module's starting universe down to whatever "possible area" remains
 * (computeFactsArea — the same reduce "Ask to Fact" describes for testing
 * candidate hider locations), and the shading drawn is everything that
 * *isn't* in that remaining area. Add a fact, the possible area shrinks and
 * the dark region grows; hide one via its item checkbox and the area grows
 * back. DraftFactsLayerModule is this same class constructed with a
 * different id/groupId/label, dashed/lower-opacity styling, and — set up in
 * MapCanvas — a `universe` that starts from the Facts module's remaining
 * area rather than the raw game zone, so drafts reduce further on top of
 * whatever's already confirmed.
 */
export class FactsLayerModule extends GeoJsonLayerModule<FactItem> {
  readonly id: string;
  readonly groupId: string;
  readonly label: string;

  private factIndex = new Map<string, FactDto>();
  /** Bumped on every render() call; a worker response only gets written if
   * it's still the most recent one requested — a fast second toggle can't
   * have its result overwritten by a slower first one resolving late. */
  private renderGeneration = 0;

  constructor(
    private readonly config: FactsLayerConfig,
    private readonly universe: () => Feature<Polygon | MultiPolygon>,
  ) {
    super();
    this.id = config.id;
    this.groupId = config.groupId;
    this.label = config.label;
  }

  sourceId(): string {
    return `${this.config.id}-source`;
  }

  addLayers(map: maplibregl.Map): void {
    map.addSource(this.sourceId(), { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: `${this.config.id}-fill`,
      type: 'fill',
      source: this.sourceId(),
      paint: { 'fill-color': this.config.fillColor, 'fill-opacity': this.config.fillOpacity },
      filter: ['==', ['get', 'kind'], 'shading'],
    });

    map.addLayer({
      id: `${this.config.id}-outline`,
      type: 'line',
      source: this.sourceId(),
      paint: {
        'line-color': this.config.fillColor,
        'line-width': this.config.dashed ? 2 : 1.5,
        ...(this.config.dashed ? { 'line-dasharray': [2, 2] } : {}),
      },
      filter: ['==', ['get', 'kind'], 'shading'],
    });
  }

  /** Keep a factId -> FactDto index alongside the base item map, since
   * MapLibre's GeoJSON source flattens feature properties to primitives —
   * a click handler recovers the full FactDto (for the FactsV2 popup) via
   * getFact(), not from the rendered feature's properties. */
  setItems(items: FactItem[]): void {
    this.factIndex = new Map(items.map((item) => [item.id, item.fact]));
    super.setItems(items);
  }

  getFact(factId: string): FactDto | undefined {
    return this.factIndex.get(factId);
  }

  /** No per-item feature — the whole rendered shape is a single
   * whole-set fold, built in extraFeatures(). */
  toFeatures(): Feature[] {
    return [];
  }

  /** Synchronous fallback path — used by render()'s catch handler if the
   * worker fails, so the map isn't left blank. Same fold+difference the
   * worker runs, just on this thread, against whatever registry keys
   * happen to already be cached (getCachedRegistriesSnapshot) — it can't
   * await a lazy fetch mid-render, so a key nothing's asked for yet simply
   * isn't there, same as an empty registry always behaved. */
  extraFeatures(visibleItems: FactItem[]): Feature[] {
    if (visibleItems.length === 0) return [];

    const universe = this.universe();
    let remaining: Feature<Polygon | MultiPolygon>;
    try {
      remaining = computeFactsArea(universe, visibleItems.map((item) => item.fact), getCachedRegistriesSnapshot());
    } catch (err) {
      console.warn(`[${this.config.id}] could not fold visible facts into an area`, err);
      return [];
    }

    const shaded = differencePolygons(universe, remaining);
    return shaded.geometry.coordinates.length === 0 ? [] : [this.tagShading(shaded)];
  }

  private tagShading(shaded: Feature<Polygon | MultiPolygon>): Feature {
    return { ...shaded, properties: { ...shaded.properties, kind: 'shading' } };
  }

  /**
   * Overrides the base class's synchronous render() — folding every
   * visible fact and differencing the result runs turf intersect/
   * difference against real, many-vertex registry polygons, which is
   * exactly the work src/modules/MapV2/factsV2/geoWorker.ts exists to keep
   * off the main thread. toFeatures()/extraFeatures() stay as the
   * synchronous fallback (used by super.render(), called below if the
   * worker call fails), so this is the only method that changes.
   */
  render(): void {
    const generation = ++this.renderGeneration;
    const visibleItems = this.effectiveItems();

    if (visibleItems.length === 0) {
      this.writeFeatures([]);
      return;
    }

    const universe = this.universe();
    resolveShadingInWorker(universe, visibleItems.map((item) => item.fact))
      .then((shaded) => {
        if (generation !== this.renderGeneration) return; // superseded by a newer render() call
        this.writeFeatures(shaded ? [this.tagShading(shaded)] : []);
      })
      .catch((err) => {
        console.warn(`[${this.config.id}] worker shading failed, falling back to main thread`, err);
        if (generation === this.renderGeneration) super.render();
      });
  }
}
