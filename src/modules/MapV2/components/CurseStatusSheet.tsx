import React from 'react';
import { CurseInfo } from '../curse/useCurseModule';
import { CardTile } from './CardTile';
import { BottomSheet } from './BottomSheet';

interface CurseStatusSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Every active curse — see useCurseModule.ts's DEMO SIMPLIFICATION note
   * for why this isn't scoped to just the viewer's own team yet. */
  curses: CurseInfo[];
  onComplete: (targetTeamId: string) => void;
}

/**
 * The seeker's "what's cursed right now" view — opened from
 * ModeActionButtons' Cursed button (Seeking mode). Shows each active
 * curse's card (same CardTile visual as everywhere else a card appears)
 * with a "Mark challenge completed" action that clears it — there's
 * nothing to verify server-side yet (no real curse API exists), so this
 * is an honor-system confirmation, same spirit as the real physical/verbal
 * challenges these cards describe.
 */
export const CurseStatusSheet: React.FC<CurseStatusSheetProps> = ({ isOpen, onClose, curses, onComplete }) => (
  <BottomSheet isOpen={isOpen} title="Cursed" leftAction={{ label: 'Close', onClick: onClose }}>
    {curses.length === 0 ? (
      <p className="text-[11px] text-white/40">No active curse right now — you're in the clear.</p>
    ) : (
      <div className="space-y-3">
        {curses.map((curse) => (
          <div key={curse.targetTeamId} className="space-y-1.5">
            <CardTile card={curse.card} />
            <button
              onClick={() => onComplete(curse.targetTeamId)}
              className="w-full rounded-full bg-gradient-to-b from-[#FF6B6B] to-[#C81E1E] py-2.5 text-xs font-extrabold uppercase tracking-wide text-white"
            >
              Mark challenge completed
            </button>
          </div>
        ))}
      </div>
    )}
  </BottomSheet>
);
