import { Feature } from 'geojson';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { GROUP_ID } from '../groupIds';

export interface WizardPointItem {
  id: string;
  coordinates: [number, number];
  label: string;
}

const MODULE_ID = 'wizard-points';
const SOURCE_ID = 'wizard-points-source';

/**
 * Marks the actual point(s) the draft-fact wizard is currently using — a
 * circle's center, or hotter/colder's two points — the moment each is
 * picked, not just the shaded region they produce. Lives in the
 * Measurement group (always on, per the current "measurement stays visible"
 * rule) rather than Facts, since these are picking aids, not facts
 * themselves, and shouldn't disappear if a user hides Facts mid-wizard.
 */
export class WizardPointsModule extends GeoJsonLayerModule<WizardPointItem> {
  readonly id = MODULE_ID;
  readonly groupId = GROUP_ID.MEASUREMENT;
  readonly label = 'Question points';

  sourceId(): string {
    return SOURCE_ID;
  }

  addLayers(map: maplibregl.Map): void {
    map.addSource(this.sourceId(), { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: 'wizard-points-circle',
      type: 'circle',
      source: this.sourceId(),
      paint: {
        'circle-radius': 7,
        'circle-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFC043',
      },
    });

    map.addLayer({
      id: 'wizard-points-label',
      type: 'symbol',
      source: this.sourceId(),
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 11,
        'text-offset': [0, -1.6],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#FFC043',
        'text-halo-color': '#000000',
        'text-halo-width': 1.5,
      },
    });
  }

  toFeatures(item: WizardPointItem): Feature[] {
    return [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: item.coordinates },
      properties: { label: item.label },
    }];
  }
}
