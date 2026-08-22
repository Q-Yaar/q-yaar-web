import { Feature, Polygon, MultiPolygon } from 'geojson';
import {
  Answer,
  OPPOSITE,
  OP_TYPE,
  FactDto,
  GeometryRegistries,
  Region,
  LineBufferInsideMeta,
  LinePointBufferInsideMeta,
  PolygonInsideMeta,
  PointBufferInsideMeta,
  PointPointBufferInsideMeta,
  PointSplitMeta,
  TwoPointBisectorMeta,
} from './factTypes';
import { globalWorld } from '../../../utils/geoUtils';
import {
  LineBufferInsideResolver,
  LinePointBufferInsideResolver,
  PolygonInsideResolver,
  PointBufferInsideResolver,
  PointPointBufferInsideResolver,
  PointSplitResolver,
  TwoPointBisectorResolver,
} from './resolvers';

/**
 * Dispatch — the only place that knows op_type -> resolver class. Mirrors
 * "Ask to Fact" stage 5's `factToRegion`: resolves ANSWER from
 * assertedAnswer + value once, then hands the rest of op_meta to the
 * matching resolver (one file per SubOp under resolvers/). Adding an
 * eighth SubOp means one new file there and one new case here — nowhere
 * else.
 */
export function factToRegion(fact: FactDto, registries: GeometryRegistries): Region {
  const { op_type, op_meta } = fact.fact_info;
  const { assertedAnswer, value, ...slots } = op_meta as Record<string, unknown> & {
    assertedAnswer: Answer;
    value: boolean;
  };
  const answer: Answer = value ? assertedAnswer : OPPOSITE[assertedAnswer];

  switch (op_type) {
    case OP_TYPE.LINE_BUFFER_INSIDE:
      return new LineBufferInsideResolver(slots as unknown as LineBufferInsideMeta, answer, registries.lines);
    case OP_TYPE.LINE_POINT_BUFFER_INSIDE:
      return new LinePointBufferInsideResolver(slots as unknown as LinePointBufferInsideMeta, answer, registries.lines);
    case OP_TYPE.POLYGON_INSIDE:
      return new PolygonInsideResolver(slots as unknown as PolygonInsideMeta, answer, registries.polygons);
    case OP_TYPE.POINT_BUFFER_INSIDE:
      return new PointBufferInsideResolver(slots as unknown as PointBufferInsideMeta, answer);
    case OP_TYPE.POINT_POINT_BUFFER_INSIDE:
      return new PointPointBufferInsideResolver(slots as unknown as PointPointBufferInsideMeta, answer);
    case OP_TYPE.POINT_SPLIT:
      return new PointSplitResolver(slots as unknown as PointSplitMeta, answer);
    case OP_TYPE.TWO_POINT_BISECTOR:
      return new TwoPointBisectorResolver(slots as unknown as TwoPointBisectorMeta, answer);
    default: {
      const _exhaustive: never = op_type;
      throw new Error(`Unknown op_type: ${_exhaustive}`);
    }
  }
}

/**
 * Fold a list of loaded Facts down into one map-ready area, the same shape
 * `computeHiderArea` produces for the live drawing tools in the old Map.
 */
export function computeFactsArea(
  playArea: Feature<Polygon | MultiPolygon>,
  facts: FactDto[],
  registries: GeometryRegistries,
): Feature<Polygon | MultiPolygon> {
  return facts.reduce<Feature<Polygon | MultiPolygon>>(
    (area, fact) => factToRegion(fact, registries).toPolygon(area),
    playArea ?? globalWorld,
  );
}

/**
 * The cheap path from "Ask to Fact" stage 5 — a hundred predicate checks,
 * never a hundred polygon constructions. Useful once you're testing
 * candidate hider locations against every known fact.
 */
export function isConsistent(candidate: number[], facts: FactDto[], registries: GeometryRegistries): boolean {
  return facts.every((f) => factToRegion(f, registries).contains(candidate));
}
