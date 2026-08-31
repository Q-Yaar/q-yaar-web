import React from 'react';
import { Club, Hand, Layers } from 'lucide-react';
import { GameButton } from './GameButton';
import { CompactGameButton } from './CompactGameButton';

interface CardModuleProps {
  handCount: number;
  discardCount: number;
  /** Opens the reward picker (RewardPickerSheet) — Draw is reward-gated
   * now, so this never opens DrawCardModal directly; picking an unclaimed
   * reward there is what actually opens it (cards/useRewardClaimFlow.ts). */
  onOpenDraw: () => void;
  /** Unclaimed accepted-question rewards — Draw's badge count. */
  unclaimedRewardCount: number;
  onOpenHand: () => void;
  onOpenDiscard: () => void;
}

/**
 * The hider's card controls — Draw is the one thing you reach for often, so
 * it stays a full labeled GameButton (same as ModeActionButtons); Hand and
 * Discard are lower-frequency, "check on this occasionally" actions, so
 * they're smaller icon-only CompactGameButtons flanking it — a clear
 * primary action framed by two secondary ones, rather than three
 * equal-weight buttons in a row. The whole group uses the purple tone
 * (GameButton/CompactGameButton's `tone` prop) instead of the blue every
 * other action button uses, and Draw's icon is a literal card suit (Club)
 * — together that's what marks this row as "the card system" at a glance,
 * separate from ModeActionButtons' blue question actions. Takes the
 * bottom, thumb-closest row in MapCanvas (ModeActionButtons moves up to
 * make room) since drawing/checking cards is the more frequent action.
 */
export const CardModule: React.FC<CardModuleProps> = ({ handCount, discardCount, onOpenDraw, unclaimedRewardCount, onOpenHand, onOpenDiscard }) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: 'calc(18px + env(safe-area-inset-bottom))',
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}
  >
    <CompactGameButton icon={<Hand size={20} />} ariaLabel="View your hand" badge={handCount} onClick={onOpenHand} tone="purple" />
    <GameButton icon={<Club size={20} />} label="Draw" ariaLabel="Draw a card" badge={unclaimedRewardCount} onClick={onOpenDraw} tone="purple" />
    <CompactGameButton icon={<Layers size={20} />} ariaLabel="View discard pile" badge={discardCount} onClick={onOpenDiscard} tone="purple" />
  </div>
);
