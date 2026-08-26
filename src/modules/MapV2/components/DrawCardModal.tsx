import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Card } from '../../../models/Deck';
import { CardTile } from './CardTile';

interface DrawCardModalProps {
  isOpen: boolean;
  peeking: boolean;
  drawing: boolean;
  card: Card | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * The "reveal, then confirm" dialog shown the moment Draw is tapped —
 * DeckPage shows a modal at this same point too (its peek/zoom flow); this
 * is a fresh, MapV2-local reimplementation of just the essential moment
 * (peek one card, show it, confirm or cancel) since CardModule draws one
 * card at a time rather than DeckPage's multi-select peek. A centered
 * overlay rather than a BottomSheet — this is a reveal moment to look at,
 * not a list to scroll.
 */
export const DrawCardModal: React.FC<DrawCardModalProps> = ({ isOpen, peeking, drawing, card, onConfirm, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes mapv2-card-reveal {
          from { transform: scale(0.85) rotateY(90deg); opacity: 0; }
          to { transform: scale(1) rotateY(0deg); opacity: 1; }
        }
      `}</style>
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
      >
        <div className="w-full max-w-[260px] rounded-3xl border-2 border-purple-400/40 bg-gradient-to-b from-[#2a1a4d] to-[#141414] p-4 text-center shadow-2xl">
          <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-purple-300">
            {peeking || !card ? 'Drawing a card…' : 'You drew'}
          </div>

          {peeking || !card ? (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-300" />
            </div>
          ) : (
            <div style={{ animation: 'mapv2-card-reveal 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <CardTile card={card} />
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={onClose}
              disabled={drawing}
              className="flex-1 rounded-full border border-white/20 py-2 text-xs font-semibold text-white/70 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={peeking || !card || drawing}
              className="flex-1 rounded-full bg-gradient-to-b from-[#B78CFF] to-[#7C3AED] py-2 text-xs font-extrabold text-white disabled:opacity-50"
            >
              {drawing ? 'Drawing…' : 'Keep card'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};
