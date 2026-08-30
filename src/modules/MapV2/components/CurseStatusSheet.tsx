import React from 'react';
import { Card } from '../../../models/Deck';
import { CurseInfo } from '../curse/useCurseModule';
import { CardTile } from './CardTile';
import { BottomSheet } from './BottomSheet';

interface CurseStatusSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Every active curse — see useCurseModule.ts's DEMO SIMPLIFICATION note
   * for why this isn't scoped to just the viewer's own team yet. A team
   * can carry more than one at once, so this can hold several entries for
   * the same targetTeamId — each completed independently, in any order. */
  curses: CurseInfo[];
  onComplete: (curseId: string) => void;
  /** Opens CardDetailModal for the tapped curse's card — "click a card to
   * see it properly" works the same way here as everywhere else a card
   * appears. */
  onCardClick: (card: Card) => void;
}

/**
 * The seeker's "what's cursed right now" view — opened from
 * ModeActionButtons' Cursed button (Seeking mode). Shows each active
 * curse's card (same CardTile visual as everywhere else a card appears)
 * with its own "Mark challenge completed" action — stacked curses on the
 * same team each get their own row and can be cleared in any order, since
 * completing one has no bearing on the others. There's nothing to verify
 * server-side yet (no real curse API exists), so this is an honor-system
 * confirmation, same spirit as the real physical/verbal challenges these
 * cards describe.
 */
export const CurseStatusSheet: React.FC<CurseStatusSheetProps> = ({ isOpen, onClose, curses, onComplete, onCardClick }) => (
  <BottomSheet isOpen={isOpen} title="Cursed" leftAction={{ label: 'Close', onClick: onClose }}>
    {curses.length === 0 ? (
      <p className="text-[11px] text-white/40">No active curse right now — you're in the clear.</p>
    ) : (
      <div className="space-y-3">
        {curses.map((curse) => (
          <div key={curse.id} className="space-y-1.5">
            <CardTile card={curse.card} onClick={() => onCardClick(curse.card)} />
            <button
              onClick={() => onComplete(curse.id)}
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
