import { useCallback, useEffect, useMemo, useState } from 'react';
import { AskedQuestionV2 } from '../factsV2/questionPipelineTypes';
import { useGetRewardableQuestionsQuery } from '../apis/qnaPipelineApi';
import { RewardPickerSheetProps } from '../components/RewardPickerSheet';
import { UseCardModuleResult } from './useCardModule';

const storageKey = (gameId: string | undefined): string => `mapv2-claimed-rewards-${gameId ?? 'default'}`;

function readClaimedIds(gameId: string | undefined): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function writeClaimedIds(gameId: string | undefined, ids: Set<string>): void {
  try {
    localStorage.setItem(storageKey(gameId), JSON.stringify(Array.from(ids)));
  } catch {
    // Best-effort only, same as useHidingZone.ts — a failed write just
    // means a claim won't survive a reload, not a broken claim.
  }
}

export interface UseRewardClaimFlowOptions {
  gameId: string | undefined;
  /** The hider's own team — target_team_id on every question this reward
   * list is scoped to, same team useAnswerQuestionsFlow answers for. */
  teamId: string | null;
  cardModule: UseCardModuleResult;
}

export interface UseRewardClaimFlowResult {
  /** CardModule's Draw button badge — accepted, reward-bearing questions
   * NOT yet claimed. Claimed ones stay in the picker sheet (marked
   * "Claimed"), just excluded from this count. */
  unclaimedCount: number;
  /** Spread directly onto <RewardPickerSheet>. */
  props: RewardPickerSheetProps;
  /** Draw button's onClick — always opens the picker first, per "pick
   * which reward to claim before drawing," even when there's nothing to
   * claim yet (the sheet shows its own empty state then). */
  openPicker: () => void;
}

/**
 * Bridges the Q&A "accept" flow's rewards (a category's "draw N, pick M"
 * card reward, unlocked once a question is accepted — models/QnA.ts's
 * Reward, echoed onto AskedQuestionV2.reward) into the card system's own
 * draw mechanic (cards/useCardModule.ts). No real backend field exists for
 * "claimed" yet, so that half is tracked purely client-side (localStorage,
 * same per-game keying hooks/useHidingZone.ts uses) — a claim is recorded
 * the moment the draw call actually succeeds (DrawOptions.onDrawn), before
 * the modal even finishes closing, not on some later confirmation step.
 */
export function useRewardClaimFlow({ gameId, teamId, cardModule }: UseRewardClaimFlowOptions): UseRewardClaimFlowResult {
  const { data: rewardable, isLoading } = useGetRewardableQuestionsQuery(gameId, teamId);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(() => readClaimedIds(gameId));
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    setClaimedIds(readClaimedIds(gameId));
  }, [gameId]);

  // Unclaimed first so the actionable rows sit above ones already handled.
  const questions = useMemo(() => {
    const all = rewardable ?? [];
    return [...all].sort((a, b) => Number(claimedIds.has(a.question_id)) - Number(claimedIds.has(b.question_id)));
  }, [rewardable, claimedIds]);

  const unclaimedCount = useMemo(
    () => (rewardable ?? []).filter((q) => !claimedIds.has(q.question_id)).length,
    [rewardable, claimedIds],
  );

  const openPicker = useCallback(() => setIsPickerOpen(true), []);
  const closePicker = useCallback(() => setIsPickerOpen(false), []);

  const claimReward = useCallback((question: AskedQuestionV2) => {
    const reward = question.reward;
    if (!reward) return;
    setIsPickerOpen(false);
    cardModule.openDrawModal({
      maxCards: reward.reward_meta.draw,
      maxPick: reward.reward_meta.pick,
      onDrawn: () => {
        setClaimedIds((prev) => {
          const next = new Set(prev).add(question.question_id);
          writeClaimedIds(gameId, next);
          return next;
        });
      },
    });
  }, [cardModule, gameId]);

  const props: RewardPickerSheetProps = {
    isOpen: isPickerOpen,
    onClose: closePicker,
    questions,
    questionsLoading: isLoading,
    claimedIds,
    onSelect: claimReward,
  };

  return { unclaimedCount, props, openPicker };
}
