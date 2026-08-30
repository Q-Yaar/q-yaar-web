import React from 'react';

export interface CompactGameButtonProps {
  icon: React.ReactNode;
  ariaLabel: string;
  badge?: number;
  onClick?: () => void;
  disabled?: boolean;
  /** See GameButtonProps.tone — same reasoning, same options. */
  tone?: 'blue' | 'purple';
  /** 'md' (56px, default) for a primary/secondary action riding along a
   * GameButton (Hand/Discard flanking Draw); 'sm' (40px) for chrome that
   * needs to stay compact — the TopBar's Back/Zones buttons, which share
   * a row with the mode toggle and team dropdown and can't afford 'md''s
   * footprint. */
  size?: 'sm' | 'md';
}

const TONE_CLASSES: Record<'blue' | 'purple', string> = {
  blue: 'border-white/30 bg-gradient-to-b from-[#4F91FF] to-[#1E56D6] text-white',
  purple: 'border-white/30 bg-gradient-to-b from-[#B78CFF] to-[#7C3AED] text-white',
};

const SIZE_CLASSES: Record<'sm' | 'md', { box: string; shadow: string }> = {
  md: { box: 'h-14 w-14', shadow: 'shadow-[0_4px_0_var(--bevel),0_6px_14px_var(--glow)] active:shadow-[0_1px_0_var(--bevel)]' },
  sm: { box: 'h-10 w-10', shadow: 'shadow-[0_3px_0_var(--bevel),0_4px_10px_var(--glow)] active:shadow-[0_1px_0_var(--bevel)]' },
};

const BEVEL_VARS: Record<'blue' | 'purple', React.CSSProperties> = {
  blue: { '--bevel': '#123a91', '--glow': 'rgba(30,86,214,0.45)' } as React.CSSProperties,
  purple: { '--bevel': '#4c1d95', '--glow': 'rgba(124,58,237,0.45)' } as React.CSSProperties,
};

/**
 * A smaller, round sibling of GameButton — same chunky press-button
 * material (gradient fill, hard bottom edge, real press animation), just
 * icon-only. For a secondary action riding along a primary GameButton
 * ('md' — Hand/Discard flanking Draw in CardModule) or for compact chrome
 * that still needs to read as a game control rather than a plain icon
 * button ('sm' — TopBar's Back/Zones).
 */
export const CompactGameButton: React.FC<CompactGameButtonProps> = ({ icon, ariaLabel, badge, onClick, disabled, tone = 'blue', size = 'md' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    style={disabled ? undefined : BEVEL_VARS[tone]}
    className={`relative flex shrink-0 items-center justify-center rounded-full border-2 transition-all ${SIZE_CLASSES[size].box} ${
      disabled
        ? 'cursor-not-allowed border-white/10 bg-gradient-to-b from-[#5a5a5a] to-[#3a3a3a] text-white/50 shadow-[0_3px_0_#242424]'
        : `cursor-pointer active:translate-y-[3px] ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size].shadow}`
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
