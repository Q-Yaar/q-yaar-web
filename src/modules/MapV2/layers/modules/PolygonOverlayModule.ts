import { Feature, MultiPolygon, Polygon } from 'geojson';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { GROUP_ID } from '../groupIds';

export interface PolygonOverlayItem {
  id: string;
  registryKey: string;
  displayName: string;
  geometry: Polygon | MultiPolygon;
}

export const POLYGON_OVERLAY_MODULE_ID = 'polygon-overlays';
const SOURCE_ID = 'polygon-overlay-source';

const PALETTE = ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac', '#f06292'];

const colorFor = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};

/**
 * Capability #2 — Registry Polygons as overlays. Items are named boundaries
 * pulled straight from the same registry the FactsV2 resolvers use for
 * POLYGON_INSIDE facts ({ registryKey, displayName, geometry }); each is
 * independently toggleable, off by default — the map opens uncluttered,
 * and a zone is switched on one at a time from the Zones sheet rather than
 * every corporation/metro-catchment boundary being drawn at once.
 */
export class PolygonOverlayModule extends GeoJsonLayerModule<PolygonOverlayItem> {
  readonly id = POLYGON_OVERLAY_MODULE_ID;
  readonly groupId = GROUP_ID.OVERLAYS;
  readonly label = 'Registry Polygons';

  protected defaultItemVisible(): boolean {
    return false;
  }

  sourceId(): string {
    return SOURCE_ID;
  }

  addLayers(map: maplibregl.Map): void {
    map.addSource(this.sourceId(), { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: 'polygon-overlay-fill',
      type: 'fill',
      source: this.sourceId(),
      paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.35 },
    });

    map.addLayer({
      id: 'polygon-overlay-outline',
      type: 'line',
      source: this.sourceId(),
      paint: { 'line-color': ['get', 'fillColor'], 'line-width': 2 },
    });
  }

  toFeatures(item: PolygonOverlayItem): Feature[] {
    return [{
      type: 'Feature',
      geometry: item.geometry,
      properties: {
        id: item.id,
        displayName: item.displayName,
        registryKey: item.registryKey,
        fillColor: colorFor(item.id),
      },
    }];
  }
}
