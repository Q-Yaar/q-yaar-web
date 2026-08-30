/**
 * ============================================================================
 * TEMPORARY FILE — mirrors legacyFactConverter.ts and legacyTemplateConverter.ts,
 * the last hop before a real Fact: converts a legacy AskedQuestion
 * (src/models/QnA.ts — what GET /qna/game/:id/asked-questions actually
 * returns today) into the AskedQuestionRecordDto stage 2 describes, and —
 * since the legacy response conflates stages 2 and 3 in one object — also
 * extracts an AnswerRecordDto (stage 3) from the same payload's
 * answer_meta/answered fields. Delete this file the moment the backend
 * serves AskedQuestion and Answer as their own shapes.
 * ============================================================================
 *
 * The legacy payload carries the resolved values for each category's
 * mechanism spread across two places: question_meta.location_points (an
 * ordered, unlabelled array — see legacyTemplateConverter.ts's per-category
 * slot_bindings for what each index means) and fact_meta (the placeholder's
 * resolved value: radius, split_direction, feature_name — populated by
 * CATEGORY_REGISTRY's ask.placeholderMap at ask time). Re-deriving
 * resolved_slots means re-applying that same per-category knowledge one
 * more time, branch for branch, matching legacyTemplateConverter.ts exactly
 * — a template and its asked questions must resolve to the same op_type.
 *
 * Only the same five categories convert (Matching, Measuring, Thermometer/
 * "Hotter / Colder", Radar, Relative/"Relative Heading"); anything else, or
 * a question missing the fields its category needs, converts to null.
 */
import { AskedQuestion } from '../../../models/QnA';
import { ANSWER, Answer, FactDto, OP_TYPE, OpType, POINT_SOURCE, PointSource, ResolvedLatLon } from './factTypes';
import { AnswerRecordDto, AskedQuestionRecordDto, toFactRecord } from './questionPipelineTypes';

// Real fact_meta.split_direction values come through lowercase ("west",
// not "West") — unlike geoTypes.ts's Operation.splitDirection (a different
// legacy source, the old map tool's, which IS capitalized). Looked up
// case-insensitively below rather than assuming either casing.
const DIRECTION_TO_ANSWER: Record<string, Answer> = {
  north: ANSWER.NORTH,
  south: ANSWER.SOUTH,
  east: ANSWER.EAST,
  west: ANSWER.WEST,
};

interface LegacyPoint {
  lat: string;
  lon: string;
}

function toResolvedLatLon(p: LegacyPoint | undefined, source: PointSource): ResolvedLatLon | null {
  if (!p) return null;
  return { lat: p.lat, lon: p.lon, source };
}

function locationPointsOf(question: AskedQuestion): LegacyPoint[] {
  return question.question_meta?.location_points ?? [];
}

interface ResolvedShape {
  opType: OpType;
  resolvedSlots: Record<string, ResolvedLatLon | string | number>;
  assertedAnswer: Answer;
}

function resolveMatching(question: AskedQuestion): ResolvedShape | null {
  const featureName = question.fact_meta?.feature_name;
  if (!featureName) return null;
  return { opType: OP_TYPE.POLYGON_INSIDE, resolvedSlots: { polygon: featureName }, assertedAnswer: ANSWER.INSIDE };
}

function resolveMeasuring(question: AskedQuestion): ResolvedShape | null {
  const points = locationPointsOf(question);
  // MEASURING_FACT_BUILDER: center/anchor = target = location_points[1],
  // radius is measured from the seeker at location_points[0].
  const anchor = toResolvedLatLon(points[1], POINT_SOURCE.MAP_POINT);
  const point = toResolvedLatLon(points[0], POINT_SOURCE.ASKER_LOCATION);
  if (!anchor || !point) return null;
  return { opType: OP_TYPE.POINT_POINT_BUFFER_INSIDE, resolvedSlots: { anchor, point }, assertedAnswer: ANSWER.INSIDE };
}

function resolveThermometer(question: AskedQuestion): ResolvedShape | null {
  const points = locationPointsOf(question);
  // previous = location_points[0]; current = the LAST point, not [1] —
  // real payloads carry the ask-time fix twice ([prev, prev, current])
  // once the deferred "Add Current Location" step appends a third point,
  // rather than overwriting index 1. Taking the last point handles both
  // that 3-point shape and a hypothetical clean 2-point [prev, current].
  if (points.length < 2) return null;
  const point = toResolvedLatLon(points[0], POINT_SOURCE.ASKER_LOCATION);
  const pointFinal = toResolvedLatLon(points[points.length - 1], POINT_SOURCE.ASKER_LOCATION);
  if (!point || !pointFinal) return null;
  return { opType: OP_TYPE.TWO_POINT_BISECTOR, resolvedSlots: { point, pointFinal }, assertedAnswer: ANSWER.HOTTER };
}

function resolveRadar(question: AskedQuestion): ResolvedShape | null {
  const point = toResolvedLatLon(locationPointsOf(question)[0], POINT_SOURCE.ASKER_LOCATION);
  const radiusRaw = question.fact_meta?.radius;
  const radius = radiusRaw !== undefined ? Number(radiusRaw) : NaN;
  if (!point || Number.isNaN(radius)) return null;
  return { opType: OP_TYPE.POINT_BUFFER_INSIDE, resolvedSlots: { point, radius }, assertedAnswer: ANSWER.INSIDE };
}

function resolveRelative(question: AskedQuestion): ResolvedShape | null {
  const point = toResolvedLatLon(locationPointsOf(question)[0], POINT_SOURCE.ASKER_LOCATION);
  const direction = question.fact_meta?.split_direction;
  const assertedAnswer = direction ? DIRECTION_TO_ANSWER[direction.toLowerCase()] : undefined;
  if (!point || !assertedAnswer) return null;
  return { opType: OP_TYPE.POINT_SPLIT, resolvedSlots: { point }, assertedAnswer };
}

const CATEGORY_RESOLVERS: Record<string, (question: AskedQuestion) => ResolvedShape | null> = {
  Matching: resolveMatching,
  Measuring: resolveMeasuring,
  Thermometer: resolveThermometer,
  'Hotter / Colder': resolveThermometer,
  Radar: resolveRadar,
  Relative: resolveRelative,
  'Relative Heading': resolveRelative,
};

/** Returns null for an unsupported category, or one whose resolver couldn't
 * find the fields its op_type needs (e.g. a Radar question missing
 * fact_meta.radius). */
export function convertLegacyAskedQuestion(question: AskedQuestion): AskedQuestionRecordDto | null {
  const resolver = CATEGORY_RESOLVERS[question.category.category_name];
  if (!resolver) return null;
  const resolved = resolver(question);
  if (!resolved) return null;

  return {
    question_id: question.question_id,
    question_template_id: question.question_template_id,
    template: question.template,
    rendered_question: question.rendered_question,
    category: {
      category_id: question.category.category_id,
      category_name: question.category.category_name,
      priority: question.category.priority,
    },
    answer_instruction_type: resolved.opType,
    question_meta: {
      // Not recoverable from a legacy response — it only ever carries the
      // RESOLVED fact_meta fields (radius, split_direction, ...), never the
      // raw chosen_placeholders that produced them.
      placeholder_values: {},
      resolved_slots: resolved.resolvedSlots,
      asserted_answer: resolved.assertedAnswer,
      location_points: locationPointsOf(question),
    },
    answered: question.answered ?? false,
    accepted: question.accepted ?? false,
    created: question.created,
    modified: question.modified,
  };
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return Boolean(value);
}

/** Null unless the question has actually been answered — a legacy
 * AskedQuestion has no separate answer_id, so one is synthesized from the
 * question id (stable, and namespaced so it can never collide with a real
 * FactsV2 answer_id). */
export function convertLegacyAnswer(question: AskedQuestion): AnswerRecordDto | null {
  if (!question.answered || !question.answer_meta) return null;
  // answer_meta.metadata is typed as { text: string } on AskedQuestion, but
  // the fields actually submitted when auto-answering (auto_answered,
  // computation_method — see AnswerQuestionRequest) pass straight through
  // the backend and do turn up here in practice.
  const metadata = question.answer_meta.metadata as
    | { text?: string; auto_answered?: boolean; computation_method?: string }
    | undefined;

  return {
    answer_id: `qna-answer-${question.question_id}`,
    question_id: question.question_id,
    value: coerceBoolean(question.answer_meta.result),
    answered_at: question.modified,
    metadata: metadata?.auto_answered !== undefined || metadata?.computation_method !== undefined
      ? { auto_answered: metadata.auto_answered, computation_method: metadata.computation_method }
      : undefined,
  };
}

/** The full stage 2+3 -> 4 hop in one call: null if the category isn't
 * supported, required fields are missing, or the question hasn't been
 * answered yet. */
export function convertLegacyAskedQuestionToFact(question: AskedQuestion): FactDto | null {
  const record = convertLegacyAskedQuestion(question);
  const answer = convertLegacyAnswer(question);
  if (!record || !answer) return null;
  return toFactRecord(record, answer);
}

export function convertLegacyAskedQuestionsToFacts(questions: AskedQuestion[]): FactDto[] {
  return questions
    .map(convertLegacyAskedQuestionToFact)
    .filter((fact): fact is FactDto => fact !== null);
}
