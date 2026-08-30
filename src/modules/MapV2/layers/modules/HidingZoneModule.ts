import { Feature } from 'geojson';
import maplibregl from 'maplibre-gl';
import { getCirclePolygon } from '../../../../utils/geoUtils';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { GROUP_ID } from '../groupIds';

export interface HidingZoneItem {
  id: string;
  point: [number, number];
  /** Metres. */
  radius: number;
}

const MODULE_ID = 'hiding-zone';
const SOURCE_ID = 'hiding-zone-source';
const COLOR = '#B78CFF';

/**
 * Renders a hider's own locally-saved hiding zone (useHidingZone.ts) — a
 * faint fill plus a dashed outline at the saved radius, and a low-opacity
 * center point. At most one item ever (the currently-saved zone, or none).
 */
export class HidingZoneModule extends GeoJsonLayerModule<HidingZoneItem> {
  readonly id = MODULE_ID;
  readonly groupId = GROUP_ID.HIDING_ZONE;
  readonly label = 'My hiding zone';

  sourceId(): string {
    return SOURCE_ID;
  }

  addLayers(map: maplibregl.Map): void {
    map.addSource(this.sourceId(), { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: 'hiding-zone-fill',
      type: 'fill',
      source: this.sourceId(),
      paint: { 'fill-color': COLOR, 'fill-opacity': 0.1 },
    });

    map.addLayer({
      id: 'hiding-zone-outline',
      type: 'line',
      source: this.sourceId(),
      paint: { 'line-color': COLOR, 'line-width': 2, 'line-dasharray': [2, 2] },
    });

    map.addLayer({
      id: 'hiding-zone-center',
      type: 'circle',
      source: this.sourceId(),
      paint: {
        'circle-radius': 6,
        'circle-color': COLOR,
        'circle-opacity': 0.2,
      },
    });
  }

  toFeatures(item: HidingZoneItem): Feature[] {
    const circle = getCirclePolygon(item.point, item.radius / 1000);
    return [
      { type: 'Feature', geometry: circle.geometry, properties: {} },
      { type: 'Feature', geometry: { type: 'Point', coordinates: item.point }, properties: {} },
    ];
  }
}
