import React from 'react';
import { HeldCard } from '../cards/useCardModule';
import { BottomSheet } from './BottomSheet';

interface CardsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cards: HeldCard[];
  emptyText: string;
  /** Present only for the hand sheet — the discard pile is a read-only
   * history, nothing moves out of it. */
  onDiscard?: (instanceId: string) => void;
}

/**
 * Shared list view for both the hand and the discard pile (see
 * CardModule/useCardModule) — same card row either way, the only
 * difference is whether a Discard action is offered per card.
 */
export const CardsSheet: React.FC<CardsSheetProps> = ({ isOpen, onClose, title, cards, emptyText, onDiscard }) => (
  <BottomSheet isOpen={isOpen} title={title} leftAction={{ label: 'Close', onClick: onClose }}>
    {cards.length === 0 ? (
      <p className="text-[11px] text-white/40">{emptyText}</p>
    ) : (
      <div className="space-y-1.5">
        {cards.map((held) => (
          <div
            key={held.instance_id}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2.5"
          >
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-white">{held.card.name}</span>
              <span className="block text-[11px] text-white/40">{held.card.description}</span>
            </div>
            {onDiscard && (
              <button
                onClick={() => onDiscard(held.instance_id)}
                className="shrink-0 text-[11px] font-semibold text-rose-300 underline"
              >
                Discard
              </button>
            )}
          </div>
        ))}
      </div>
    )}
  </BottomSheet>
);
