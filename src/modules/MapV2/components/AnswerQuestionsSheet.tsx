import React from 'react';
import { Loader2 } from 'lucide-react';
import { AskedQuestionV2 } from '../factsV2/questionPipelineTypes';
import { BottomSheet } from './BottomSheet';

export const ANSWER_STEP = {
  LIST: 'list',
  SHAPE: 'shape',
  ANSWER: 'answer',
} as const;

export type AnswerStep = (typeof ANSWER_STEP)[keyof typeof ANSWER_STEP];

export interface AnswerQuestionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  step: AnswerStep;
  onBack: () => void;

  questions: AskedQuestionV2[];
  questionsLoading: boolean;
  onSelectQuestion: (question: AskedQuestionV2) => void;

  selectedQuestion: AskedQuestionV2 | null;
  /** SHAPE -> ANSWER — once the hider has seen what the question is
   * actually asking about. */
  onContinueToAnswer: () => void;
  value: boolean;
  onSetValue: (value: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
}

/**
 * The Hider's "Answer questions" flow — step 1 lists every question this
 * team hasn't answered yet (apis/qnaPipelineApi.ts's useGetPendingQuestionsQuery),
 * step 2 is a Yes/No toggle with a live amber map preview (same
 * FactsLayerModule pattern the Ask a Question wizard's review step uses —
 * see useAnswerQuestionsFlow.ts) before committing. Renders as a
 * BottomSheet, same reasoning as CreateDraftFactWizard: the map stays
 * visible and interactive underneath while a hider picks which fact their
 * answer becomes.
 */
export const AnswerQuestionsSheet: React.FC<AnswerQuestionsSheetProps> = ({
  isOpen, onClose, step, onBack,
  questions, questionsLoading, onSelectQuestion,
  selectedQuestion, onContinueToAnswer, value, onSetValue, onSubmit, submitting,
}) => {
  const title = step === ANSWER_STEP.LIST ? 'Answer questions' : selectedQuestion?.category.category_name ?? 'Answer';

  const leftAction = step === ANSWER_STEP.LIST
    ? { label: 'Close', onClick: onClose }
    : { label: 'Back', onClick: onBack, disabled: submitting };

  const rightAction = step === ANSWER_STEP.SHAPE
    ? { label: 'Continue', onClick: onContinueToAnswer }
    : step === ANSWER_STEP.ANSWER
      ? { label: submitting ? 'Saving…' : 'Submit', onClick: onSubmit, disabled: submitting }
      : undefined;

  return (
    <BottomSheet isOpen={isOpen} title={title} leftAction={leftAction} rightAction={rightAction}>
      {step === ANSWER_STEP.LIST && (
        questionsLoading ? (
          <div className="text-[11px] text-white/40 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading questions…</div>
        ) : questions.length === 0 ? (
          <p className="text-[11px] text-white/40">No questions waiting for an answer right now.</p>
        ) : (
          <div className="space-y-1.5">
            {questions.map((q) => (
              <button
                key={q.question_id}
                onClick={() => onSelectQuestion(q)}
                className="w-full rounded-lg border border-white/10 px-3 py-2.5 text-left transition-colors hover:border-white/30 hover:bg-white/5 active:bg-white/10"
              >
                <span className="block text-xs font-semibold text-white">{q.rendered_question}</span>
                <span className="block text-[11px] text-white/40">{q.category.category_name}</span>
              </button>
            ))}
          </div>
        )
      )}

      {step === ANSWER_STEP.SHAPE && selectedQuestion && (
        <div className="space-y-3">
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
            {selectedQuestion.rendered_question}
          </div>
          <p className="text-[11px] text-white/40">
            The cyan shape on the map is exactly what this question is asking about, bounded by the game area — take a look before you answer.
          </p>
        </div>
      )}

      {step === ANSWER_STEP.ANSWER && selectedQuestion && (
        <div className="space-y-3">
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
            {selectedQuestion.rendered_question}
          </div>

          <div>
            <div className="text-xs font-semibold text-white mb-1.5">Your answer</div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onSetValue(true)}
                className={`flex-1 h-9 rounded-full text-xs font-semibold border transition-colors ${
                  value ? 'bg-emerald-500 text-white border-emerald-500' : 'border-white/20 text-white/70 hover:border-white/40'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => onSetValue(false)}
                className={`flex-1 h-9 rounded-full text-xs font-semibold border transition-colors ${
                  !value ? 'bg-rose-500 text-white border-rose-500' : 'border-white/20 text-white/70 hover:border-white/40'
                }`}
              >
                No
              </button>
            </div>
          </div>

          <p className="text-[11px] text-white/40">
            The amber shape on the map previews what your team's facts will look like once you submit this answer.
          </p>
        </div>
      )}
    </BottomSheet>
  );
};
