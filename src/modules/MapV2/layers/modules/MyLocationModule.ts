import { Feature, Polygon } from 'geojson';
import maplibregl from 'maplibre-gl';
import { circle as turfCircle, sector } from '@turf/turf';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { GROUP_ID } from '../groupIds';

export interface MyLocationItem {
  id: string;
  coordinates: [number, number];
  /** GPS accuracy radius, metres — drawn as a real-world circle (like
   * PointsDistanceModule's range rings), not a fixed screen-pixel one, so it
   * actually shrinks/grows with the fix instead of just being decorative. */
  accuracyM: number;
  /** Compass heading, degrees clockwise from true north — null until a
   * usable one has actually arrived (see hooks/useSelfLocation.ts), in
   * which case only the dot (no cone) is drawn. */
  headingDeg: number | null;
}

const MODULE_ID = 'my-location';
const SOURCE_ID = 'my-location-source';
/** Blue, distinct from PlayerLocationsModule's teal — this dot means "me",
 * every other dot on the map means "a player". */
const COLOR = '#1a73e8';
/** How wide the heading cone spans, centered on the reported heading —
 * narrow enough to read as "this direction", wide enough to stay legible
 * given a phone compass's real-world jitter. */
const HEADING_CONE_WIDTH_DEG = 50;
const HEADING_CONE_RADIUS_KM = 0.03;
/** A very precise fix (a few metres) would otherwise draw an
 * imperceptibly small accuracy ring — floored so it always reads as a real
 * circle, not a rounding error. */
const MIN_ACCURACY_M = 5;

/**
 * This device's own persistent "you are here" marker — a dot plus, once a
 * compass heading is known, a cone showing which way it's facing. Neither
 * MapLibre's own GeolocateControl (useMapInstance.ts, left in place purely
 * as a manual "jump to my location" button) nor this MapLibre GL JS version
 * draws a heading indicator at all, so this is a from-scratch module rather
 * than a wrapper around it. Fed by hooks/useSelfLocation.ts's continuous
 * watchPosition + deviceorientation tracking, permission-gated there, not
 * here. Always exactly zero or one item ("me").
 */
export class MyLocationModule extends GeoJsonLayerModule<MyLocationItem> {
  readonly id = MODULE_ID;
  readonly groupId = GROUP_ID.MY_LOCATION;
  readonly label = 'My location';

  sourceId(): string {
    return SOURCE_ID;
  }

  addLayers(map: maplibregl.Map): void {
    map.addSource(this.sourceId(), { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    // Declared in back-to-front order — accuracy ring, then heading cone,
    // then the dot on top — since MapLibre draws same-source layers in the
    // order they were added.
    map.addLayer({
      id: 'my-location-accuracy',
      type: 'fill',
      source: this.sourceId(),
      filter: ['==', ['get', 'kind'], 'accuracy'],
      paint: { 'fill-color': COLOR, 'fill-opacity': 0.12 },
    });

    map.addLayer({
      id: 'my-location-heading-cone',
      type: 'fill',
      source: this.sourceId(),
      filter: ['==', ['get', 'kind'], 'heading'],
      paint: { 'fill-color': COLOR, 'fill-opacity': 0.35 },
    });

    map.addLayer({
      id: 'my-location-dot',
      type: 'circle',
      source: this.sourceId(),
      filter: ['==', ['get', 'kind'], 'dot'],
      paint: {
        'circle-radius': 7,
        'circle-color': COLOR,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });
  }

  toFeatures(item: MyLocationItem): Feature[] {
    const accuracyKm = Math.max(item.accuracyM, MIN_ACCURACY_M) / 1000;
    const features: Feature[] = [{
      type: 'Feature',
      geometry: (turfCircle(item.coordinates, accuracyKm, { steps: 64, units: 'kilometers' }) as Feature<Polygon>).geometry,
      properties: { kind: 'accuracy' },
    }];

    if (item.headingDeg !== null) {
      const halfWidth = HEADING_CONE_WIDTH_DEG / 2;
      features.push({
        type: 'Feature',
        geometry: sector(
          item.coordinates,
          HEADING_CONE_RADIUS_KM,
          item.headingDeg - halfWidth,
          item.headingDeg + halfWidth,
          { steps: 32, units: 'kilometers' },
        ).geometry,
        properties: { kind: 'heading' },
      });
    }

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: item.coordinates },
      properties: { kind: 'dot' },
    });

    return features;
  }
}
