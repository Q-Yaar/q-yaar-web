import { Feature, LineString, Polygon, MultiPolygon } from 'geojson';
import { buffer, pointToLineDistance, point as turfPoint } from '@turf/turf';
import { ANSWER, Answer, GeometryRegistries, LinePointBufferInsideMeta } from '../factTypes';
import { InsideOutsideAnswer, keepInsideOrOutside, SubOpResolver, toLngLat } from './shared';

/** FAMILY — DISTANCE THRESHOLD: buffer a registry line at d = distance(point, line) — measured, never supplied. */
export class LinePointBufferInsideResolver extends SubOpResolver<LinePointBufferInsideMeta> {
  constructor(meta: LinePointBufferInsideMeta, answer: Answer, private readonly lines: GeometryRegistries['lines']) {
    super(meta, answer);
  }

  private line(): Feature<LineString> {
    if (this.meta.geometry) return { type: 'Feature', geometry: this.meta.geometry, properties: {} };
    const entry = this.lines[this.meta.line];
    if (!entry) throw new Error(`Unknown line registry key: ${this.meta.line}`);
    return { type: 'Feature', geometry: entry.geometry, properties: {} };
  }

  private distanceKm(): number {
    return pointToLineDistance(turfPoint(toLngLat(this.meta.point)), this.line(), { units: 'kilometers' });
  }

  contains(p: number[]): boolean {
    const d = pointToLineDistance(turfPoint(p), this.line(), { units: 'kilometers' });
    const raw = d <= this.distanceKm();
    return this.answer === ANSWER.INSIDE ? raw : !raw;
  }

  toPolygon(universe: Feature<Polygon | MultiPolygon>) {
    const band = buffer(this.line(), this.distanceKm(), { units: 'kilometers', steps: 64 }) as Feature<Polygon | MultiPolygon>;
    return keepInsideOrOutside(band, this.answer as InsideOutsideAnswer, universe);
  }
}
