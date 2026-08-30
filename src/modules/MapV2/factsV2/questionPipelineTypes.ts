/**
 * The "Ask to Fact" pipeline's stage 1 (Template) and stage 2
 * (AskedQuestion) contracts — the two stages that had no representation
 * anywhere in factsV2 before this file. Stage 4 (Fact) and stage 5 (Region)
 * already exist and match the spec exactly: FactDto, OP_TYPE, ANSWER,
 * OPPOSITE, ResolvedLatLon, and RegistryEntry all live in factTypes.ts and
 * are reused here rather than redeclared, so there is exactly one
 * definition of "what a fact looks like" in this codebase.
 *
 * SUBOP_CONTRACT is the one genuinely new piece: the slot-kind/answer-family
 * declaration each of the seven op_types carries, which until now only
 * existed implicitly (split across each resolver's constructor signature in
 * resolvers/*.ts). Written out explicitly here so template conversion has
 * something concrete to validate slot_bindings against.
 *
 * Everything downstream (templateQuestionBuilder.ts, the wizard, the answer
 * flows) consumes the real Qonsole console API's own wire shapes
 * (QuestionTemplateV2, AskedQuestionV2) directly, rather than a client-only
 * restructuring of them — see questionTemplateId()/isGeoTemplate() below for
 * the two small helpers that stand in for what a flat DTO would otherwise
 * have hidden (an id that's only reliably present as legacy `question_id` on
 * a pre-v2 row, and narrowing to a row with a real answer plan).
 */
import { LineString, MultiPolygon, Point, Polygon } from 'geojson';
import { Answer, FACT_TYPE, FactDto, OpType, ResolvedLatLon } from './factTypes';

export type SlotKind = 'POINT' | 'LINE' | 'POLYGON' | 'LENGTH';

export const SUBOP_CONTRACT: Record<OpType, { slots: Record<string, SlotKind>; answers: readonly Answer[] }> = {
  LINE_BUFFER_INSIDE: { slots: { line: 'LINE', distance: 'LENGTH' }, answers: ['INSIDE', 'OUTSIDE'] },
  LINE_POINT_BUFFER_INSIDE: { slots: { line: 'LINE', point: 'POINT' }, answers: ['INSIDE', 'OUTSIDE'] },
  POLYGON_INSIDE: { slots: { polygon: 'POLYGON' }, answers: ['INSIDE', 'OUTSIDE'] },
  POINT_BUFFER_INSIDE: { slots: { point: 'POINT', radius: 'LENGTH' }, answers: ['INSIDE', 'OUTSIDE'] },
  POINT_POINT_BUFFER_INSIDE: { slots: { anchor: 'POINT', point: 'POINT' }, answers: ['INSIDE', 'OUTSIDE'] },
  POINT_SPLIT: { slots: { point: 'POINT' }, answers: ['NORTH', 'SOUTH', 'EAST', 'WEST'] },
  TWO_POINT_BISECTOR: { slots: { point: 'POINT', pointFinal: 'POINT' }, answers: ['HOTTER', 'COLDER'] },
};

/** Where a template slot's value comes from — the author (TEMPLATE_CONSTANT),
 * the asker (PLACEHOLDER, MAP_POINT), or the asker's device (ASKER_LOCATION). */
export type SlotBinding =
  | { source: 'ASKER_LOCATION' }
  | { source: 'MAP_POINT'; label_placeholder?: string; bounds?: 'GAME_AREA' | 'UNRESTRICTED' }
  | { source: 'PLACEHOLDER'; placeholder: string }
  | { source: 'TEMPLATE_CONSTANT'; value: string | number };

/** A named geometry the console's asset catalog manages — what a
 * PlaceholderAllowedValue of type 'geometry' carries as its `value`.
 * Points never appear here (a POINT slot always carries its own
 * coordinates, never a registry reference) — only POLYGON/LINE. */
export interface GeometryRecord {
  geometry_id: string;
  /** Only NAMED_CONSTANT entries carry one — this is what op_meta
   * (`polygon`/`line` fields) actually references. */
  key?: string;
  display_name: string;
  kind: 'POLYGON' | 'LINE' | 'POINT';
  source: 'NAMED_CONSTANT' | 'ASSET' | 'GEOJSON';
  geometry?: Polygon | MultiPolygon | LineString | Point;
  asset_url?: string;
}

/** One curated option for a placeholder — tagged by type so a numeric
 * placeholder round-trips as a real number and a zone pick carries its own
 * geometry reference, not just a string that happens to look like one.
 * `display_name` is what the picker shows; `value` is what actually gets
 * stored (in PlaceholderValues, then resolved_slots) once chosen. */
export type PlaceholderAllowedValue =
  | { type: 'geometry'; value: GeometryRecord; display_name: string }
  | { type: 'text'; value: string; display_name: string }
  | { type: 'number'; value: number; display_name: string };

export interface PlaceholderSpec {
  required: boolean;
  /** Asker can type a value outside allowed_values, not just pick one. */
  allow_free_text: boolean;
  /** Omitted -> nothing curated, free text only. */
  allowed_values?: PlaceholderAllowedValue[];
}

export type AssertedAnswerBinding =
  | { source: 'TEMPLATE_CONSTANT'; value: Answer }
  | { source: 'PLACEHOLDER'; placeholder: string };

/** Minimal — just enough of the legacy Category to identify and label a
 * template. Reward/created/modified on the category itself aren't needed
 * anywhere downstream in MapV2. */
export interface PipelineCategory {
  category_id: string;
  category_name: string;
  priority: number;
}

/** The console's nested answer plan — §2.01 of "Ask to Fact — Templates v2
 * Contract". Note `operation_type`, not `answer_instruction_type` — the
 * asked-question wire shape below (AskedQuestionV2.question_meta) uses the
 * latter for the same concept; that's an API inconsistency, not a typo, so
 * both spellings are kept exactly as the wire sends them rather than
 * normalized to one name. */
export interface AnswerInstructionMetaV2 {
  operation_type: OpType;
  slot_bindings: Record<string, SlotBinding>;
  asserted_answer: AssertedAnswerBinding;
  placeholders: Record<string, PlaceholderSpec>;
}

/**
 * Stage 1 — the shape GET/POST /api/v1/qna/... actually returns, authored
 * once, no coordinates, no answers. `question_id` and
 * `answer_instruction_meta` are both optional per §2.03/§2.04 — a row
 * created before this pipeline existed (no map mechanism at all) has
 * neither a `question_template_id` nor an answer plan, only the legacy
 * `question_id`. `answer_instruction_meta` itself comes through as an
 * explicit `null` on such a row, not an omitted key, hence `| null` here
 * rather than just optional. Qonsole's own API layer normalizes the id
 * before its frontend ever sees one of these; since q-yaar-web talks to the
 * API directly rather than through Qonsole's code, questionTemplateId()
 * below repeats that same fallback rather than assuming it's already been
 * done upstream.
 */
export interface QuestionTemplateV2 {
  question_template_id?: string;
  question_id?: string;
  template: string;
  category: PipelineCategory;
  answer_instruction_meta?: AnswerInstructionMetaV2 | null;
  created: string;
  modified: string;
}

/** A QuestionTemplateV2 known to carry a real answer plan — what
 * isTemplateComplete()/pointSlotNames()/etc. (templateQuestionBuilder.ts)
 * and the wizard actually need, since none of them can do anything with a
 * pre-v2 row that has no answer_instruction_meta at all. */
export type GeoQuestionTemplate = QuestionTemplateV2 & { answer_instruction_meta: AnswerInstructionMetaV2 };

/** The id fallback §2.03/§2.04 calls for — a pre-v2 row only ever carries
 * the legacy `question_id`, never `question_template_id`. */
export function questionTemplateId(t: QuestionTemplateV2): string | undefined {
  return t.question_template_id ?? t.question_id;
}

/** True for a row with a real answer plan (§2.01) — the map-answerable
 * half of the list endpoint's mixed response. A pre-v2 row's plan comes
 * through as `null`, not just an omitted key, so this checks both. */
export function isGeoTemplate(t: QuestionTemplateV2): t is GeoQuestionTemplate {
  return t.answer_instruction_meta != null;
}

export interface ClassifiedQuestionTemplates {
  geo: GeoQuestionTemplate[];
  nonGeo: QuestionTemplateV2[];
}

/**
 * The real list endpoint returns one mixed collection — v2 rows with an
 * answer plan alongside pre-v2 legacy rows with none (§2.03) — split here
 * into the two groups the wizard actually renders as separate sections
 * (qnaPipelineApi.ts's useGetQuestionTemplatesQuery / useGetNonGeoQuestionTemplatesQuery).
 * A row with no resolvable id at all is dropped entirely — there's nothing
 * either section can show for it.
 */
export function classifyQuestionTemplatesV2(wire: QuestionTemplateV2[]): ClassifiedQuestionTemplates {
  const geo: GeoQuestionTemplate[] = [];
  const nonGeo: QuestionTemplateV2[] = [];

  for (const row of wire) {
    if (!questionTemplateId(row)) continue;
    if (isGeoTemplate(row)) geo.push(row);
    else nonGeo.push(row);
  }

  return { geo, nonGeo };
}

/**
 * Stage 2 — the shape GET /api/v1/qna/game/{game_id}/asked-questions and
 * the askQuestion/answerQuestion mutations actually return: every slot
 * resolved to a concrete value by the asker. question_meta nests
 * answer_instruction_type/asserted_answer/resolved_slots (mirroring the
 * request body models/QnA.ts's AskQuestionRequestV2 sends), with
 * answer_meta/fact_meta/reward layered around it as record bookkeeping.
 * Not to be confused with factTypes.ts's AskedQuestionDto, a different,
 * MapV2-local concept (the draft-fact wizard's own in-progress question) —
 * not this spec's stage 2 of the real backend pipeline.
 */
export interface AskedQuestionV2 {
  question_id: string;
  question_template_id: string;
  template: string;
  rendered_question: string;
  category: PipelineCategory;
  question_meta: {
    answer_instruction_type: OpType;
    asserted_answer: Answer;
    resolved_slots: Record<string, ResolvedLatLon | string | number>;
    /** The same tagged {type, value, display_name} triples the ask request
     * sent (models/QnA.ts's AskQuestionRequestV2.question_meta.resolved_placeholders)
     * — echoed back here so a display can substitute a PLACEHOLDER-bound
     * token with its curated display_name instead of the raw stored value
     * (a zone's geometry key, an unlabelled number). Optional since a
     * pre-v2 or template-less record has nothing to echo. */
    resolved_placeholders?: Record<string, PlaceholderAllowedValue>;
  };
  /** Populated once the hider has answered (see the real answerQuestion
   * mutation's body, models/QnA.ts's AnswerQuestionRequest) — empty ({})
   * until then. */
  answer_meta?: { result?: boolean | string };
  answered: boolean;
  accepted: boolean;
  created: string;
  modified: string;
}

/** Stage 3 — the hider's entire contribution: one boolean. Assembled
 * locally from the answerQuestion mutation's response rather than read off
 * any single endpoint, so unlike the shapes above it has no wire
 * counterpart to stay aligned with. */
export interface AnswerRecordDto {
  answer_id: string;
  question_id: string;
  value: boolean;
  answered_at: string;
  metadata?: {
    auto_answered?: boolean;
    computation_method?: string;
  };
}

/**
 * Stage 2 + 3 -> stage 4, exactly the spec's toFact(): a copy, never a
 * derivation. op_meta is resolved_slots plus the asserted pole plus the
 * hider's boolean — no geometry, no lookup.
 */
export function toFactRecord(question: AskedQuestionV2, answer: AnswerRecordDto): FactDto {
  const { answer_instruction_type, resolved_slots, asserted_answer } = question.question_meta;
  return {
    fact_id: `qna-${question.question_id}`,
    fact_type: FACT_TYPE.GEO,
    question_id: question.question_id,
    answer_id: answer.answer_id,
    fact_info: {
      op_type: answer_instruction_type,
      op_meta: { ...resolved_slots, assertedAnswer: asserted_answer, value: answer.value },
    },
    created: answer.answered_at,
    modified: answer.answered_at,
  };
}
