import { useCallback, useMemo, useState } from 'react';
import { FACT_TYPE } from './factTypes';
import { AskedQuestionV2 } from './questionPipelineTypes';
import { useGetAnsweredQuestionsQuery } from '../apis/qnaPipelineApi';
import { useAcceptAnswerMutation } from '../../../apis/qnaApi';
import { useCreateFactMutation } from '../../../apis/api';
import { AcceptAnswersSheetProps } from '../components/AcceptAnswersSheet';

export interface UseAcceptAnswersFlowOptions {
  gameId: string | undefined;
  /** The team this seeker has been asking — teamFilter.selectedTeamId,
   * same target_team_id the questions were asked with, and whose facts
   * this newly-created one belongs to (see useFactsLayers's factsTeamId,
   * which reads the exact same team in Seeking mode). */
  teamId: string | null;
  /** Called alongside the real createFact call so the matching local draft
   * (created when this question was first asked — see
   * useDraftFactWizard.ts) stops shading the map with its own
   * assumed-value guess now that the real fact has taken its place. */
  onRemoveDraft: (questionId: string) => void;
}

export interface UseAcceptAnswersFlowResult {
  /** Spread directly onto <AcceptAnswersSheet>. */
  props: AcceptAnswersSheetProps;
  openSheet: () => void;
  pendingCount: number;
}

/**
 * The Seeker's "Accept answers" flow as one hook — fetching this team's
 * answered-but-unaccepted questions (apis/qnaPipelineApi.ts's
 * useGetAnsweredQuestionsQuery) and accepting one, which does two real
 * writes: createFact (src/apis/api.ts) persists the question's already-
 * resolved slots/asserted answer/hider's value as a real FactsV2-shaped
 * fact (op_type/op_meta — see factV2Converter.ts, which reads it back), and
 * acceptAnswer (src/apis/qnaApi.ts) marks the question itself accepted so
 * it drops off this list. createFact invalidates the same tag
 * useFactsLayers's useGetFactsQuery subscribes to, so the new fact shows up
 * through the real refetch — no local fact-state juggling needed here, only
 * the local draft still needs an explicit removal (see onRemoveDraft).
 * Unlike the Ask/Answer flows there's no map preview or multi-step review
 * here — the hider's Yes/No is already final by the time it reaches this
 * list, so accepting is one tap. Accepted questions are also tracked
 * locally (acceptedIds) so a just-accepted question disappears from the
 * list immediately rather than waiting on the next poll/refetch.
 */
export function useAcceptAnswersFlow({ gameId, teamId, onRemoveDraft }: UseAcceptAnswersFlowOptions): UseAcceptAnswersFlowResult {
  const { data: fetchedQuestions, isLoading: questionsLoading } = useGetAnsweredQuestionsQuery(gameId, teamId);
  const [acceptAnswerMutation] = useAcceptAnswerMutation();
  const [createFact] = useCreateFactMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const questions = useMemo(
    () => (fetchedQuestions ?? []).filter((q) => !acceptedIds.has(q.question_id)),
    [fetchedQuestions, acceptedIds],
  );

  const openSheet = useCallback(() => setIsOpen(true), []);
  const closeSheet = useCallback(() => setIsOpen(false), []);

  const acceptQuestion = useCallback((question: AskedQuestionV2) => {
    const result = question.answer_meta?.result;
    if (!gameId || !teamId || typeof result !== 'boolean') return;

    setAcceptingId(question.question_id);
    const { answer_instruction_type, asserted_answer, resolved_slots } = question.question_meta;

    Promise.all([
      createFact({
        game_id: gameId,
        team_id: teamId,
        fact_type: FACT_TYPE.GEO,
        fact_info: {
          op_type: answer_instruction_type,
          op_meta: { ...resolved_slots, assertedAnswer: asserted_answer, value: result },
          question_id: question.question_id,
          answer_id: `qna-answer-${question.question_id}`,
        },
      }).unwrap(),
      acceptAnswerMutation({ gameId, askedQuestionId: question.question_id }).unwrap(),
    ])
      .then(() => {
        onRemoveDraft(question.question_id);
        setAcceptedIds((prev) => new Set(prev).add(question.question_id));
      })
      .catch((err) => {
        console.warn('[MapV2] Accept-answer call failed', err);
      })
      .finally(() => setAcceptingId(null));
  }, [gameId, teamId, createFact, acceptAnswerMutation, onRemoveDraft]);

  const props: AcceptAnswersSheetProps = {
    isOpen,
    onClose: closeSheet,
    questions,
    questionsLoading,
    onAccept: acceptQuestion,
    acceptingId,
  };

  return { props, openSheet, pendingCount: questions.length };
}
