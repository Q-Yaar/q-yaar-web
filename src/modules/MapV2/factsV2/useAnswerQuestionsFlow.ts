import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import { FACT_TYPE, FactDto } from './factTypes';
import { AskedQuestionRecordDto, toFactRecord } from './questionPipelineTypes';
import { useAnswerQuestionMutation, useGetPendingQuestionsQuery } from '../apis/mockQnaApi';
import { GROUP_ID } from '../layers/groupIds';
import { useMapLayerModule } from '../layers/hooks';
import { FactItem, FactsLayerModule } from '../layers/modules/FactsLayerModule';
import { WizardShapeItem, WizardShapePreviewModule } from '../layers/modules/WizardShapePreviewModule';
import { foldFactsAreaInWorker } from './geoWorkerClient';
import { ANSWER_PREVIEW_MODULE_ID, ANSWER_SHAPE_PREVIEW_MODULE_ID } from './factsLayerIds';
import { ANSWER_STEP, AnswerQuestionsSheetProps, AnswerStep } from '../components/AnswerQuestionsSheet';

export interface UseAnswerQuestionsFlowOptions {
  teamId: string | null;
  /** Same starting area the confirmed Facts layer currently folds down to
   * (useFactsLayers's draftsUniverse) — the live Yes/No preview folds from
   * here too, so it shows exactly what this team's facts will look like
   * once submitted, not just the raw shape in isolation. */
  previewUniverse: () => Feature<Polygon | MultiPolygon>;
  /** The raw game zone, unreduced by any fact — what the new shape step is
   * bounded to instead of previewUniverse, same reasoning as the
   * ask-question wizard's details step: at that point the question isn't
   * "what stays possible," just "what does this shape look like." */
  playArea: Feature<Polygon | MultiPolygon>;
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
 * questions (apis/mockQnaApi.ts), picking one, a shape step showing the
 * question's raw geometry bounded only by the game zone, a Yes/No toggle
 * with a live on-map preview, and the final submit, which calls the mock
 * answer API then hands the resulting Fact to onAnswered. Answered
 * questions are tracked locally (answeredIds) since the mock
 * pending-questions list has no real backend to mutate — same reasoning
 * useFactsLayers's draftQuestions uses for wizard-created drafts.
 */
export function useAnswerQuestionsFlow({ teamId, previewUniverse, playArea, onAnswered }: UseAnswerQuestionsFlowOptions): UseAnswerQuestionsFlowResult {
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
    setStep(ANSWER_STEP.SHAPE);
  }, []);

  const goBack = useCallback(() => {
    setStep((current) => (current === ANSWER_STEP.ANSWER ? ANSWER_STEP.SHAPE : ANSWER_STEP.LIST));
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

  // Shape step — the question's raw region assuming its asserted pole
  // holds (there's no yes/no toggle yet at this step), clipped only to the
  // game zone. Same idea as the ask-question wizard's details-step shape
  // preview (WizardShapePreviewModule), so a hider sees what the question
  // is actually asking about before committing to an answer.
  const shapeFact = useMemo<FactDto | null>(() => {
    if (step !== ANSWER_STEP.SHAPE || !selectedQuestion) return null;
    const { resolved_slots, asserted_answer } = selectedQuestion.question_meta;
    return {
      fact_id: `answer-shape-${selectedQuestion.question_id}`,
      fact_type: FACT_TYPE.GEO,
      question_id: selectedQuestion.question_id,
      answer_id: 'shape-preview',
      fact_info: {
        op_type: selectedQuestion.answer_instruction_type,
        op_meta: { ...resolved_slots, assertedAnswer: asserted_answer, value: true },
      },
      created: selectedQuestion.created,
      modified: selectedQuestion.modified,
    };
  }, [step, selectedQuestion]);

  const [shapeModule] = useState(() => new WizardShapePreviewModule({
    id: ANSWER_SHAPE_PREVIEW_MODULE_ID,
    label: 'Answer shape preview',
    color: '#22D3EE',
  }));
  const [shapeArea, setShapeArea] = useState<Feature<Polygon | MultiPolygon> | null>(null);
  const shapeGenerationRef = useRef(0);
  useEffect(() => {
    if (!shapeFact) {
      setShapeArea(null);
      return;
    }
    const generation = ++shapeGenerationRef.current;
    foldFactsAreaInWorker(playArea, [shapeFact])
      .then((area) => {
        if (generation !== shapeGenerationRef.current) return;
        setShapeArea(area);
      })
      .catch((err) => {
        console.warn('[MapV2] Failed to compute answer shape preview', err);
      });
  }, [shapeFact, playArea]);
  const shapeItems = useMemo<WizardShapeItem[]>(
    () => (shapeArea ? [{ id: 'shape', geometry: shapeArea.geometry }] : []),
    [shapeArea],
  );
  useMapLayerModule(shapeModule, shapeItems);

  // Live preview — the candidate fact this question would become if
  // submitted with whichever value is currently toggled, folded on top of
  // previewUniverse exactly like a real answer would be once added.
  const previewFact = useMemo<FactDto | null>(() => {
    if (step !== ANSWER_STEP.ANSWER || !selectedQuestion) return null;
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
  }, [step, selectedQuestion, value]);

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
    onBack: goBack,
    questions,
    questionsLoading,
    onSelectQuestion: selectQuestion,
    selectedQuestion,
    onContinueToAnswer: () => setStep(ANSWER_STEP.ANSWER),
    value,
    onSetValue: setValue,
    onSubmit: handleSubmit,
    submitting,
  };

  return { props, openSheet, pendingCount: questions.length };
}
