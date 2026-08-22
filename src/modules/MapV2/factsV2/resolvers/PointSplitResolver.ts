import { Feature, Polygon, MultiPolygon } from 'geojson';
import { ANSWER, PointSplitMeta } from '../factTypes';
import { getSplitByDirectionPolygon } from '../../../../utils/geoUtils';
import { SubOpResolver, toLngLat } from './shared';

type CardinalAnswer = typeof ANSWER.N | typeof ANSWER.S | typeof ANSWER.E | typeof ANSWER.W;

const CARDINAL_TO_DIRECTION: Record<CardinalAnswer, 'North' | 'South' | 'East' | 'West'> = {
  [ANSWER.N]: 'North', [ANSWER.S]: 'South', [ANSWER.E]: 'East', [ANSWER.W]: 'West',
};

/** FAMILY — DIVIDING LINE: a parallel or meridian through the point, no buffer at all. */
export class PointSplitResolver extends SubOpResolver<PointSplitMeta> {
  contains(p: number[]): boolean {
    const [lon, lat] = toLngLat(this.meta.point);
    if (this.answer === ANSWER.N) return p[1] >= lat;
    if (this.answer === ANSWER.S) return p[1] <= lat;
    if (this.answer === ANSWER.E) return p[0] >= lon;
    if (this.answer === ANSWER.W) return p[0] <= lon;
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
