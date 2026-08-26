import React from 'react';
import { Info, Skull, Timer, Zap } from 'lucide-react';
import { Card } from '../../../models/Deck';

interface CardTheme {
  border: string;
  headerGradient: string;
  textBg: string;
  accent: string;
  icon: React.ReactNode;
}

function cardTheme(cardType: string): CardTheme {
  switch (cardType?.toUpperCase()) {
    case 'CURSE':
      return {
        border: 'border-purple-500',
        headerGradient: 'from-purple-950 to-slate-900',
        textBg: 'bg-purple-50',
        accent: 'text-purple-900',
        icon: <Skull size={12} className="text-purple-300" />,
      };
    case 'POWERUP':
      return {
        border: 'border-amber-400',
        headerGradient: 'from-amber-900 to-slate-900',
        textBg: 'bg-amber-50',
        accent: 'text-amber-900',
        icon: <Zap size={12} className="text-amber-300" />,
      };
    case 'TIME_BONUS':
      return {
        border: 'border-teal-400',
        headerGradient: 'from-teal-900 to-slate-900',
        textBg: 'bg-teal-50',
        accent: 'text-teal-900',
        icon: <Timer size={12} className="text-teal-300" />,
      };
    default:
      return {
        border: 'border-slate-300',
        headerGradient: 'from-slate-700 to-slate-800',
        textBg: 'bg-white',
        accent: 'text-slate-800',
        icon: <Info size={12} className="text-slate-300" />,
      };
  }
}

interface CardTileProps {
  card: Card;
  onDiscard?: () => void;
}

/**
 * A simplified, MapV2-local reimplementation of DeckPage's PlayingCard
 * visual design (theme-by-card_type header/body split, type badge, image
 * or a placeholder) — same look, without that component's flip/zoom/menu
 * machinery, which isn't needed for a compact grid tile inside a
 * BottomSheet or the draw modal. Kept here rather than importing
 * DeckPage's own component, since MapV2 never depends on the old app's
 * modules.
 */
export const CardTile: React.FC<CardTileProps> = ({ card, onDiscard }) => {
  const theme = cardTheme(card.card_type);

  return (
    <div className={`overflow-hidden rounded-xl border-[3px] ${theme.border} shadow-lg`}>
      <div className={`relative h-20 bg-gradient-to-b ${theme.headerGradient}`}>
        <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
          {theme.icon}
          {card.card_type}
        </div>
        {card.image ? (
          <img src={card.image} alt={card.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center opacity-30">
            <span className="text-3xl">🃏</span>
          </div>
        )}
      </div>
      <div className={`${theme.textBg} p-2`}>
        <h4 className={`text-xs font-black uppercase leading-tight ${theme.accent} line-clamp-2`}>{card.title}</h4>
        <p className="mt-1 text-[10.5px] leading-snug text-gray-700 line-clamp-3">{card.description}</p>
        {onDiscard && (
          <button onClick={onDiscard} className="mt-1.5 text-[10.5px] font-bold text-rose-600 underline">
            Discard
          </button>
        )}
      </div>
    </div>
  );
};
