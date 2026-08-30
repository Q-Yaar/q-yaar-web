import { LineString, MultiPolygon, Polygon } from 'geojson';

/**
 * The seven SubOp contracts from "Ask to Fact". Each op_type declares which
 * slots it needs and which answer family is legal for it — see resolveClue.ts
 * for the one resolver class per op_type built against these shapes.
 */
export const OP_TYPE = {
  LINE_BUFFER_INSIDE: 'LINE_BUFFER_INSIDE',
  LINE_POINT_BUFFER_INSIDE: 'LINE_POINT_BUFFER_INSIDE',
  POLYGON_INSIDE: 'POLYGON_INSIDE',
  POINT_BUFFER_INSIDE: 'POINT_BUFFER_INSIDE',
  POINT_POINT_BUFFER_INSIDE: 'POINT_POINT_BUFFER_INSIDE',
  POINT_SPLIT: 'POINT_SPLIT',
  TWO_POINT_BISECTOR: 'TWO_POINT_BISECTOR',
} as const;

export type OpType = (typeof OP_TYPE)[keyof typeof OP_TYPE];

export const ANSWER = {
  INSIDE: 'INSIDE',
  OUTSIDE: 'OUTSIDE',
  NORTH: 'NORTH',
  SOUTH: 'SOUTH',
  EAST: 'EAST',
  WEST: 'WEST',
  HOTTER: 'HOTTER',
  COLDER: 'COLDER',
} as const;

export type Answer = (typeof ANSWER)[keyof typeof ANSWER];

export const OPPOSITE: Record<Answer, Answer> = {
  [ANSWER.INSIDE]: ANSWER.OUTSIDE, [ANSWER.OUTSIDE]: ANSWER.INSIDE,
  [ANSWER.NORTH]: ANSWER.SOUTH, [ANSWER.SOUTH]: ANSWER.NORTH,
  [ANSWER.EAST]: ANSWER.WEST, [ANSWER.WEST]: ANSWER.EAST,
  [ANSWER.HOTTER]: ANSWER.COLDER, [ANSWER.COLDER]: ANSWER.HOTTER,
};

export const POINT_SOURCE = {
  ASKER_LOCATION: 'ASKER_LOCATION',
  MAP_POINT: 'MAP_POINT',
} as const;

export type PointSource = (typeof POINT_SOURCE)[keyof typeof POINT_SOURCE];

/**
 * Both point sources (device GPS fix, hand-placed pin) resolve to this
 * shape. lat/lon travel as strings to match the live API payloads described
 * in "Ask to Fact"; everything else is provenance, kept but not required by
 * the resolvers.
 */
export interface ResolvedLatLon {
  lat: string;
  lon: string;
  source?: PointSource;
  name?: string;
  captured_at?: string;
  accuracy_m?: number;
  picked_at?: string;
}

/**
 * `geometry` is a FactDto-only escape hatch — a fact can carry the line's
 * actual geometry inline instead of a registry key, and the resolver skips
 * the registry lookup entirely when it's present. Named to match
 * RegistryEntry.geometry, which is the same "here's the real geometry"
 * value in the normal (registry-backed) case. AskedQuestionDto/
 * templateQuestionBuilder.ts never set this — the wizard only ever
 * resolves slots through a registry key, never an inline geometry.
 */
export interface LineBufferInsideMeta { line: string; distance: number; geometry?: LineString }
export interface LinePointBufferInsideMeta { line: string; point: ResolvedLatLon; geometry?: LineString }
export interface PolygonInsideMeta { polygon: string; geometry?: Polygon | MultiPolygon }
export interface PointBufferInsideMeta { point: ResolvedLatLon; radius: number }
export interface PointPointBufferInsideMeta { anchor: ResolvedLatLon; point: ResolvedLatLon }
export interface PointSplitMeta { point: ResolvedLatLon }
export interface TwoPointBisectorMeta { point: ResolvedLatLon; pointFinal: ResolvedLatLon }

export type OpMetaByType = {
  LINE_BUFFER_INSIDE: LineBufferInsideMeta;
  LINE_POINT_BUFFER_INSIDE: LinePointBufferInsideMeta;
  POLYGON_INSIDE: PolygonInsideMeta;
  POINT_BUFFER_INSIDE: PointBufferInsideMeta;
  POINT_POINT_BUFFER_INSIDE: PointPointBufferInsideMeta;
  POINT_SPLIT: PointSplitMeta;
  TWO_POINT_BISECTOR: TwoPointBisectorMeta;
};

export const FACT_TYPE = { GEO: 'GEO' } as const;

export type FactType = (typeof FACT_TYPE)[keyof typeof FACT_TYPE];

/**
 * Stage 4 of "Ask to Fact" — the durable record. op_meta is the question's
 * resolved slots, plus the asserted pole, plus the hider's boolean; nothing
 * geometric is stored. Backend isn't wired up yet, so every FactDto in this
 * folder is mock data shaped to this contract (see mockData.ts).
 */
export interface FactDto {
  fact_id: string;
  fact_type: FactType;
  question_id: string;
  answer_id: string;
  fact_info: {
    op_type: OpType;
    op_meta: Record<string, unknown> & { assertedAnswer: Answer; value: boolean };
  };
  created: string;
  modified: string;
}

export interface RegistryEntry<G> {
  display_name: string;
  geometry: G;
}

/** Named geometry a PLACEHOLDER-bound slot resolves against. Points are the
 * exception in "Ask to Fact" — they carry their own coordinates and never
 * live in a registry. */
export interface GeometryRegistries {
  polygons: Record<string, RegistryEntry<Polygon | MultiPolygon>>;
  lines: Record<string, RegistryEntry<LineString>>;
}

/** Stage 5 — computed on demand, never stored. */
export interface Region {
  contains(p: number[]): boolean;
  toPolygon(universe: import('geojson').Feature<Polygon | MultiPolygon>): import('geojson').Feature<Polygon | MultiPolygon>;
}

/**
 * A question the asker has sent but the hider hasn't answered yet. Rendered
 * as a "Draft Fact" — same factToRegion path as a confirmed Fact, just with
 * an assumed value (assumed_value, picked in the wizard's review step — see
 * draftQuestionToFact in mockData.ts) and dashed styling so it reads as
 * unconfirmed.
 */
export interface AskedQuestionDto {
  question_id: string;
  rendered_question: string;
  answer_instruction_type: OpType;
  question_meta: {
    resolved_slots: Record<string, unknown>;
    asserted_answer: Answer;
    /** What we assume the hider will answer, chosen by the asker in the
     * wizard's review step before adding the draft — true assumes the
     * asserted pole holds, false assumes its opposite. */
    assumed_value: boolean;
  };
}
