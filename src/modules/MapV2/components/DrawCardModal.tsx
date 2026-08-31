import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Plus } from 'lucide-react';
import { Card } from '../../../models/Deck';
import { CardTile } from './CardTile';

interface DrawCardModalProps {
  isOpen: boolean;
  peeking: boolean;
  peekedCards: Card[];
  canPeekMore: boolean;
  onPeekMore: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (cardId: string) => void;
  onCardClick: (card: Card) => void;
  drawing: boolean;
  onDrawSelected: () => void;
  onDrawAll: () => void;
  onClose: () => void;
  /** Set only for a reward's bounded "draw N, pick M" (see
   * cards/useCardModule.ts's DrawOptions/cards/useRewardClaimFlow.ts) —
   * swaps in pick-count copy and hides "Draw all", since drawing every
   * peeked card isn't "pick M" once N > M. Undefined for the ordinary free
   * draw, unchanged. */
  maxPick?: number;
}

/**
 * DeckPage's own "peek then draw" mechanic — peeks cards off the top of
 * the deck one at a time (the "Peek more" tile, styled to sit in the grid
 * alongside real cards) and lets the player pick which of what's revealed
 * (if any) to actually draw, rather than a single blind draw. Selecting a
 * card (the corner checkbox) and inspecting it (tapping the card body,
 * which opens CardDetailModal) are separate gestures, same reasoning as
 * CardTile's own onClick/onToggleSelect split.
 */
export const DrawCardModal: React.FC<DrawCardModalProps> = ({
  isOpen, peeking, peekedCards, canPeekMore, onPeekMore, selectedIds, onToggleSelect, onCardClick,
  drawing, onDrawSelected, onDrawAll, onClose, maxPick,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80dvh] w-full max-w-[340px] flex-col rounded-3xl border-2 border-purple-400/40 bg-gradient-to-b from-[#2a1a4d] to-[#141414] p-4 shadow-2xl"
      >
        <div className="mb-3 shrink-0 text-center text-[11px] font-extrabold uppercase tracking-wide text-purple-300">
          {maxPick !== undefined
            ? `Your reward — pick up to ${maxPick} of ${peekedCards.length || maxPick} to draw`
            : `Peeked ${peekedCards.length || ''} cards — pick which to draw`}
        </div>

        {peeking ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-300" />
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto">
            {peekedCards.map((card) => (
              <CardTile
                key={card.card_id}
                card={card}
                onClick={() => onCardClick(card)}
                selectable
                selected={selectedIds.has(card.card_id)}
                onToggleSelect={() => onToggleSelect(card.card_id)}
              />
            ))}
            {canPeekMore && (
              <button
                onClick={onPeekMore}
                className="flex min-h-[164px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-300/40 text-purple-300 transition-colors hover:border-purple-300/70 hover:text-purple-200"
              >
                <Plus size={28} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Peek more</span>
              </button>
            )}
          </div>
        )}

        <div className="mt-4 flex shrink-0 gap-2">
          <button
            onClick={onClose}
            disabled={drawing}
            className="flex-1 rounded-full border border-white/20 py-2 text-xs font-semibold text-white/70 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onDrawSelected}
            disabled={peeking || drawing || selectedIds.size === 0}
            className={`flex-1 rounded-full py-2 text-xs font-extrabold text-white disabled:opacity-40 ${
              maxPick !== undefined
                ? 'bg-gradient-to-b from-[#B78CFF] to-[#7C3AED]'
                : 'border border-white/20'
            }`}
          >
            {drawing ? 'Drawing…' : `Draw (${selectedIds.size})`}
          </button>
          {maxPick === undefined && (
            <button
              onClick={onDrawAll}
              disabled={peeking || drawing || peekedCards.length === 0}
              className="flex-1 rounded-full bg-gradient-to-b from-[#B78CFF] to-[#7C3AED] py-2 text-xs font-extrabold text-white disabled:opacity-50"
            >
              {drawing ? 'Drawing…' : 'Draw all'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
