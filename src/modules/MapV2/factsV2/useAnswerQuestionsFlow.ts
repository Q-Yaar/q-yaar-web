import { useCallback, useMemo, useState } from 'react';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import { FACT_TYPE, FactDto } from './factTypes';
import { AskedQuestionRecordDto, toFactRecord } from './questionPipelineTypes';
import { useAnswerQuestionMutation, useGetPendingQuestionsQuery } from '../apis/mockQnaApi';
import { GROUP_ID } from '../layers/groupIds';
import { useMapLayerModule } from '../layers/hooks';
import { FactItem, FactsLayerModule } from '../layers/modules/FactsLayerModule';
import { ANSWER_PREVIEW_MODULE_ID } from './factsLayerIds';
import { ANSWER_STEP, AnswerQuestionsSheetProps, AnswerStep } from '../components/AnswerQuestionsSheet';

export interface UseAnswerQuestionsFlowOptions {
  teamId: string | null;
  /** Same starting area the confirmed Facts layer currently folds down to
   * (useFactsLayers's draftsUniverse) — the live preview folds from here
   * too, so Yes/No shows exactly what this team's facts will look like
   * once submitted, not just the raw shape in isolation. */
  previewUniverse: () => Feature<Polygon | MultiPolygon>;
  /** Called once the mock answer call resolves — the caller (MapCanvas)
   * merges this into useFactsLayers's extraFacts so it renders as a real
   * fact immediately. */
  onAnswered: (fact: FactDto) => void;
}

export interface UseAnswerQuestionsFlowResult {
  /** Spread directly onto <AnswerQuestionsSheet>. */
  props: AnswerQuestionsSheetProps;
  openSheet: () => void;
  pendingCount: number;
}

/**
 * The Hider's "Answer questions" flow as one hook — fetching pending
 * questions (apis/mockQnaApi.ts), picking one, a Yes/No toggle with a live
 * on-map preview, and the final submit, which calls the mock answer API
 * then hands the resulting Fact to onAnswered. Answered questions are
 * tracked locally (answeredIds) since the mock pending-questions list has
 * no real backend to mutate — same reasoning useFactsLayers's draftQuestions
 * uses for wizard-created drafts.
 */
export function useAnswerQuestionsFlow({ teamId, previewUniverse, onAnswered }: UseAnswerQuestionsFlowOptions): UseAnswerQuestionsFlowResult {
  const { data: fetchedQuestions, isLoading: questionsLoading } = useGetPendingQuestionsQuery(teamId);
  const [answerQuestion, { isLoading: submitting }] = useAnswerQuestionMutation();

  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<AnswerStep>(ANSWER_STEP.LIST);
  const [selectedQuestion, setSelectedQuestion] = useState<AskedQuestionRecordDto | null>(null);
  const [value, setValue] = useState(true);

  const questions = useMemo(
    () => (fetchedQuestions ?? []).filter((q) => !answeredIds.has(q.question_id)),
    [fetchedQuestions, answeredIds],
  );

  const openSheet = useCallback(() => {
    setStep(ANSWER_STEP.LIST);
    setSelectedQuestion(null);
    setValue(true);
    setIsOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setIsOpen(false);
    setStep(ANSWER_STEP.LIST);
    setSelectedQuestion(null);
  }, []);

  const selectQuestion = useCallback((question: AskedQuestionRecordDto) => {
    setSelectedQuestion(question);
    setValue(true);
    setStep(ANSWER_STEP.ANSWER);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedQuestion) return;
    answerQuestion({ question_id: selectedQuestion.question_id, value })
      .then((answer) => {
        onAnswered(toFactRecord(selectedQuestion, answer));
        setAnsweredIds((prev) => new Set(prev).add(selectedQuestion.question_id));
        closeSheet();
      })
      .catch((err) => {
        console.warn('[MapV2] Mock answer-question call failed', err);
      });
  }, [selectedQuestion, value, answerQuestion, onAnswered, closeSheet]);

  // Live preview — the candidate fact this question would become if
  // submitted with whichever value is currently toggled, folded on top of
  // previewUniverse exactly like a real answer would be once added.
  const previewFact = useMemo<FactDto | null>(() => {
    if (!selectedQuestion) return null;
    const { resolved_slots, asserted_answer } = selectedQuestion.question_meta;
    return {
      fact_id: `answer-preview-${selectedQuestion.question_id}`,
      fact_type: FACT_TYPE.GEO,
      question_id: selectedQuestion.question_id,
      answer_id: 'preview',
      fact_info: {
        op_type: selectedQuestion.answer_instruction_type,
        op_meta: { ...resolved_slots, assertedAnswer: asserted_answer, value },
      },
      created: selectedQuestion.created,
      modified: selectedQuestion.modified,
    };
  }, [selectedQuestion, value]);

  const [previewModule] = useState(() => new FactsLayerModule(
    { id: ANSWER_PREVIEW_MODULE_ID, groupId: GROUP_ID.FACTS, label: 'Answer preview', fillColor: '#FFC043', fillOpacity: 0.3, dashed: true },
    previewUniverse,
  ));
  const previewItems = useMemo<FactItem[]>(
    () => (previewFact ? [{ id: previewFact.fact_id, fact: previewFact }] : []),
    [previewFact],
  );
  useMapLayerModule(previewModule, previewItems);

  const props: AnswerQuestionsSheetProps = {
    isOpen,
    onClose: closeSheet,
    step,
    onBack: () => setStep(ANSWER_STEP.LIST),
    questions,
    questionsLoading,
    onSelectQuestion: selectQuestion,
    selectedQuestion,
    value,
    onSetValue: setValue,
    onSubmit: handleSubmit,
    submitting,
  };

  return { props, openSheet, pendingCount: questions.length };
}
