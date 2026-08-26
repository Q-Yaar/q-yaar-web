import React from 'react';
import { CurseInfo } from '../curse/useCurseModule';
import { CardTile } from './CardTile';
import { BottomSheet } from './BottomSheet';

interface CurseStatusSheetProps {
  isOpen: boolean;
  onClose: () => void;
  curse: CurseInfo | null;
  onComplete: () => void;
}

/**
 * The seeker's own "am I cursed right now" view — opened from
 * ModeActionButtons' Cursed button (Seeking mode). Shows the CURSE card
 * that was played on this team (same CardTile visual as everywhere else a
 * card appears) and a "Mark challenge completed" action that clears it —
 * there's nothing to verify server-side yet (no real curse API exists),
 * so this is an honor-system confirmation, same spirit as the real
 * physical/verbal challenges these cards describe.
 */
export const CurseStatusSheet: React.FC<CurseStatusSheetProps> = ({ isOpen, onClose, curse, onComplete }) => (
  <BottomSheet isOpen={isOpen} title="Cursed" leftAction={{ label: 'Close', onClick: onClose }}>
    {curse ? (
      <div className="space-y-3">
        <CardTile card={curse.card} />
        <button
          onClick={onComplete}
          className="w-full rounded-full bg-gradient-to-b from-[#B78CFF] to-[#7C3AED] py-2.5 text-xs font-extrabold uppercase tracking-wide text-white"
        >
          Mark challenge completed
        </button>
      </div>
    ) : (
      <p className="text-[11px] text-white/40">No active curse right now — you're in the clear.</p>
    )}
  </BottomSheet>
);
