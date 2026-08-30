import { Feature } from 'geojson';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { GROUP_ID } from '../groupIds';

export interface PlayerLocationItem {
  id: string;
  coordinates: [number, number];
  playerName: string;
  lastSeen: string;
}

const MODULE_ID = 'player-locations';
const SOURCE_ID = 'player-locations-source';

/**
 * One marker per player with a live-location ping, styled to match the old
 * Map page exactly (src/components/Map.tsx's all-points/
 * player-location-labels layers) — a fixed teal dot (no per-team coloring,
 * no accuracy circle; v1 draws neither despite LocationPing carrying
 * `accuracy`) plus a name + relative "last seen" label underneath. Fed by
 * hooks/usePlayerLocations.ts, which polls the same real
 * GET /live-location/games/:id/ endpoint v1 uses, on the same 30s interval.
 */
export class PlayerLocationsModule extends GeoJsonLayerModule<PlayerLocationItem> {
  readonly id = MODULE_ID;
  readonly groupId = GROUP_ID.PLAYER_LOCATIONS;
  readonly label = 'Player locations';

  sourceId(): string {
    return SOURCE_ID;
  }

  addLayers(map: maplibregl.Map): void {
    map.addSource(this.sourceId(), { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: 'player-locations-circle',
      type: 'circle',
      source: this.sourceId(),
      paint: {
        'circle-radius': 8,
        'circle-color': '#009688',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    map.addLayer({
      id: 'player-locations-label',
      type: 'symbol',
      source: this.sourceId(),
      layout: {
        'text-field': ['concat', ['get', 'playerName'], '\n', ['get', 'lastSeen']],
        'text-font': ['Noto Sans Bold'],
        'text-size': 11,
        'text-offset': [0, 1.6],
        'text-anchor': 'top',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#009688',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });
  }

  toFeatures(item: PlayerLocationItem): Feature[] {
    return [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: item.coordinates },
      properties: { playerName: item.playerName, lastSeen: item.lastSeen },
    }];
  }
}
