import { Feature, MultiPolygon, Polygon } from 'geojson';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { GROUP_ID } from '../groupIds';

export interface WizardShapeItem {
  id: string;
  geometry: Polygon | MultiPolygon;
}

export interface WizardShapePreviewConfig {
  /** Must be unique on the map — two flows showing a raw-shape preview at
   * once (the ask-question wizard's details step, the answer-questions
   * flow's new pre-answer step) each need their own id/source/layers, or
   * the second to mount would collide with the first's MapLibre source. */
  id: string;
  label: string;
  color: string;
}

/**
 * A plain "here's the shape you're describing" overlay — the raw region (a
 * circle, a zone's own boundary, a hotter/colder half-plane) clipped only
 * to the play area, before any folding against other facts. Originally the
 * ask-question wizard's details-step preview; also used by the
 * answer-questions flow's shape step, each with a distinct config so
 * they're separate map layers even if somehow both were mounted at once.
 *
 * Deliberately a different visual from the review/answer step's amber
 * possible-area preview (FactsLayerModule via WIZARD_PREVIEW_MODULE_ID /
 * ANSWER_PREVIEW_MODULE_ID), which shows what stays possible *after*
 * reducing against everything else — this one only ever answers "what does
 * a 500m circle around this point look like," nothing more.
 */
export class WizardShapePreviewModule extends GeoJsonLayerModule<WizardShapeItem> {
  readonly id: string;
  readonly groupId = GROUP_ID.FACTS;
  readonly label: string;

  constructor(private readonly config: WizardShapePreviewConfig) {
    super();
    this.id = config.id;
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
      paint: { 'fill-color': this.config.color, 'fill-opacity': 0.22 },
    });

    map.addLayer({
      id: `${this.config.id}-outline`,
      type: 'line',
      source: this.sourceId(),
      paint: { 'line-color': this.config.color, 'line-width': 2, 'line-dasharray': [2, 2] },
    });
  }

  toFeatures(item: WizardShapeItem): Feature[] {
    return [{ type: 'Feature', geometry: item.geometry, properties: {} }];
  }
}
