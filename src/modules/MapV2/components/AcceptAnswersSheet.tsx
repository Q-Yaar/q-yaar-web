import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { AskedQuestionV2 } from '../factsV2/questionPipelineTypes';
import { BottomSheet } from './BottomSheet';

export interface AcceptAnswersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  questions: AskedQuestionV2[];
  questionsLoading: boolean;
  onAccept: (question: AskedQuestionV2) => void;
  /** The question currently mid-accept, if any — disables just that row
   * rather than the whole list. */
  acceptingId: string | null;
}

/**
 * The Seeker's "Accept answers" flow — every question this team has asked
 * that the hider has answered but nobody's accepted yet
 * (useAcceptAnswersFlow.ts's useGetAnsweredQuestionsQuery). No shape/review
 * step like the Ask/Answer sheets: the hider's Yes/No is already final by
 * the time a row shows up here, so tapping a row accepts it directly and
 * turns it into a real fact. Renders as a BottomSheet, same reasoning as
 * the other two flows.
 */
export const AcceptAnswersSheet: React.FC<AcceptAnswersSheetProps> = ({
  isOpen, onClose, questions, questionsLoading, onAccept, acceptingId,
}) => (
  <BottomSheet isOpen={isOpen} title="Accept answers" leftAction={{ label: 'Close', onClick: onClose }}>
    {questionsLoading ? (
      <div className="text-[11px] text-white/40 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading answers…</div>
    ) : questions.length === 0 ? (
      <p className="text-[11px] text-white/40">No answers waiting to be accepted right now.</p>
    ) : (
      <div className="space-y-1.5">
        {questions.map((q) => {
          const accepting = acceptingId === q.question_id;
          return (
            <button
              key={q.question_id}
              onClick={() => onAccept(q)}
              disabled={accepting}
              className="w-full flex items-center gap-2.5 rounded-lg border border-white/10 px-3 py-2.5 text-left transition-colors hover:border-white/30 hover:bg-white/5 active:bg-white/10 disabled:opacity-50"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold text-white">{q.rendered_question}</span>
                <span className="block text-[11px] text-white/40">
                  {q.category.category_name} — answered {q.answer_meta?.result ? 'Yes' : 'No'}
                </span>
              </span>
              {accepting ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-white/60" /> : <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
            </button>
          );
        })}
      </div>
    )}
  </BottomSheet>
);
