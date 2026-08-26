import React from 'react';

export interface GameButtonProps {
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
  badge?: number;
  onClick?: () => void;
  disabled?: boolean;
  /** 'blue' (default) for ordinary actions; 'purple' marks the card system
   * specifically, so its whole button group reads as one distinct thing at
   * a glance rather than blending into the blue Ask/Answer actions; 'danger'
   * marks an active threat (an active curse) with a red gradient. */
  tone?: 'blue' | 'purple' | 'danger';
  /** Animated glow (Tailwind's animate-pulse) — for a button that needs to
   * visibly demand attention right now (an active curse), not just sit
   * there as an ordinary available action. */
  pulse?: boolean;
}

const TONE_CLASSES: Record<'blue' | 'purple' | 'danger', string> = {
  blue: 'border-white/30 bg-gradient-to-b from-[#4F91FF] to-[#1E56D6] text-white shadow-[0_5px_0_#123a91,0_8px_18px_rgba(30,86,214,0.5)] active:shadow-[0_1px_0_#123a91]',
  purple: 'border-white/30 bg-gradient-to-b from-[#B78CFF] to-[#7C3AED] text-white shadow-[0_5px_0_#4c1d95,0_8px_18px_rgba(124,58,237,0.5)] active:shadow-[0_1px_0_#4c1d95]',
  danger: 'border-red-300/50 bg-gradient-to-b from-[#FF6B6B] to-[#C81E1E] text-white shadow-[0_5px_0_#7f1414,0_8px_18px_rgba(200,30,30,0.55)] active:shadow-[0_1px_0_#7f1414]',
};

/**
 * A chunky, "pressable" game-HUD button — solid saturated fill, a hard
 * bottom edge (box-shadow, not a blur) standing in for bevel/depth, and a
 * real press animation (active:translate-y + the edge collapsing to
 * nothing) instead of the thin frosted-glass pills the rest of MapV2's
 * chrome uses. Deliberately a different register from IconButton/TopBar:
 * those are wayfinding chrome you glance at, this is the thing you're
 * actually tapping to play, so it should read like an action button in a
 * mobile game, not a settings toggle. Shared by every floating action
 * group (ModeActionButtons, CardModule) so they all read as one visual
 * system rather than each inventing its own button.
 */
export const GameButton: React.FC<GameButtonProps> = ({ icon, label, ariaLabel, badge, onClick, disabled, tone = 'blue', pulse }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`relative flex w-[86px] flex-col items-center justify-center gap-1 rounded-2xl border-2 py-2.5 transition-all ${pulse ? 'animate-pulse' : ''} ${
      disabled
        ? 'cursor-not-allowed border-white/10 bg-gradient-to-b from-[#5a5a5a] to-[#3a3a3a] text-white/50 shadow-[0_4px_0_#242424]'
        : `cursor-pointer active:translate-y-[4px] ${TONE_CLASSES[tone]}`
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
