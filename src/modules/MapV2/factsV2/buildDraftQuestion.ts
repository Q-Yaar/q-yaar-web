import { ANSWER, AskedQuestionDto, OP_TYPE, POINT_SOURCE, ResolvedLatLon } from './factTypes';

export const formatDistance = (metres: number): string => (
  metres >= 1000 ? `${(metres / 1000).toFixed(metres % 1000 === 0 ? 0 : 1)} km` : `${metres} m`
);

/** Human-readable stand-in for a resolved point, used in the wizard's live
 * preview sentence and the rendered_question it produces. */
export const describeResolvedPoint = (p: ResolvedLatLon | null): string => {
  if (!p) return 'a point';
  if (p.source === POINT_SOURCE.ASKER_LOCATION) {
    return p.accuracy_m ? `your location (±${p.accuracy_m} m)` : 'your location';
  }
  return `the point you picked (${Number(p.lat).toFixed(4)}, ${Number(p.lon).toFixed(4)})`;
};

const newQuestionId = (): string => `q-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** The three human-friendly question kinds the draft-fact wizard offers. */
export const WIZARD_KIND = {
  CIRCLE: 'circle',
  ZONE: 'zone',
  HOTTER_COLDER: 'hotter_colder',
} as const;

export type WizardKind = (typeof WIZARD_KIND)[keyof typeof WIZARD_KIND];

export type DraftQuestionInput = (
  | { kind: typeof WIZARD_KIND.CIRCLE; center: ResolvedLatLon; radius: number }
  | { kind: typeof WIZARD_KIND.ZONE; zoneKey: string; zoneLabel: string }
  | { kind: typeof WIZARD_KIND.HOTTER_COLDER; pointA: ResolvedLatLon; pointB: ResolvedLatLon }
) & {
  /** What the wizard's review step assumes the hider will answer — see
   * AskedQuestionDto.question_meta.assumed_value. */
  assumedValue: boolean;
};

/**
 * Turns the wizard's plain-language inputs into an AskedQuestionDto —
 * the same stage-2 shape "Ask to Fact" describes, just built by a friendly
 * form instead of a technical map tool. draftQuestionToFact() (mockData.ts)
 * takes it from here through the same factToRegion path as a real question.
 */
export function buildDraftQuestion(input: DraftQuestionInput): AskedQuestionDto {
  const question_id = newQuestionId();

  switch (input.kind) {
    case WIZARD_KIND.CIRCLE:
      return {
        question_id,
        rendered_question: `Are you within ${formatDistance(input.radius)} of ${describeResolvedPoint(input.center)}?`,
        answer_instruction_type: OP_TYPE.POINT_BUFFER_INSIDE,
        question_meta: {
          resolved_slots: { point: input.center, radius: input.radius },
          asserted_answer: ANSWER.INSIDE,
          assumed_value: input.assumedValue,
        },
      };
    case WIZARD_KIND.ZONE:
      return {
        question_id,
        rendered_question: `Are you inside ${input.zoneLabel}?`,
        answer_instruction_type: OP_TYPE.POLYGON_INSIDE,
        question_meta: {
          resolved_slots: { polygon: input.zoneKey },
          asserted_answer: ANSWER.INSIDE,
          assumed_value: input.assumedValue,
        },
      };
    case WIZARD_KIND.HOTTER_COLDER:
      return {
        question_id,
        rendered_question: `Compared to ${describeResolvedPoint(input.pointA)}, are you now closer to ${describeResolvedPoint(input.pointB)}?`,
        answer_instruction_type: OP_TYPE.TWO_POINT_BISECTOR,
        question_meta: {
          resolved_slots: { point: input.pointA, pointFinal: input.pointB },
          asserted_answer: ANSWER.HOTTER,
          assumed_value: input.assumedValue,
        },
      };
    default: {
      const _exhaustive: never = input;
      throw new Error(`Unknown draft question kind: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
