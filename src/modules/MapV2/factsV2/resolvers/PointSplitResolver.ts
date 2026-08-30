import { Feature, Polygon, MultiPolygon } from 'geojson';
import { ANSWER, PointSplitMeta } from '../factTypes';
import { getSplitByDirectionPolygon } from '../../../../utils/geoUtils';
import { SubOpResolver, toLngLat } from './shared';

type CardinalAnswer = typeof ANSWER.NORTH | typeof ANSWER.SOUTH | typeof ANSWER.EAST | typeof ANSWER.WEST;

const CARDINAL_TO_DIRECTION: Record<CardinalAnswer, 'North' | 'South' | 'East' | 'West'> = {
  [ANSWER.NORTH]: 'North', [ANSWER.SOUTH]: 'South', [ANSWER.EAST]: 'East', [ANSWER.WEST]: 'West',
};

/** FAMILY — DIVIDING LINE: a parallel or meridian through the point, no buffer at all. */
export class PointSplitResolver extends SubOpResolver<PointSplitMeta> {
  contains(p: number[]): boolean {
    const [lon, lat] = toLngLat(this.meta.point);
    if (this.answer === ANSWER.NORTH) return p[1] >= lat;
    if (this.answer === ANSWER.SOUTH) return p[1] <= lat;
    if (this.answer === ANSWER.EAST) return p[0] >= lon;
    if (this.answer === ANSWER.WEST) return p[0] <= lon;
    return false;
  }

  toPolygon(universe: Feature<Polygon | MultiPolygon>) {
    const pointFeature = {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: toLngLat(this.meta.point) },
      properties: {},
    };
    const direction = CARDINAL_TO_DIRECTION[this.answer as CardinalAnswer];
    return getSplitByDirectionPolygon(pointFeature, direction, universe);
  }
}
