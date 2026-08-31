import React from 'react';
import { Check, Gift, Loader2 } from 'lucide-react';
import { AskedQuestionV2 } from '../factsV2/questionPipelineTypes';
import { renderAskedQuestionText } from '../factsV2/templateQuestionBuilder';
import { BottomSheet } from './BottomSheet';

export interface RewardPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Every accepted, reward-bearing question targeting this team — claimed
   * ones included (see claimedIds), not filtered out, so a hider can still
   * see what they already claimed rather than the row just vanishing. */
  questions: AskedQuestionV2[];
  questionsLoading: boolean;
  claimedIds: Set<string>;
  /** Claiming a reward opens DrawCardModal bounded to its draw/pick counts
   * (cards/useRewardClaimFlow.ts) — never called for an already-claimed row. */
  onSelect: (question: AskedQuestionV2) => void;
}

/**
 * Step 1 of claiming a reward — the CardModule Draw button's badge count is
 * how many of these are still unclaimed; this sheet is where the hider
 * actually picks *which* one to claim right now. Picking an unclaimed row
 * opens DrawCardModal bounded to that reward's "draw N, pick M"
 * (models/QnA.ts's Reward.reward_meta); the reward isn't spent until that
 * draw call actually succeeds, so backing out of DrawCardModal leaves it
 * claimable here still. Modeled on AcceptAnswersSheet's list-row pattern.
 */
export const RewardPickerSheet: React.FC<RewardPickerSheetProps> = ({
  isOpen, onClose, questions, questionsLoading, claimedIds, onSelect,
}) => (
  <BottomSheet isOpen={isOpen} title="Claim a reward" leftAction={{ label: 'Close', onClick: onClose }}>
    {questionsLoading ? (
      <div className="text-[11px] text-white/40 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading rewards…</div>
    ) : questions.length === 0 ? (
      <p className="text-[11px] text-white/40">No rewards yet — an accepted question with a reward shows up here.</p>
    ) : (
      <div className="space-y-1.5">
        {questions.map((q) => {
          const claimed = claimedIds.has(q.question_id);
          return (
            <button
              key={q.question_id}
              onClick={() => !claimed && onSelect(q)}
              disabled={claimed}
              className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                claimed
                  ? 'border-white/5 opacity-40 cursor-not-allowed'
                  : 'border-white/10 hover:border-white/30 hover:bg-white/5 active:bg-white/10'
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold text-white">{renderAskedQuestionText(q)}</span>
                <span className="block text-[11px] text-white/40">
                  {q.reward?.reward_name ?? 'Reward'} — draw {q.reward?.reward_meta.draw}, pick {q.reward?.reward_meta.pick}
                </span>
              </span>
              {claimed ? (
                <span className="flex items-center gap-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  <Check className="w-3.5 h-3.5" /> Claimed
                </span>
              ) : (
                <Gift className="w-4 h-4 shrink-0 text-purple-300" />
              )}
            </button>
          );
        })}
      </div>
    )}
  </BottomSheet>
);
