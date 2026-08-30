import { Feature, Polygon, MultiPolygon } from 'geojson';
import { ANSWER, PointPointBufferInsideMeta } from '../factTypes';
import { calculateDistance, getCirclePolygon } from '../../../../utils/geoUtils';
import { InsideOutsideAnswer, keepInsideOrOutside, SubOpResolver, toLngLat } from './shared';

/**
 * FAMILY — DISTANCE THRESHOLD. Point-anchored twin of
 * LinePointBufferInsideResolver: radius is measured to a second point, not
 * a line.
 */
export class PointPointBufferInsideResolver extends SubOpResolver<PointPointBufferInsideMeta> {
  private radiusKm(): number {
    return calculateDistance(toLngLat(this.meta.anchor), toLngLat(this.meta.point));
  }

  contains(p: number[]): boolean {
    const raw = calculateDistance(p, toLngLat(this.meta.anchor)) <= this.radiusKm();
    return this.answer === ANSWER.INSIDE ? raw : !raw;
  }

  toPolygon(universe: Feature<Polygon | MultiPolygon>) {
    const disc = getCirclePolygon(toLngLat(this.meta.anchor), this.radiusKm());
    return keepInsideOrOutside(disc, this.answer as InsideOutsideAnswer, universe);
  }
}
