import { useState, useRef, useEffect } from 'react';
import {
  Flame,
  RotateCcw,
  Trash2,
  Zap,
  Skull,
  Info,
  ScanEye,
  X,
  Hand,
  Eye,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { Card } from '../../models/Deck';

export type PlayingCardUIType = 'DRAW_PILE' | 'HAND_PILE' | 'DISCARD_PILE';

interface PlayingCardProps {
  card: Card;
  uiType: PlayingCardUIType;
  onDiscard?: () => void;
  onReturn?: () => void;
  onDraw?: () => void;
  defaultFaceDown?: boolean;
  forceFaceUp?: boolean;
  disabled?: boolean;
}

export const PlayingCard = ({
  card,
  uiType,
  onDiscard,
  onReturn,
  onDraw,
  defaultFaceDown = false,
  forceFaceUp,
  disabled = false,
}: PlayingCardProps) => {
  // Determine initial revealed state based on uiType and props
  // DRAW_PILE (Peek Modal): Always revealed
  // HAND_PILE: Default determined by props (usually hidden until clicked or "Reveal All" used)
  // DISCARD_PILE: Always revealed
  const getInitialRevealedState = () => {
    if (uiType === 'DISCARD_PILE' || uiType === 'DRAW_PILE') return true;
    return !defaultFaceDown;
  };

  const [isRevealed, setIsRevealed] = useState(getInitialRevealedState());
  const [isZoomed, setIsZoomed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- THEME ENGINE ---
  const getTheme = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'CURSE':
        return {
          border: 'border-purple-500',
          outerShadow: 'shadow-purple-900/20',
          bg: 'bg-slate-900',
          headerGradient: 'from-purple-950 to-slate-900',
          textBg: 'bg-purple-50',
          accent: 'text-purple-900',
          icon: <Skull size={14} className="text-purple-300" />,
          costBg: 'bg-red-100 text-red-800 border-t border-red-200',
        };
      case 'POWERUP':
        return {
          border: 'border-amber-400',
          outerShadow: 'shadow-amber-900/20',
          bg: 'bg-slate-900',
          headerGradient: 'from-amber-900 to-slate-900',
          textBg: 'bg-amber-50',
          accent: 'text-amber-900',
          icon: <Zap size={14} className="text-amber-300" />,
          costBg: 'bg-red-100 text-red-800 border-t border-red-200',
        };
      default:
        return {
          border: 'border-slate-300',
          outerShadow: 'shadow-slate-900/10',
          bg: 'bg-slate-800',
          headerGradient: 'from-slate-700 to-slate-800',
          textBg: 'bg-white',
          accent: 'text-slate-800',
          icon: <Info size={14} className="text-slate-300" />,
          costBg: 'bg-red-100 text-red-800 border-t border-red-200',
        };
    }
  };

  const theme = getTheme(card.card_type);

  // --- EFFECTS ---
  useEffect(() => {
    // If logic:
    // DRAW_PILE/DISCARD_PILE: Always revealed.
    // HAND_PILE: Follows forceFaceUp if provided.
    if (uiType === 'HAND_PILE' && forceFaceUp !== undefined) {
      setIsRevealed(forceFaceUp);
    } else if (uiType === 'DISCARD_PILE' || uiType === 'DRAW_PILE') {
      setIsRevealed(true);
    }
  }, [forceFaceUp, uiType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // --- HANDLERS ---
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-btn')) return;
    if (disabled) return;

    // Logic based on UI Type
    if (uiType === 'HAND_PILE') {
      if (!isRevealed) {
        // First click reveals
        setIsRevealed(true);
      } else {
        // Second click zooms
        setIsZoomed(true);
      }
    } else {
      // DRAW_PILE and DISCARD_PILE: Click -> Zoom
      setIsZoomed(true);
    }
  };

  const handleAction = (
    action: 'return' | 'discard' | 'draw',
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();
    setIsZoomed(false);
    setShowMenu(false);
    if (action === 'return' && onReturn) onReturn();
    if (action === 'discard' && onDiscard) onDiscard();
    if (action === 'draw' && onDraw) onDraw();
  };

  // --- RENDERERS ---

  const CardContent = ({ mode }: { mode: 'mini' | 'zoom' | 'peek' }) => {
    const isPeek = mode === 'peek';
    const isZoom = mode === 'zoom';
    const isMini = mode === 'mini';

    return (
      <div
        className={`w-full h-full flex flex-col bg-gray-900 overflow-hidden ${isZoom ? 'rounded-2xl' : 'rounded-xl'}`}
      >
        {/* 1. Header & Art */}
        <div
          className={`${isZoom ? 'h-[40%]' : isPeek ? 'h-[50%]' : 'h-[35%]'} relative bg-gradient-to-b ${theme.headerGradient} p-1 shrink-0`}
        >
          {/* Type Badge */}
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">
            {theme.icon}
            {card.card_type}
          </div>

          {/* View / Menu Buttons */}
          <div
            className="absolute top-2 right-2 z-20 flex flex-col gap-2"
            ref={menuRef}
          >
            {/* Eye Icon to Conceal (Only for HAND_PILE and when revealed) */}
            {uiType === 'HAND_PILE' && isRevealed && !isZoom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRevealed(false);
                }}
                className="interactive-btn p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors backdrop-blur-sm"
              >
                <Eye size={16} />
              </button>
            )}
          </div>

          {/* Image */}
          <div className="w-full h-full rounded-t-lg overflow-hidden border-b border-white/10 relative bg-black/20">
            {card.image ? (
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-20">
                <span className="text-5xl">🃏</span>
              </div>
            )}
            <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"></div>
          </div>
        </div>

        {/* 2. Text Body */}
        <div
          className={`flex-1 relative ${theme.textBg} p-1 md:p-2 flex flex-col justify-start`}
        >
          {/* Title */}
          <div
            className={`border-b border-black/5 pb-2 shrink-0 ${isPeek ? 'text-center mt-2' : 'mb-2'}`}
          >
            <h4
              className={`font-black uppercase leading-tight ${theme.accent} ${isPeek ? 'text-lg line-clamp-2' : 'text-sm sm:text-base line-clamp-2'}`}
            >
              {card.title}
            </h4>
          </div>

          {/* Description: Hidden in Peek mode, visible in others */}
          {!isPeek && (
            <div className="relative flex-1 overflow-hidden">
              <p
                className={`text-xs sm:text-sm text-gray-800 font-serif leading-relaxed font-medium ${isMini ? 'line-clamp-3' : ''}`}
              >
                {card.description}
              </p>
              {/* Metadata in Zoom */}
              {isZoom && card.metadata && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {Object.entries(card.metadata).map(
                    ([key, value]) =>
                      key !== 'casting_cost' && (
                        <div
                          key={key}
                          className="flex justify-between text-xs py-1"
                        >
                          <span className="text-gray-500 font-medium uppercase">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="font-bold text-gray-800">
                            {String(value)}
                          </span>
                        </div>
                      ),
                  )}
                </div>
              )}
            </div>
          )}

          {/* Peek mode "Click Action" Hint */}
          {isPeek && (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
              <ScanEye size={24} className="mb-2 text-indigo-900" />
              <span className="text-xs font-bold text-indigo-900 uppercase">
                {uiType === 'HAND_PILE' && !isZoom
                  ? 'Click for details'
                  : 'Click to view details'}
              </span>
            </div>
          )}

          {/* 3. Footer: Casting Cost (Standard/Mini only) */}
          {!isPeek && card.metadata?.casting_cost && (
            <div
              className={`shrink-0 min-h-[30px] flex items-center px-2 py-1 gap-2 ${theme.costBg} mt-2 rounded`}
            >
              <Flame size={10} className="text-red-600" fill="currentColor" />
              <span className="text-[8px] sm:text-xxs font-bold uppercase tracking-wide leading-tight line-clamp-1">
                {card.metadata.casting_cost}
              </span>
            </div>
          )}

          {/* Action Button Row (View / Tags) */}
          {!isPeek && (
            <div className="mt-auto pt-3 flex items-center justify-between gap-2 shrink-0">
              {/* Tags (Right side) */}
              <div className="flex gap-1 overflow-hidden justify-end flex-1">
                {card.tags?.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] px-1.5 py-0.5 bg-black/5 text-black/50 rounded uppercase font-bold tracking-tight truncate"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* View Button for Mini - Discard Pile */}
              {isMini && uiType === 'DISCARD_PILE' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomed(true);
                  }}
                  className="interactive-btn flex items-center gap-1.5 px-3 py-1 bg-gray-200 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wide transition-colors"
                >
                  <ScanEye size={12} /> View
                </button>
              )}
            </div>
          )}
        </div>

        {/* Zoom Mode Actions */}
        {isZoom && (
          <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-3">
            {/* DRAW_PILE: "Draw this card" */}
            {uiType === 'DRAW_PILE' && (
              <>
                {onDraw && (
                  <button
                    onClick={() => handleAction('draw')}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    <Hand size={18} /> Draw this Card
                  </button>
                )}
              </>
            )}

            {/* HAND_PILE: Discard, Return */}
            {uiType === 'HAND_PILE' && (
              <>
                {onDiscard && (
                  <button
                    onClick={() => handleAction('discard')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-bold transition-colors"
                  >
                    <Trash2 size={18} /> Discard
                  </button>
                )}
                {onReturn && (
                  <button
                    onClick={() => handleAction('return')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold transition-colors"
                  >
                    <RotateCcw size={18} /> Return
                  </button>
                )}
              </>
            )}

            {/* DISCARD_PILE: Return */}
            {uiType === 'DISCARD_PILE' && onReturn && (
              <button
                onClick={() => handleAction('return')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold transition-colors"
              >
                <RotateCcw size={18} /> Return
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Determine styles for card content based on uiType
  // All types now use 'peek' style for consistency, per user request "Dicard pile shoul look eactly like hand card"
  const contentMode = 'peek';

  return (
    <>
      {/* === CARD CONTAINER === */}
      <div
        className={`relative w-full aspect-[9/16] group perspective-1000 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={handleCardClick}
        style={{ zIndex: showMenu ? 40 : 'auto' }}
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isRevealed ? 'rotate-y-0' : 'rotate-y-180'}`}
        >
          {/* Front */}
          <div
            className={`absolute inset-0 backface-hidden rounded-xl shadow-lg border-[3px] ${theme.border} ${theme.outerShadow}`}
          >
            <CardContent mode={contentMode} />
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-950 rounded-xl border-4 border-indigo-300/50 shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:16px_16px]"></div>
            <div className="w-16 h-16 rounded-full border-2 border-indigo-400/30 flex items-center justify-center bg-indigo-900/50 backdrop-blur-sm">
              <span className="text-2xl font-bold text-indigo-300">?</span>
            </div>
          </div>
        </div>
      </div>

      {/* === ZOOM MODAL === */}
      {isZoomed &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="relative w-full max-w-[380px] sm:max-w-[400px] h-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsZoomed(false)}
                className="absolute -top-12 right-0 sm:-right-12 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50"
              >
                <X size={24} />
              </button>

              <div
                className={`w-full flex-1 rounded-2xl shadow-2xl border-[4px] bg-white overflow-hidden flex flex-col ${theme.border}`}
              >
                {/* Always zoom mode in modal */}
                <CardContent mode="zoom" />
              </div>
            </div>
          </div>,
          document.body,
        )}

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-0 { transform: rotateY(0deg); }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </>
  );
};
