import { FACT_TYPE, FactDto } from './factTypes';
import { DraftAskedQuestion } from './questionPipelineTypes';

/**
 * A draft has no Answer yet, so there's no hider boolean to flip
 * assertedAnswer against — question_meta.assumed_value stands in for it,
 * picked by the asker in the wizard's review step (default: assume the
 * asserted pole holds). Marked with a `draft-` answer_id prefix so it's
 * obviously not a real Answer record. The backend has no concept of an
 * unanswered draft at all (see useFactsLayers.ts's draftQuestions), so this
 * conversion only ever runs on this session's own in-progress local state,
 * never on anything fetched from an API.
 */
export function draftQuestionToFact(question: DraftAskedQuestion): FactDto {
  const { answer_instruction_type, resolved_slots, asserted_answer, assumed_value } = question.question_meta;
  return {
    fact_id: `draft-${question.question_id}`,
    fact_type: FACT_TYPE.GEO,
    question_id: question.question_id,
    answer_id: `draft-${question.question_id}`,
    fact_info: {
      op_type: answer_instruction_type,
      op_meta: { ...resolved_slots, assertedAnswer: asserted_answer, value: assumed_value },
    },
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  };
}
