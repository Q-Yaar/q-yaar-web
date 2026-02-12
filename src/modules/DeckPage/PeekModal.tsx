import { createPortal } from 'react-dom';
import { Eye, Hand, Plus, X } from 'lucide-react';
import { Card } from '../../models/Deck';
import { PlayingCard, PlayingCardUIType } from './PlayingCard';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

interface PeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  peekCount: number;
  peekedCards: Card[];
  totalDeckCount: number;
  onPeekMore: () => void;
  onDraw: (cardId: string) => void;
  onDrawAll: () => void;
  isDrawing: boolean;
}

export const PeekModal = ({
  isOpen,
  onClose,
  peekCount,
  peekedCards,
  totalDeckCount,
  onPeekMore,
  onDraw,
  onDrawAll,
  isDrawing,
}: PeekModalProps) => {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end sm:justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Header */}
      <div className="w-full max-w-5xl mx-auto p-4 flex items-center justify-between text-white/90">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur">
            <Eye size={20} className="text-indigo-300" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Peek Deck</h3>
            <p className="text-xs text-white/50">
              Revealing top {peekCount} cards
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Cards Container */}
      <div className="flex-1 w-full max-w-6xl overflow-y-auto overflow-x-hidden p-4 sm:p-8">
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
          {peekedCards.map((card, index) => (
            <div
              key={card.card_id}
              className="w-40 sm:w-48 animate-in zoom-in-50 duration-300 fill-mode-backwards"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <PlayingCard
                card={card}
                uiType={PlayingCardUIType.DRAW_PILE}
                onDraw={() => onDraw(card.card_id)}
              />
              <button
                onClick={() => onDraw(card.card_id)}
                disabled={isDrawing}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Hand size={14} /> Draw
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="w-full bg-gray-900/90 border-t border-white/10 p-4 sm:p-6 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex gap-4">
          <button
            onClick={onPeekMore}
            disabled={peekCount >= totalDeckCount}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Plus size={18} /> Peek One More
          </button>
          <button
            onClick={onDrawAll}
            disabled={isDrawing || peekedCards.length === 0}
            className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Hand size={18} /> Draw All ({peekedCards.length})
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
