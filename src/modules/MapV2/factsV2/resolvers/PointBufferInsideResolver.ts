import { Feature, Polygon, MultiPolygon } from 'geojson';
import { ANSWER, PointBufferInsideMeta } from '../factTypes';
import { calculateDistance, getCirclePolygon } from '../../../../utils/geoUtils';
import { InsideOutsideAnswer, keepInsideOrOutside, metersToKm, SubOpResolver, toLngLat } from './shared';

/** FAMILY — DISTANCE THRESHOLD: a circle around a point at a supplied radius. */
export class PointBufferInsideResolver extends SubOpResolver<PointBufferInsideMeta> {
  contains(p: number[]): boolean {
    const raw = calculateDistance(p, toLngLat(this.meta.point)) <= metersToKm(this.meta.radius);
    return this.answer === ANSWER.INSIDE ? raw : !raw;
  }

  toPolygon(universe: Feature<Polygon | MultiPolygon>) {
    const disc = getCirclePolygon(toLngLat(this.meta.point), metersToKm(this.meta.radius));
    return keepInsideOrOutside(disc, this.answer as InsideOutsideAnswer, universe);
  }
}
