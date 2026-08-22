import { Feature } from 'geojson';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { GROUP_ID } from '../groupIds';

export interface PreviewItem {
  id: 'preview';
  coordinates: [number, number];
}

const MODULE_ID = 'point-preview';
const SOURCE_ID = 'point-preview-source';

/**
 * Capability #4 — Point Preview. The one module driven imperatively rather
 * than by a prop-derived item list, because a preview is transient — hover,
 * a hypothetical answer, "what would this look like". It's still a
 * GeoJsonLayerModule underneath; preview()/clear() are convenience wrappers
 * over setItems(). Call previewModule.preview([lon, lat]) from anywhere —
 * a hover handler, a placeholder picker — with no new source and no new
 * effect in the map canvas.
 */
export class PointPreviewModule extends GeoJsonLayerModule<PreviewItem> {
  readonly id = MODULE_ID;
  readonly groupId = GROUP_ID.PREVIEW;
  readonly label = 'Point Preview';

  sourceId(): string {
    return SOURCE_ID;
  }

  addLayers(map: maplibregl.Map): void {
    map.addSource(this.sourceId(), { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: 'point-preview-ring',
      type: 'circle',
      source: this.sourceId(),
      paint: {
        'circle-radius': 14,
        'circle-color': 'transparent',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#4CAF50',
      },
    });

    map.addLayer({
      id: 'point-preview-dot',
      type: 'circle',
      source: this.sourceId(),
      paint: {
        'circle-radius': 5,
        'circle-color': '#4CAF50',
        'circle-opacity': 0.85,
      },
    });
  }

  toFeatures(item: PreviewItem): Feature[] {
    return [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: item.coordinates },
      properties: {},
    }];
  }

  preview(coordinates: [number, number]): void {
    this.setItems([{ id: 'preview', coordinates }]);
  }

  clear(): void {
    this.setItems([]);
  }
}
