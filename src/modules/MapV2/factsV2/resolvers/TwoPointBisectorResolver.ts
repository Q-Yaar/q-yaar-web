import { Feature, Polygon, MultiPolygon } from 'geojson';
import { ANSWER, TwoPointBisectorMeta } from '../factTypes';
import { calculateDistance, differencePolygons, splitPolygonByTwoPoints } from '../../../../utils/geoUtils';
import { SubOpResolver, toLngLat } from './shared';

/** FAMILY — DIVIDING LINE: perpendicular bisector of two points, keep the half nearer one of them. */
export class TwoPointBisectorResolver extends SubOpResolver<TwoPointBisectorMeta> {
  contains(p: number[]): boolean {
    const point = toLngLat(this.meta.point);
    const pointFinal = toLngLat(this.meta.pointFinal);
    const kept = this.answer === ANSWER.HOTTER ? pointFinal : point;
    const other = this.answer === ANSWER.HOTTER ? point : pointFinal;
    return calculateDistance(p, kept) <= calculateDistance(p, other);
  }

  toPolygon(universe: Feature<Polygon | MultiPolygon>) {
    const p1 = toLngLat(this.meta.point);
    const p2 = toLngLat(this.meta.pointFinal);
    // splitPolygonByTwoPoints(p1, p2, preferredPoint, area) removes the side
    // AWAY from preferredPoint. HOTTER keeps the half nearer pointFinal (p2);
    // COLDER keeps the half nearer point (p1) — see SubOp Atlas.
    const preferredPoint: 'p1' | 'p2' = this.answer === ANSWER.HOTTER ? 'p2' : 'p1';
    const shadedAway = splitPolygonByTwoPoints(p1, p2, preferredPoint, universe);
    return differencePolygons(universe, shadedAway);
  }
}
