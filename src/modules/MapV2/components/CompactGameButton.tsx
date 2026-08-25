import React from 'react';

export interface CompactGameButtonProps {
  icon: React.ReactNode;
  ariaLabel: string;
  badge?: number;
  onClick?: () => void;
  disabled?: boolean;
  /** See GameButtonProps.tone — same reasoning, same two options. */
  tone?: 'blue' | 'purple';
}

const TONE_CLASSES: Record<'blue' | 'purple', string> = {
  blue: 'border-white/30 bg-gradient-to-b from-[#4F91FF] to-[#1E56D6] text-white shadow-[0_4px_0_#123a91,0_6px_14px_rgba(30,86,214,0.45)] active:shadow-[0_1px_0_#123a91]',
  purple: 'border-white/30 bg-gradient-to-b from-[#B78CFF] to-[#7C3AED] text-white shadow-[0_4px_0_#4c1d95,0_6px_14px_rgba(124,58,237,0.45)] active:shadow-[0_1px_0_#4c1d95]',
};

/**
 * A smaller, round sibling of GameButton — same chunky press-button
 * material (gradient fill, hard bottom edge, real press animation), just
 * icon-only and half the footprint. For a secondary action riding along
 * next to a primary GameButton (Hand/Discard flanking Draw in CardModule)
 * where three full-size labeled buttons in a row would be both too wide
 * for a phone screen and visually flat — one clear primary action reads
 * better than three equally-weighted ones.
 */
export const CompactGameButton: React.FC<CompactGameButtonProps> = ({ icon, ariaLabel, badge, onClick, disabled, tone = 'blue' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
      disabled
        ? 'cursor-not-allowed border-white/10 bg-gradient-to-b from-[#5a5a5a] to-[#3a3a3a] text-white/50 shadow-[0_3px_0_#242424]'
        : `cursor-pointer active:translate-y-[3px] ${TONE_CLASSES[tone]}`
    }`}
  >
    {badge !== undefined && badge > 0 && (
      <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-[#141414] bg-[#E11900] px-1 text-[10px] font-extrabold text-white">
        {badge}
      </span>
    )}
    {icon}
  </button>
);
