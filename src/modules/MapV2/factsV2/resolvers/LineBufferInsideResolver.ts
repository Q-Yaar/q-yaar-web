import { Feature, LineString, Polygon, MultiPolygon } from 'geojson';
import { buffer, pointToLineDistance, point as turfPoint } from '@turf/turf';
import { ANSWER, Answer, GeometryRegistries, LineBufferInsideMeta } from '../factTypes';
import { InsideOutsideAnswer, keepInsideOrOutside, metersToKm, SubOpResolver } from './shared';

/** FAMILY — DISTANCE THRESHOLD: buffer a registry line at a supplied distance. */
export class LineBufferInsideResolver extends SubOpResolver<LineBufferInsideMeta> {
  constructor(meta: LineBufferInsideMeta, answer: Answer, private readonly lines: GeometryRegistries['lines']) {
    super(meta, answer);
  }

  private line(): Feature<LineString> {
    const entry = this.lines[this.meta.line];
    if (!entry) throw new Error(`Unknown line registry key: ${this.meta.line}`);
    return { type: 'Feature', geometry: entry.geometry, properties: {} };
  }

  contains(p: number[]): boolean {
    const d = pointToLineDistance(turfPoint(p), this.line(), { units: 'kilometers' });
    const raw = d <= metersToKm(this.meta.distance);
    return this.answer === ANSWER.INSIDE ? raw : !raw;
  }

  toPolygon(universe: Feature<Polygon | MultiPolygon>) {
    const band = buffer(this.line(), metersToKm(this.meta.distance), { units: 'kilometers', steps: 64 }) as Feature<Polygon | MultiPolygon>;
    return keepInsideOrOutside(band, this.answer as InsideOutsideAnswer, universe);
  }
}
