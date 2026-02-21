import {
  X,
  Skull,
  Zap,
  Info,
  Flame,
  Hand,
  Trash2,
  RotateCcw,
  Timer,
} from 'lucide-react';
import { Card } from '../../models/Deck';
import { PlayingCardUIType } from './PlayingCard';
import { getLabel } from 'utils/utils';

interface ZoomedPlayingCardProps {
  card: Card;
  onClose: () => void;
  uiType: PlayingCardUIType;
  onDiscard?: () => void;
  onReturn?: () => void;
  onDraw?: () => void;
}

export const ZoomedPlayingCard = ({
  card,
  onClose,
  uiType,
  onDiscard,
  onReturn,
  onDraw,
}: ZoomedPlayingCardProps) => {
  // Theme helpers (simplified version of PlayingCard's theme engine for the icon)
  const getIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'CURSE':
        return <Skull size={18} className="text-purple-500" />;
      case 'POWERUP':
        return <Zap size={18} className="text-amber-500" />;
      case 'TIME_BONUS':
        return <Timer size={18} className="text-teal-500" />;
      default:
        return <Info size={18} className="text-slate-400" />;
    }
  };

  const getThemeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'CURSE':
        return 'text-purple-900';
      case 'POWERUP':
        return 'text-amber-900';
      case 'TIME_BONUS':
        return 'text-teal-900';
      default:
        return 'text-slate-800';
    }
  };

  const icon = getIcon(card.card_type);
  const themeColor = getThemeColor(card.card_type);

  return (
    <div
      className="relative w-full max-w-[380px] sm:max-w-[420px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        {/* Small Card Icon for aesthetics */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              {card.card_type}
            </span>
            <span className={`text-xs font-bold leading-none ${themeColor}`}>
              Playing Card
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Text Content */}
        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <h2
              className={`text-2xl font-black uppercase leading-tight ${themeColor}`}
            >
              {card.title}
            </h2>
          </div>

          {/* Metadata Grid */}
          {card.metadata && (
            <div className="flex flex-wrap gap-2">
              {card.metadata.casting_cost && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-md border border-red-100">
                  <Flame size={12} fill="currentColor" />
                  <span className="text-xs font-bold uppercase">
                    Cost: {card.metadata.casting_cost}
                  </span>
                </div>
              )}
              {card.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-bold uppercase tracking-wide"
                >
                  {getLabel(tag)}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="prose prose-sm text-gray-600 leading-relaxed">
            <p>{card.description}</p>
          </div>

          {/* Extended Metadata */}
          {card.metadata && (
            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-y-3 gap-x-4">
              {Object.entries(card.metadata).map(
                ([key, value]) =>
                  key !== 'casting_cost' && (
                    <div key={key} className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {String(value)}
                      </span>
                    </div>
                  ),
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- ACTION FOOTER --- */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
        {/* DRAW_PILE Actions */}
        {uiType === PlayingCardUIType.DRAW_PILE && onDraw && (
          <button
            onClick={() => {
              onClose();
              onDraw();
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold font-display uppercase tracking-wide text-sm shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Hand size={18} /> Draw Card
          </button>
        )}

        {/* HAND_PILE Actions */}
        {uiType === PlayingCardUIType.HAND_PILE && (
          <>
            {onDiscard && (
              <button
                onClick={() => {
                  onClose();
                  onDiscard();
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold font-display uppercase tracking-wide text-sm transition-colors"
                title="Discard"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">Discard</span>
              </button>
            )}
            {onReturn && (
              <button
                onClick={() => {
                  onClose();
                  onReturn();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold font-display uppercase tracking-wide text-sm transition-colors"
              >
                <RotateCcw size={18} /> Return to Deck
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
