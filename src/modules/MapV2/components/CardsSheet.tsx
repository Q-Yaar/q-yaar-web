import React from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '../../../models/Deck';
import { CardTile } from './CardTile';
import { BottomSheet } from './BottomSheet';

interface CardsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cards: Card[];
  isLoading: boolean;
  emptyText: string;
  /** Present only for the hand sheet — the discard pile is a read-only
   * history, nothing moves out of it. */
  onDiscard?: (cardId: string) => void;
}

/**
 * Shared grid view for both the hand and the discard pile (see
 * CardModule/useCardModule) — same CardTile either way, the only
 * difference is whether a Discard action is offered per card. A grid
 * (not a list) to match DeckPage's own hand/discard layout.
 */
export const CardsSheet: React.FC<CardsSheetProps> = ({ isOpen, onClose, title, cards, isLoading, emptyText, onDiscard }) => (
  <BottomSheet isOpen={isOpen} title={title} leftAction={{ label: 'Close', onClick: onClose }}>
    {isLoading ? (
      <div className="flex items-center gap-1.5 text-[11px] text-white/40">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading cards…
      </div>
    ) : cards.length === 0 ? (
      <p className="text-[11px] text-white/40">{emptyText}</p>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        {cards.map((card) => (
          <CardTile key={card.card_id} card={card} onDiscard={onDiscard ? () => onDiscard(card.card_id) : undefined} />
        ))}
      </div>
    )}
  </BottomSheet>
);
