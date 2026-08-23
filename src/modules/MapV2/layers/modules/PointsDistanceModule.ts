import { Feature, LineString, Point, Polygon } from 'geojson';
import { bearing, circle as turfCircle, destination, midpoint as turfMidpoint } from '@turf/turf';
import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from '../GeoJsonLayerModule';
import { GROUP_ID } from '../groupIds';
import { calculateDistance } from '../../../../utils/geoUtils';

export interface PointDistanceItem {
  id: string;
  coordinates: [number, number];
}

const LINE_COLOR = '#28351e';

const MODULE_ID = 'points-distance';
const SOURCE_ID = 'points-distance-source';

/** Feature `kind` tags this module writes and filters on — internal to
 * this module's own source, so no other module needs to know them. */
const FEATURE_KIND = {
  POINT: 'point',
  RING: 'ring',
  RING_LABEL: 'ring-label',
  CROSSHAIR: 'crosshair',
  DIAMETER_CIRCLE: 'diameter-circle',
  PERPENDICULAR: 'perpendicular',
  CONNECTOR: 'connector',
  DISTANCE_LABEL: 'distance-label',
} as const;

const RING_DISTANCES_KM: { km: number; label: string }[] = [
  { km: 0.5, label: '500 m' },
  { km: 1, label: '1 km' },
  { km: 5, label: '5 km' },
];

/** Half of the perpendicular bisector's total length — 50 km each way, so
 * it reads as a long reference line across the map regardless of how far
 * apart the two measured points actually are. */
const PERPENDICULAR_HALF_LENGTH_KM = 500;

/**
 * Capability #1 — Points & Distance. A single placed point draws its own
 * light dotted range rings at 500 m / 1 km / 5 km plus a north-south /
 * east-west crosshair through it, so a lone tap already gives a sense of
 * scale and orientation. Once a second point is added, those give way to
 * the pairwise guides instead: a dotted connecting line and distance
 * label, a long dashed perpendicular bisector through their midpoint, and
 * a dotted circle with both points on its circumference — reusing
 * calculateDistance from geoUtils.ts rather than reimplementing it.
 */
export class PointsDistanceModule extends GeoJsonLayerModule<PointDistanceItem> {
  readonly id = MODULE_ID;
  readonly groupId = GROUP_ID.MEASUREMENT;
  readonly label = 'Points & Distance';

  sourceId(): string {
    return SOURCE_ID;
  }

  addLayers(map: maplibregl.Map): void {
    map.addSource(this.sourceId(), { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    // Range rings first, so they sit under the connecting line/points.
    map.addLayer({
      id: 'points-distance-rings',
      type: 'line',
      source: this.sourceId(),
      paint: {
        'line-color': LINE_COLOR,
        'line-width': 1.5,
        'line-dasharray': [2, 3],
        'line-opacity': 0.35,
      },
      filter: ['==', ['get', 'kind'], FEATURE_KIND.RING],
    });

    map.addLayer({
      id: 'points-distance-ring-labels',
      type: 'symbol',
      source: this.sourceId(),
      layout: {
        'text-field': ['get', 'ringLabel'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': "#FFFFFF",
        'text-halo-color': '#000000',
        'text-halo-width': 1.5,
      },
      filter: ['==', ['get', 'kind'], FEATURE_KIND.RING_LABEL],
    });

    map.addLayer({
      id: 'points-distance-crosshair',
      type: 'line',
      source: this.sourceId(),
      paint: {
        'line-color': LINE_COLOR,
        'line-width': 1.5,
        'line-dasharray': [2, 2],
        'line-opacity': 0.5,
      },
      filter: ['==', ['get', 'kind'], FEATURE_KIND.CROSSHAIR],
    });

    map.addLayer({
      id: 'points-distance-diameter-circle',
      type: 'line',
      source: this.sourceId(),
      paint: {
        'line-color': LINE_COLOR,
        'line-width': 1.5,
        'line-dasharray': [3, 2],
        'line-opacity': 0.3,
      },
      filter: ['==', ['get', 'kind'], FEATURE_KIND.DIAMETER_CIRCLE],
    });

    map.addLayer({
      id: 'points-distance-perpendicular',
      type: 'line',
      source: this.sourceId(),
      paint: { 'line-color': LINE_COLOR, 'line-width': 1, 'line-dasharray': [2, 2], },
      filter: ['==', ['get', 'kind'], FEATURE_KIND.PERPENDICULAR],
    });

    map.addLayer({
      id: 'points-distance-line',
      type: 'line',
      source: this.sourceId(),
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': LINE_COLOR, 'line-width': 2, 'line-dasharray': [2, 2] },
      filter: ['==', ['get', 'kind'], FEATURE_KIND.CONNECTOR],
    });

    map.addLayer({
      id: 'points-distance-label',
      type: 'symbol',
      source: this.sourceId(),
      layout: {
        'text-field': ['get', 'distance-text'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 14,
        'text-offset': [0, 1.5],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': "#FFFFFF",
        'text-halo-color': '#000000',
        'text-halo-width': 2,
      },
      filter: ['==', ['get', 'kind'], FEATURE_KIND.DISTANCE_LABEL],
    });

    map.addLayer({
      id: 'points-distance-points',
      type: 'circle',
      source: this.sourceId(),
      paint: {
        'circle-radius': 7,
        'circle-color': "#ffffff",
        'circle-stroke-width': 2,
        'circle-stroke-color': '#141414',
      },
      filter: ['==', ['get', 'kind'], FEATURE_KIND.POINT],
    });
  }

  toFeatures(item: PointDistanceItem): Feature[] {
    return [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: item.coordinates },
      properties: { id: item.id, kind: FEATURE_KIND.POINT },
    }];
  }

  extraFeatures(visibleItems: PointDistanceItem[]): Feature[] {
    if (visibleItems.length === 1) return this.rangeRingFeatures(visibleItems[0]);
    if (visibleItems.length !== 2) return [];

    const [a, b] = visibleItems;
    const distanceKm = calculateDistance(a.coordinates, b.coordinates);
    const distanceMeters = Math.round(distanceKm * 1000);
    const mid = turfMidpoint(a.coordinates, b.coordinates).geometry.coordinates as [number, number];

    const line: Feature<LineString> = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [a.coordinates, b.coordinates] },
      properties: { kind: FEATURE_KIND.CONNECTOR },
    };
    const label: Feature<Point> = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: mid },
      properties: { 'distance-text': `${distanceMeters} meters`, kind: FEATURE_KIND.DISTANCE_LABEL },
    };

    // A circle with the two points as the endpoints of its diameter.
    const halfLengthKm = distanceKm / 2;
    const diameterCircle = turfCircle(mid, halfLengthKm, { steps: 64, units: 'kilometers' }) as Feature<Polygon>;
    diameterCircle.properties = { kind: FEATURE_KIND.DIAMETER_CIRCLE };

    // Perpendicular bisector through the midpoint — a long fixed-length
    // guide line (independent of how far apart A and B actually are),
    // rather than one clipped to the diameter circle. `mid` is included as
    // its own middle vertex: a great-circle destination() in one bearing
    // and its exact opposite don't generally lie on a straight line back
    // through the origin (only true for due north/south), so a 2-point
    // segment between just the two ends can sag kilometers away from
    // `mid` — invisible zoomed out, glaringly off-center zoomed in.
    const perpendicularBearing = bearing(a.coordinates, b.coordinates) + 90;
    const perpendicular: Feature<LineString> = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          destination(mid, PERPENDICULAR_HALF_LENGTH_KM, perpendicularBearing, { units: 'kilometers' }).geometry.coordinates as [number, number],
          mid,
          destination(mid, PERPENDICULAR_HALF_LENGTH_KM, perpendicularBearing - 180, { units: 'kilometers' }).geometry.coordinates as [number, number],
        ],
      },
      properties: { kind: FEATURE_KIND.PERPENDICULAR },
    };

    return [line, label, perpendicular, diameterCircle];
  }

  private rangeRingFeatures(item: PointDistanceItem): Feature[] {
    const rings = RING_DISTANCES_KM.flatMap(({ km, label }): Feature[] => {
      const ring = turfCircle(item.coordinates, km, { steps: 64, units: 'kilometers' }) as Feature<Polygon>;
      ring.properties = { kind: FEATURE_KIND.RING, ringLabel: label };

      const labelPoint: Feature<Point> = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: destination(item.coordinates, km, 0, { units: 'kilometers' }).geometry.coordinates as [number, number],
        },
        properties: { kind: FEATURE_KIND.RING_LABEL, ringLabel: label },
      };

      return [ring, labelPoint];
    });

    // Two intersecting crosshair lines through the point — one north-south,
    // one east-west — the same fixed length as the perpendicular bisector.
    // item.coordinates is included as its own middle vertex for the same
    // reason as the perpendicular bisector above: the east-west line in
    // particular sags kilometers away from the point otherwise, since a
    // due-east/due-west great-circle destination pair's straight segment
    // doesn't pass back through the origin.
    const along = (bearingDeg: number, oppositeBearingDeg: number): Feature<LineString> => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          destination(item.coordinates, PERPENDICULAR_HALF_LENGTH_KM, bearingDeg, { units: 'kilometers' }).geometry.coordinates as [number, number],
          item.coordinates,
          destination(item.coordinates, PERPENDICULAR_HALF_LENGTH_KM, oppositeBearingDeg, { units: 'kilometers' }).geometry.coordinates as [number, number],
        ],
      },
      properties: { kind: FEATURE_KIND.CROSSHAIR },
    });
    const northSouth = along(0, 180);
    const eastWest = along(90, 270);

    return [...rings, northSouth, eastWest];
  }
}
