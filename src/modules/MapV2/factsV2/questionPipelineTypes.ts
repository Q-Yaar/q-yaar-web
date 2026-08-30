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
 * This file's shapes (QuestionTemplateDto and friends) are the *client's*
 * flat spec, not the wire shape the real Qonsole console API actually
 * sends — see fromQuestionTemplateV2() at the bottom for the adapter
 * between the two: a nested answer plan that needs unwrapping flat, and an
 * answer plan that's optional on a pre-v2 legacy row. Nothing that already
 * consumes QuestionTemplateDto (templateQuestionBuilder.ts, resolveClue.ts,
 * the wizard) needs to change for this — they only ever see the
 * already-adapted flat shape.
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

/** Stage 1 — authored once, no coordinates, no answers. */
export interface QuestionTemplateDto {
  question_template_id: string;
  template: string;
  category: PipelineCategory;
  answer_instruction_type: OpType;
  slot_bindings: Record<string, SlotBinding>;
  asserted_answer: AssertedAnswerBinding;
  placeholders: Record<string, PlaceholderSpec>;
  created: string;
  modified: string;
}

/**
 * A template whose legacy category has no geo mechanism at all (Photos,
 * ...) — no op_type, no slots, nothing SUBOP_CONTRACT can describe. Kept
 * as its own minimal shape (not a QuestionTemplateDto with a fake op_type)
 * so the type system can't accidentally treat one as map-answerable
 * anywhere downstream. The wizard lists these purely for visibility — see
 * legacyTemplateConverter.ts's convertLegacyNonGeoTemplates.
 */
export interface NonGeoQuestionTemplateDto {
  question_template_id: string;
  template: string;
  category: PipelineCategory;
  created: string;
  modified: string;
}

/**
 * Stage 2 — every slot resolved to a concrete value by the asker. Named
 * AskedQuestionRecordDto (not AskedQuestionDto) to stay clear of
 * factTypes.ts's AskedQuestionDto, which is a different, MapV2-local
 * concept (the draft-fact wizard's own in-progress question) — not this
 * spec's stage 2 of the real backend pipeline.
 */
export interface AskedQuestionRecordDto {
  question_id: string;
  question_template_id: string;
  template: string;
  rendered_question: string;
  category: PipelineCategory;
  answer_instruction_type: OpType;
  question_meta: {
    placeholder_values: Record<string, string | number>;
    resolved_slots: Record<string, ResolvedLatLon | string | number>;
    asserted_answer: Answer;
    /** Derived — for map rendering only, same caveat the spec calls out:
     * it's a flat array and can't say which point was which slot. Use
     * resolved_slots for anything that needs to know that. */
    location_points: { lat: string; lon: string }[];
  };
  answered: boolean;
  accepted: boolean;
  created: string;
  modified: string;
}

/** Stage 3 — the hider's entire contribution: one boolean. */
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
export function toFactRecord(question: AskedQuestionRecordDto, answer: AnswerRecordDto): FactDto {
  const { resolved_slots, asserted_answer } = question.question_meta;
  return {
    fact_id: `qna-${question.question_id}`,
    fact_type: FACT_TYPE.GEO,
    question_id: question.question_id,
    answer_id: answer.answer_id,
    fact_info: {
      op_type: question.answer_instruction_type,
      op_meta: { ...resolved_slots, assertedAnswer: asserted_answer, value: answer.value },
    },
    created: answer.answered_at,
    modified: answer.answered_at,
  };
}

// ============================================================================
// Wire adapter — QuestionTemplateV2 (Qonsole/console API shape) -> the flat
// QuestionTemplateDto above. See "Ask to Fact — Templates v2 Contract" §2 —
// only the nested answer plan (§2.01) and the optional-on-legacy-rows answer
// plan (§2.03) still apply; the client's ANSWER (factTypes.ts) now spells
// the compass points NORTH/SOUTH/EAST/WEST the same way the console does, so
// §2.02's translation is no longer needed here.
// ============================================================================

/** The console's nested answer plan — §2.01. Note operation_type where the
 * client says answer_instruction_type; that rename happens in the adapter,
 * not by aliasing the field here, so a reader can't mistake this for
 * already being the client shape. */
interface AnswerInstructionMetaV2 {
  operation_type: OpType;
  slot_bindings: Record<string, SlotBinding>;
  asserted_answer: AssertedAnswerBinding;
  placeholders: Record<string, PlaceholderSpec>;
}

/**
 * The shape GET/POST /api/v1/qna/... actually returns. `question_id` and
 * `answer_instruction_meta` are both optional per §2.03/§2.04 — a row
 * created before this pipeline existed has neither a
 * `question_template_id` nor an answer plan, only the legacy `question_id`.
 * Qonsole's own API layer normalizes the id before its frontend ever sees
 * one of these; since q-yaar-web talks to the API directly rather than
 * through Qonsole's code, fromQuestionTemplateV2() below repeats that same
 * fallback rather than assuming it's already been done upstream.
 */
export interface QuestionTemplateV2 {
  question_template_id?: string;
  question_id?: string;
  template: string;
  category: PipelineCategory;
  answer_instruction_meta?: AnswerInstructionMetaV2;
  created: string;
  modified: string;
}

/**
 * Returns null for a pre-v2 row (no answer_instruction_meta — §2.03) or one
 * with no resolvable id at all — there's nothing a QuestionTemplateDto can
 * represent for either. Otherwise just unwraps the nested answer plan flat
 * (§2.01) and renames operation_type -> answer_instruction_type; every
 * field inside it (including Answer spellings) already matches the client
 * shape byte-for-byte.
 */
export function fromQuestionTemplateV2(wire: QuestionTemplateV2): QuestionTemplateDto | null {
  const questionTemplateId = wire.question_template_id ?? wire.question_id;
  if (!questionTemplateId || !wire.answer_instruction_meta) return null;

  const { operation_type, slot_bindings, asserted_answer, placeholders } = wire.answer_instruction_meta;

  return {
    question_template_id: questionTemplateId,
    template: wire.template,
    category: wire.category,
    answer_instruction_type: operation_type,
    slot_bindings,
    asserted_answer,
    placeholders,
    created: wire.created,
    modified: wire.modified,
  };
}

export function fromQuestionTemplateV2List(wire: QuestionTemplateV2[]): QuestionTemplateDto[] {
  return wire.map(fromQuestionTemplateV2).filter((t): t is QuestionTemplateDto => t !== null);
}
