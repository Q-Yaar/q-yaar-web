import { Feature, Polygon, MultiPolygon } from 'geojson';
import { booleanPointInPolygon, point as turfPoint } from '@turf/turf';
import { ANSWER, Answer, GeometryRegistries, PolygonInsideMeta } from '../factTypes';
import { InsideOutsideAnswer, keepInsideOrOutside, SubOpResolver } from './shared';

/** FAMILY — AREA CONTAINMENT: the registry polygon as given, no buffering. */
export class PolygonInsideResolver extends SubOpResolver<PolygonInsideMeta> {
  constructor(meta: PolygonInsideMeta, answer: Answer, private readonly polygons: GeometryRegistries['polygons']) {
    super(meta, answer);
  }

  private polygon(): Feature<Polygon | MultiPolygon> {
    if (this.meta.geometry) return { type: 'Feature', geometry: this.meta.geometry, properties: {} };
    const entry = this.polygons[this.meta.polygon];
    if (!entry) throw new Error(`Unknown polygon registry key: ${this.meta.polygon}`);
    return { type: 'Feature', geometry: entry.geometry, properties: {} };
  }

  contains(p: number[]): boolean {
    const raw = booleanPointInPolygon(turfPoint(p), this.polygon());
    return this.answer === ANSWER.INSIDE ? raw : !raw;
  }

  toPolygon(universe: Feature<Polygon | MultiPolygon>) {
    return keepInsideOrOutside(this.polygon(), this.answer as InsideOutsideAnswer, universe);
  }
}
