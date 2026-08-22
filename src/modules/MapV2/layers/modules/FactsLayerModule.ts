import { Feature, MultiPolygon, Polygon } from 'geojson';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { FactDto, GeometryRegistries } from '../../factsV2/factTypes';
import { factToRegion } from '../../factsV2/resolveClue';

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
 * Capabilities #5 and #6 — Draft Facts and Facts. Both consume factToRegion
 * from the SubOp resolver work — the resolver classes don't change at all,
 * they just become this module's per-item renderer. DraftFactsLayerModule
 * is this same class constructed with a different id/groupId/label and
 * dashed/lower-opacity styling to distinguish unconfirmed constraints; the
 * geometry resolution is identical either way.
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

  toFeatures({ fact }: FactItem): Feature[] {
    let polygon: Feature<Polygon | MultiPolygon>;
    try {
      polygon = factToRegion(fact, this.registries).toPolygon(this.universe());
    } catch (err) {
      console.warn(`[${this.config.id}] could not resolve region for fact ${fact.fact_id}`, err);
      return [];
    }
    return [{
      ...polygon,
      properties: {
        ...polygon.properties,
        factId: fact.fact_id,
        opType: fact.fact_info.op_type,
      },
    }];
  }
}
