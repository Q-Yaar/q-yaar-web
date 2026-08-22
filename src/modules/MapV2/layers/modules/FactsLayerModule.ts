import { Feature, MultiPolygon, Polygon } from 'geojson';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { FactDto, GeometryRegistries } from '../../factsV2/factTypes';
import { computeFactsArea } from '../../factsV2/resolveClue';
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

  constructor(
    private readonly config: FactsLayerConfig,
    private readonly registries: GeometryRegistries,
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

  extraFeatures(visibleItems: FactItem[]): Feature[] {
    if (visibleItems.length === 0) return [];

    const universe = this.universe();
    let remaining: Feature<Polygon | MultiPolygon>;
    try {
      remaining = computeFactsArea(universe, visibleItems.map((item) => item.fact), this.registries);
    } catch (err) {
      console.warn(`[${this.config.id}] could not fold visible facts into an area`, err);
      return [];
    }

    const shaded = differencePolygons(universe, remaining);
    if (shaded.geometry.coordinates.length === 0) return [];

    return [{
      ...shaded,
      properties: { ...shaded.properties, kind: 'shading' },
    }];
  }
}
