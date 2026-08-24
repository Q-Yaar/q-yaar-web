import React from 'react';
import { CheckCircle2, MessageCircleQuestion, Plus, Sparkles } from 'lucide-react';
import { GAME_MODE, GameMode } from '../hooks/useGameMode';

interface ModeActionButtonsProps {
  mode: GameMode;
  onAnswerQuestions: () => void;
  pendingAnswerCount: number;
  onAskQuestion: () => void;
}

interface GameButtonProps {
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
  badge?: number;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * A chunky, "pressable" game-HUD button — solid saturated fill, a hard
 * bottom edge (box-shadow, not a blur) standing in for bevel/depth, and a
 * real press animation (active:translate-y + the edge collapsing to
 * nothing) instead of the thin frosted-glass pills the rest of MapV2's
 * chrome uses. Deliberately a different register from IconButton/TopBar:
 * those are wayfinding chrome you glance at, this is the thing you're
 * actually tapping to play, so it should read like an action button in a
 * mobile game, not a settings toggle.
 */
const GameButton: React.FC<GameButtonProps> = ({ icon, label, ariaLabel, badge, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`relative flex w-[86px] flex-col items-center justify-center gap-1 rounded-2xl border-2 py-2.5 transition-all ${
      disabled
        ? 'cursor-not-allowed border-white/10 bg-gradient-to-b from-[#5a5a5a] to-[#3a3a3a] text-white/50 shadow-[0_4px_0_#242424]'
        : 'cursor-pointer border-white/30 bg-gradient-to-b from-[#4F91FF] to-[#1E56D6] text-white shadow-[0_5px_0_#123a91,0_8px_18px_rgba(30,86,214,0.5)] active:translate-y-[4px] active:shadow-[0_1px_0_#123a91]'
    }`}
  >
    {badge !== undefined && badge > 0 && (
      <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-[#141414] bg-[#E11900] px-1 text-[10px] font-extrabold text-white">
        {badge}
      </span>
    )}
    <span className="flex items-center justify-center">{icon}</span>
    <span className="text-[10.5px] font-extrabold uppercase tracking-wide leading-none">{label}</span>
  </button>
);

/**
 * Bottom-center action pair, mode-aware — only the buttons relevant to
 * whatever the player is currently doing, side by side rather than stacked
 * so both read as one deliberate set of controls right where a thumb
 * naturally rests, not a corner-anchored FAB. Hiding shows "Answer" —
 * functional, useAnswerQuestionsFlow, with a live pending-count badge — next
 * to a "Draw cards" stub; Seeking shows "Ask" — functional, the draft-fact
 * wizard — next to an "Accept" stub. Both stubs are deliberately
 * visible-but-disabled rather than hidden, so the mode reads as "two
 * actions available here" even before the second one is wired up.
 */
export const ModeActionButtons: React.FC<ModeActionButtonsProps> = ({ mode, onAnswerQuestions, pendingAnswerCount, onAskQuestion }) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: 'calc(18px + env(safe-area-inset-bottom))',
      zIndex: 20,
      display: 'flex',
      gap: '14px',
    }}
  >
    {mode === GAME_MODE.HIDING ? (
      <>
        <GameButton icon={<Sparkles size={20} />} label="Draw cards" ariaLabel="Draw cards (coming soon)" disabled />
        <GameButton
          icon={<MessageCircleQuestion size={20} />}
          label="Answer"
          ariaLabel="Answer questions"
          badge={pendingAnswerCount}
          onClick={onAnswerQuestions}
        />
      </>
    ) : (
      <>
        <GameButton icon={<CheckCircle2 size={20} />} label="Accept" ariaLabel="Accept answers (coming soon)" disabled />
        <GameButton icon={<Plus size={20} />} label="Ask" ariaLabel="Ask a question" onClick={onAskQuestion} />
      </>
    )}
  </div>
);
