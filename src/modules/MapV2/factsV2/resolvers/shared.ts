import { Feature, Polygon, MultiPolygon } from 'geojson';
import { Answer, ANSWER, Region, ResolvedLatLon } from '../factTypes';
import { differencePolygons, intersectPolygons } from '../../../../utils/geoUtils';

/** [lon, lat] numeric pair from a spec ResolvedLatLon (lat/lon travel as strings). */
export const toLngLat = (p: ResolvedLatLon): number[] => [parseFloat(p.lon), parseFloat(p.lat)];

/**
 * op_meta's LENGTH slots (`distance`, `radius`) are stored in metres — see
 * "Ask to Fact"'s own op_meta table ("distance (metres)", "radius
 * (metres)") — but every turf helper in geoUtils.ts (`getCirclePolygon`,
 * `buffer`, `pointToLineDistance`) works in kilometres. This is the one
 * conversion point; do it here, not inline at each call site, since it's
 * exactly the ambiguity "Ask to Fact"'s own "Still to settle" section flags
 * between metres-by-convention and the SubOp Atlas's *_KM naming. Only the
 * two op_meta-*supplied* lengths need this — the two *derived* ones
 * (LinePointBufferInside's d, PointPointBufferInside's radius) come out of
 * calculateDistance()/pointToLineDistance() already in kilometres.
 */
export const metersToKm = (metres: number): number => metres / 1000;

export type InsideOutsideAnswer = typeof ANSWER.INSIDE | typeof ANSWER.OUTSIDE;

/**
 * Every INSIDE/OUTSIDE-family op ends the same way: keep the raw shape, or
 * keep the universe minus it. One place for that so the resolver classes
 * don't each reimplement the flip.
 */
export const keepInsideOrOutside = (
  raw: Feature<Polygon | MultiPolygon>,
  answer: InsideOutsideAnswer,
  universe: Feature<Polygon | MultiPolygon>,
): Feature<Polygon | MultiPolygon> =>
  answer === ANSWER.INSIDE ? intersectPolygons(universe, raw) : differencePolygons(universe, raw);

/**
 * Base class every SubOp resolver extends. A resolver is constructed from
 * one Fact's already-resolved slots (`meta`) and its already-resolved
 * `answer` (assertedAnswer flipped by `value`, done once in factToRegion's
 * dispatch in resolveClue.ts) — a resolver never sees assertedAnswer/value
 * directly.
 */
export abstract class SubOpResolver<TMeta> implements Region {
  constructor(protected readonly meta: TMeta, protected readonly answer: Answer) {}
  abstract contains(p: number[]): boolean;
  abstract toPolygon(universe: Feature<Polygon | MultiPolygon>): Feature<Polygon | MultiPolygon>;
}
