import { Feature, LineString } from 'geojson';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { GROUP_ID } from '../groupIds';

export interface MetroLineItem {
  id: string;
  lineKey: string;
  displayName: string;
  color?: string;
  geometry: LineString;
}

const MODULE_ID = 'metro-lines';
const SOURCE_ID = 'metro-lines-source';

/**
 * Capability #3 — Metro Lines. Structurally identical to
 * PolygonOverlayModule: items are { lineKey, geometry: LineString },
 * addLayers adds a line layer instead of fill. Same group (overlays),
 * sibling module — the pattern doesn't get more complex as more modules
 * join a group.
 */
export class MetroLinesModule extends GeoJsonLayerModule<MetroLineItem> {
  readonly id = MODULE_ID;
  readonly groupId = GROUP_ID.OVERLAYS;
  readonly label = 'Metro Lines';

  sourceId(): string {
    return SOURCE_ID;
  }

  addLayers(map: maplibregl.Map): void {
    map.addSource(this.sourceId(), { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: 'metro-lines-line',
      type: 'line',
      source: this.sourceId(),
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#9b9b9b'],
        'line-width': 5,
      },
    });
  }

  toFeatures(item: MetroLineItem): Feature[] {
    return [{
      type: 'Feature',
      geometry: item.geometry,
      properties: { id: item.id, displayName: item.displayName, color: item.color },
    }];
  }
}
