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
 */
import { Answer, FACT_TYPE, FactDto, OpType, ResolvedLatLon } from './factTypes';

export type SlotKind = 'POINT' | 'LINE' | 'POLYGON' | 'LENGTH';

export const SUBOP_CONTRACT: Record<OpType, { slots: Record<string, SlotKind>; answers: readonly Answer[] }> = {
  LINE_BUFFER_INSIDE: { slots: { line: 'LINE', distance: 'LENGTH' }, answers: ['INSIDE', 'OUTSIDE'] },
  LINE_POINT_BUFFER_INSIDE: { slots: { line: 'LINE', point: 'POINT' }, answers: ['INSIDE', 'OUTSIDE'] },
  POLYGON_INSIDE: { slots: { polygon: 'POLYGON' }, answers: ['INSIDE', 'OUTSIDE'] },
  POINT_BUFFER_INSIDE: { slots: { point: 'POINT', radius: 'LENGTH' }, answers: ['INSIDE', 'OUTSIDE'] },
  POINT_POINT_BUFFER_INSIDE: { slots: { anchor: 'POINT', point: 'POINT' }, answers: ['INSIDE', 'OUTSIDE'] },
  POINT_SPLIT: { slots: { point: 'POINT' }, answers: ['N', 'S', 'E', 'W'] },
  TWO_POINT_BISECTOR: { slots: { point: 'POINT', pointFinal: 'POINT' }, answers: ['HOTTER', 'COLDER'] },
};

/** Where a template slot's value comes from — the author (TEMPLATE_CONSTANT),
 * the asker (PLACEHOLDER, MAP_POINT), or the asker's device (ASKER_LOCATION). */
export type SlotBinding =
  | { source: 'ASKER_LOCATION' }
  | { source: 'MAP_POINT'; label_placeholder?: string; bounds?: 'GAME_AREA' | 'UNRESTRICTED' }
  | { source: 'PLACEHOLDER'; placeholder: string }
  | { source: 'TEMPLATE_CONSTANT'; value: string | number };

export interface PlaceholderSpec {
  required: boolean;
  /** Omitted -> free text. */
  allowed_values?: (string | number)[];
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
