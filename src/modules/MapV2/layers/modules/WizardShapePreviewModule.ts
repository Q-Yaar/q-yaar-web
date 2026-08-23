import { Feature, MultiPolygon, Polygon } from 'geojson';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { GROUP_ID } from '../groupIds';

export interface WizardShapeItem {
  id: string;
  geometry: Polygon | MultiPolygon;
}

const MODULE_ID = 'wizard-shape-preview';
const SOURCE_ID = 'wizard-shape-preview-source';

/**
 * A plain "here's the shape you're describing" overlay for the wizard's
 * details step — the raw region (a circle, a zone's own boundary, a
 * hotter/colder half-plane) clipped only to the play area, before any
 * folding against other facts. Shows the moment enough fields exist to
 * compute it (e.g. the instant a radius chip is tapped), so composing a
 * question gives immediate visual feedback rather than waiting for review.
 *
 * Deliberately a different visual from the review step's amber
 * possible-area preview (FactsLayerModule via WIZARD_PREVIEW_MODULE_ID),
 * which shows what stays possible *after* reducing against everything
 * else — this one only ever answers "what does a 500m circle around this
 * point look like," nothing more.
 */
export class WizardShapePreviewModule extends GeoJsonLayerModule<WizardShapeItem> {
  readonly id = MODULE_ID;
  readonly groupId = GROUP_ID.FACTS;
  readonly label = 'Question shape preview';

  sourceId(): string {
    return SOURCE_ID;
  }

  addLayers(map: maplibregl.Map): void {
    map.addSource(this.sourceId(), { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: 'wizard-shape-preview-fill',
      type: 'fill',
      source: this.sourceId(),
      paint: { 'fill-color': '#22D3EE', 'fill-opacity': 0.22 },
    });

    map.addLayer({
      id: 'wizard-shape-preview-outline',
      type: 'line',
      source: this.sourceId(),
      paint: { 'line-color': '#22D3EE', 'line-width': 2, 'line-dasharray': [2, 2] },
    });
  }

  toFeatures(item: WizardShapeItem): Feature[] {
    return [{ type: 'Feature', geometry: item.geometry, properties: {} }];
  }
}
