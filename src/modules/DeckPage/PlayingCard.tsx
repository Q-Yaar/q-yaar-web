import { useState, useRef, useEffect } from "react";
import { Flame, MoreVertical, RotateCcw, Trash2, Zap, Skull, Info, ScanEye, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Card } from "../../models/Deck";

interface PlayingCardProps {
  card: Card;
  onDiscard?: () => void;
  onReturn?: () => void;
  defaultFaceDown?: boolean;
  forceFaceUp?: boolean;
  disabled?: boolean;
}

export const PlayingCard = ({
  card,
  onDiscard,
  onReturn,
  defaultFaceDown = false,
  forceFaceUp,
  disabled = false
}: PlayingCardProps) => {
  const [isRevealed, setIsRevealed] = useState(!defaultFaceDown);
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
          costBg: 'bg-red-100 text-red-800 border-t border-red-200'
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
          costBg: 'bg-red-100 text-red-800 border-t border-red-200'
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
          costBg: 'bg-red-100 text-red-800 border-t border-red-200'
        };
    }
  };

  const theme = getTheme(card.card_type);

  // --- EFFECTS ---
  useEffect(() => {
    if (forceFaceUp !== undefined) setIsRevealed(forceFaceUp);
  }, [forceFaceUp]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // --- HANDLERS ---
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-btn')) return;
    if (disabled) return;
    setIsRevealed(!isRevealed);
    if (showMenu) setShowMenu(false);
  };

  const handleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(true);
    setShowMenu(false);
  };

  const handleAction = (action: 'return' | 'discard', e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsZoomed(false);
    setShowMenu(false);
    if (action === 'return' && onReturn) onReturn();
    if (action === 'discard' && onDiscard) onDiscard();
  };

  // --- RENDERERS ---

  const CardContent = ({ mode }: { mode: 'mini' | 'zoom' }) => (
    <div className={`w-full h-full flex flex-col bg-gray-900 overflow-hidden ${mode === 'zoom' ? 'rounded-2xl' : 'rounded-xl'}`}>

      {/* 1. Header & Art (Reduced height to 35% to give text more room) */}
      <div className={`${mode === 'zoom' ? 'h-[40%]' : 'h-[35%]'} relative bg-gradient-to-b ${theme.headerGradient} p-1 shrink-0`}>
        {/* Type Badge */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">
          {theme.icon}
          {card.card_type}
        </div>

        {/* Menu (Only in Mini mode) */}
        {mode === 'mini' && (onDiscard || onReturn) && (
          <div className="absolute top-1 right-1 z-20" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="interactive-btn p-1.5 rounded-full hover:bg-black/40 text-white/80 hover:text-white transition-colors"
            >
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden text-sm z-30 text-gray-200">
                {onReturn && (
                  <button onClick={(e) => handleAction('return', e)} className="w-full px-4 py-3 text-left hover:bg-gray-700 flex items-center gap-2 border-b border-gray-700">
                    <RotateCcw size={14} /> Return
                  </button>
                )}
                {onDiscard && (
                  <button onClick={(e) => handleAction('discard', e)} className="w-full px-4 py-3 text-left hover:bg-red-900/50 text-red-400 hover:text-red-300 flex items-center gap-2">
                    <Trash2 size={14} /> Discard
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Image */}
        <div className="w-full h-full rounded-t-lg overflow-hidden border-b border-white/10 relative bg-black/20">
          {card.image ? (
            <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <span className="text-5xl">🃏</span>
            </div>
          )}
          <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"></div>
        </div>
      </div>

      {/* 2. Text Body (Takes remaining space) */}
      <div className={`flex-1 relative ${theme.textBg} p-1 flex flex-col justify-start`}>
        {/* Title */}
        <div className="mb-2 border-b border-black/5 pb-2 shrink-0">
          <h4 className={`font-black text-sm sm:text-base uppercase leading-tight ${theme.accent} line-clamp-2`}>
            {card.title}
          </h4>
        </div>

        {/* Description: High line clamp for tall cards */}
        <div className="relative flex-1 overflow-hidden">
          <p className={`text-xs sm:text-sm text-gray-800 font-serif leading-relaxed font-medium ${mode === 'mini' ? 'line-clamp-2' : ''}`}>
            {card.description}
          </p>
        </div>
        {/* 3. Footer: FULL WIDTH Casting Cost */}
        {/* This ensures the cost text has maximum space available */}
        {card.metadata?.casting_cost && (
          <div className={`shrink-0 min-h-[36px] flex items-center px-2 py-1 gap-2 ${theme.costBg}`}>
            <Flame size={10} className="text-red-600" fill="currentColor" />
            <span className="text-[8px] sm:text-xxs font-bold uppercase tracking-wide leading-tight line-clamp-2">
              {card.metadata.casting_cost}
            </span>
          </div>
        )}

        {/* Action Button Row (View / Tags) */}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2 shrink-0">
          {/* Tags (Right side) */}
          <div className="flex gap-1 overflow-hidden justify-end flex-1">
            {card.tags?.slice(0, 1).map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-black/5 text-black/50 rounded uppercase font-bold tracking-tight truncate">
                {tag}
              </span>
            ))}
          </div>

          {/* View Button */}
          {mode === 'mini' && (
            <button
              onClick={handleZoom}
              className="interactive-btn flex items-center gap-1.5 px-3 py-1 bg-gray-200 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 rounded text-[10px] font-bold uppercase tracking-wide transition-colors"
            >
              <ScanEye size={12} /> View
            </button>
          )}


        </div>
      </div>



      {/* Zoom Mode Actions (Replaces Cost footer if you want actions there, but we keep cost and overlay buttons) */}
      {mode === 'zoom' && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          {onDiscard && (
            <button onClick={() => handleAction('discard')} className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg text-sm font-bold hover:bg-red-700">
              Discard
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* === MINI CARD (Taller Aspect Ratio 9/16) === */}
      <div
        className={`relative w-full aspect-[9/16] group perspective-1000 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={handleCardClick}
        style={{ zIndex: showMenu ? 40 : 'auto' }}
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isRevealed ? 'rotate-y-0' : 'rotate-y-180'}`}>

          {/* Front */}
          <div className={`absolute inset-0 backface-hidden rounded-xl shadow-lg border-[3px] ${theme.border} ${theme.outerShadow}`}>
            <CardContent mode="mini" />
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
      {isZoomed && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-[340px] aspect-[9/16] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute -top-12 right-0 sm:-right-12 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>

            <div className={`w-full h-full rounded-2xl shadow-2xl border-[4px] ${theme.border}`}>
              <CardContent mode="zoom" />
            </div>
          </div>
        </div>,
        document.body
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