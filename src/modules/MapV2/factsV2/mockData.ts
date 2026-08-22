import { AskedQuestionDto, ANSWER, FACT_TYPE, FactDto, OP_TYPE, POINT_SOURCE } from './factTypes';

/**
 * Backend isn't wired up to FactsV2 yet, so every Fact and draft question
 * here is invented data shaped exactly like the "Ask to Fact" DTOs. Points
 * are spread around the Bengaluru play area the old Map already centers on
 * ([77.591, 12.979]) so they render sensibly against the same base style.
 */

const rl = (lon: number, lat: number, extra: Partial<{ source: typeof POINT_SOURCE.ASKER_LOCATION | typeof POINT_SOURCE.MAP_POINT; name: string }> = {}) => ({
  lat: String(lat),
  lon: String(lon),
  source: extra.source ?? POINT_SOURCE.ASKER_LOCATION,
  ...(extra.name ? { name: extra.name } : {}),
});

/** Confirmed facts — as if fetched from GET /games/:id/facts, one per SubOp family. */
export const MOCK_FACTS: FactDto[] = [
  {
    fact_id: 'fact-001',
    fact_type: FACT_TYPE.GEO,
    question_id: 'q-001',
    answer_id: 'ans-001',
    fact_info: {
      op_type: OP_TYPE.POINT_BUFFER_INSIDE,
      op_meta: {
        point: rl(77.6045, 12.9716),
        radius: 3000,
        assertedAnswer: ANSWER.INSIDE,
        value: true,
      },
    },
    created: '2026-08-20T18:49:18.194741Z',
    modified: '2026-08-20T18:49:18.194741Z',
  },
  {
    fact_id: 'fact-002',
    fact_type: FACT_TYPE.GEO,
    question_id: 'q-002',
    answer_id: 'ans-002',
    fact_info: {
      op_type: OP_TYPE.POLYGON_INSIDE,
      op_meta: {
        polygon: 'BLR_EAST_CORP',
        assertedAnswer: ANSWER.INSIDE,
        value: false,
      },
    },
    created: '2026-08-20T18:50:02.100000Z',
    modified: '2026-08-20T18:50:02.100000Z',
  },
  {
    fact_id: 'fact-003',
    fact_type: FACT_TYPE.GEO,
    question_id: 'q-003',
    answer_id: 'ans-003',
    fact_info: {
      op_type: OP_TYPE.POINT_POINT_BUFFER_INSIDE,
      op_meta: {
        anchor: rl(77.5856, 12.9724, { source: POINT_SOURCE.MAP_POINT, name: 'Phoenix Mall' }),
        point: rl(77.7456, 12.9824),
        assertedAnswer: ANSWER.INSIDE,
        value: true,
      },
    },
    created: '2026-08-20T18:48:11.262387Z',
    modified: '2026-08-20T18:48:11.262387Z',
  },
  {
    fact_id: 'fact-004',
    fact_type: FACT_TYPE.GEO,
    question_id: 'q-004',
    answer_id: 'ans-004',
    fact_info: {
      op_type: OP_TYPE.POINT_SPLIT,
      op_meta: {
        point: rl(77.59, 12.99),
        assertedAnswer: ANSWER.N,
        value: true,
      },
    },
    created: '2026-08-21T09:12:00.000000Z',
    modified: '2026-08-21T09:12:00.000000Z',
  },
  {
    fact_id: 'fact-005',
    fact_type: FACT_TYPE.GEO,
    question_id: 'q-005',
    answer_id: 'ans-005',
    fact_info: {
      op_type: OP_TYPE.TWO_POINT_BISECTOR,
      op_meta: {
        point: rl(77.55, 12.90, { source: POINT_SOURCE.MAP_POINT, name: 'Old spot' }),
        pointFinal: rl(77.65, 13.02),
        assertedAnswer: ANSWER.HOTTER,
        value: true,
      },
    },
    created: '2026-08-21T09:20:00.000000Z',
    modified: '2026-08-21T09:20:00.000000Z',
  },
  {
    fact_id: 'fact-006',
    fact_type: FACT_TYPE.GEO,
    question_id: 'q-006',
    answer_id: 'ans-006',
    fact_info: {
      op_type: OP_TYPE.LINE_BUFFER_INSIDE,
      op_meta: {
        line: 'METRO_PURPLE_LINE',
        distance: 1500,
        assertedAnswer: ANSWER.INSIDE,
        value: true,
      },
    },
    created: '2026-08-21T09:25:00.000000Z',
    modified: '2026-08-21T09:25:00.000000Z',
  },
];

/**
 * Draft facts — questions sent to the hider but not yet answered. Rendered
 * with dashed/lower-opacity styling; see draftQuestionToFact for how the
 * unanswered draft becomes a FactDto so it can go through the exact same
 * factToRegion path as a confirmed one.
 */
export const MOCK_DRAFT_QUESTIONS: AskedQuestionDto[] = [
  {
    question_id: 'q-draft-001',
    rendered_question: 'Are you within 2000 metres of this point?',
    answer_instruction_type: OP_TYPE.POINT_BUFFER_INSIDE,
    question_meta: {
      resolved_slots: { point: rl(77.652, 12.951), radius: 2000 },
      asserted_answer: ANSWER.INSIDE,
    },
  },
  {
    question_id: 'q-draft-002',
    rendered_question: 'Are you in Bengaluru North City Corporation?',
    answer_instruction_type: OP_TYPE.POLYGON_INSIDE,
    question_meta: {
      resolved_slots: { polygon: 'BLR_NORTH_CORP' },
      asserted_answer: ANSWER.INSIDE,
    },
  },
];

/**
 * A draft has no Answer yet, so there's no hider boolean to flip
 * assertedAnswer against. We assume the asserted pole holds (value: true) —
 * a preview of what the constraint will look like if the hider confirms —
 * and mark provenance with a `draft-` answer_id prefix so it's obviously
 * not a real Answer record.
 */
export function draftQuestionToFact(question: AskedQuestionDto): FactDto {
  const { resolved_slots, asserted_answer } = question.question_meta;
  return {
    fact_id: `draft-${question.question_id}`,
    fact_type: FACT_TYPE.GEO,
    question_id: question.question_id,
    answer_id: `draft-${question.question_id}`,
    fact_info: {
      op_type: question.answer_instruction_type,
      op_meta: { ...resolved_slots, assertedAnswer: asserted_answer, value: true },
    },
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  };
}

export const MOCK_DRAFT_FACTS: FactDto[] = MOCK_DRAFT_QUESTIONS.map(draftQuestionToFact);
