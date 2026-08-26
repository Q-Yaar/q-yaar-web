import React from 'react';
import { createPortal } from 'react-dom';
import { Flame, X } from 'lucide-react';
import { Card } from '../../../models/Deck';
import { cardTheme } from './CardTile';

export interface CardDetailAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
}

interface CardDetailModalProps {
  isOpen: boolean;
  card: Card | null;
  onClose: () => void;
  /** Present only where an action makes sense — "Draw this card" from the
   * peek grid, "Discard" from the hand sheet. Omitted for the discard
   * pile, which is read-only history. */
  primaryAction?: CardDetailAction;
}

/**
 * The "click a card to see it properly" detail view — same moment
 * DeckPage's ZoomedPlayingCard exists for, reimplemented fresh here since
 * MapV2 doesn't depend on the old app's modules. Bigger image, full
 * (untruncated) description, casting cost and tags, and — where relevant —
 * one action button, so this one modal serves the peek grid, the hand
 * sheet, and the discard pile alike; only what onClose/primaryAction get
 * wired to changes per context (see useCardModule.ts's openDetail).
 */
export const CardDetailModal: React.FC<CardDetailModalProps> = ({ isOpen, card, onClose, primaryAction }) => {
  if (!isOpen || !card) return null;
  const theme = cardTheme(card.card_type);
  const castingCost = card.metadata?.casting_cost;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full max-w-[340px] max-h-[80dvh] flex-col overflow-hidden rounded-3xl border-[3px] ${theme.border} bg-[#141414] shadow-2xl`}
      >
        <div className={`relative h-48 shrink-0 bg-gradient-to-b ${theme.headerGradient}`}>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <X size={16} />
          </button>
          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {theme.icon}
            {card.card_type}
          </div>
          {card.image ? (
            <img src={card.image} alt={card.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center opacity-30">
              <span className="text-6xl">🃏</span>
            </div>
          )}
        </div>

        <div className={`${theme.textBg} flex-1 overflow-y-auto p-4`}>
          <h3 className={`text-base font-black uppercase leading-tight ${theme.accent}`}>{card.title}</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-gray-700">{card.description}</p>

          {castingCost && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded border-t border-red-200 bg-red-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-red-800">
              <Flame size={11} className="text-red-600" fill="currentColor" />
              {castingCost}
            </div>
          )}

          {card.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {card.tags.map((tag) => (
                <span key={tag} className="rounded bg-black/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-black/50">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {primaryAction && (
          <div className={`shrink-0 border-t border-black/10 ${theme.textBg} p-3`}>
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
              className="w-full rounded-full bg-gradient-to-b from-[#B78CFF] to-[#7C3AED] py-2.5 text-xs font-extrabold uppercase tracking-wide text-white disabled:opacity-50"
            >
              {primaryAction.loading ? 'Working…' : primaryAction.label}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
