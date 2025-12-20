import { useState, useRef, useEffect } from "react";
import { Flame, MoreVertical, RotateCcw, Trash2 } from "lucide-react";
import { Card } from "../../models/Deck";

interface PlayingCardProps {
  card: Card;
  onDiscard?: () => void;
  onReturn?: () => void;
  defaultFaceDown?: boolean;
  forceFaceUp?: boolean; // New prop to control state from parent
  disabled?: boolean;
}

export const PlayingCard = ({
  card,
  onDiscard,
  onReturn,
  defaultFaceDown = false,
  forceFaceUp, // Optional prop
  disabled = false
}: PlayingCardProps) => {
  const [isRevealed, setIsRevealed] = useState(!defaultFaceDown);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync internal state if parent forces a change (Reveal All / Conceal All)
  useEffect(() => {
    if (forceFaceUp !== undefined) {
      setIsRevealed(forceFaceUp);
    }
  }, [forceFaceUp]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    // Support both mouse and touch
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", (e) => handleClickOutside(e as unknown as MouseEvent));

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", (e) => handleClickOutside(e as unknown as MouseEvent));
    };
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card flip if clicking the menu button
    if ((e.target as HTMLElement).closest('.card-menu-btn')) return;

    if (disabled) return;

    // Toggle state individually
    setIsRevealed(!isRevealed);

    if (showMenu) setShowMenu(false);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAction = (action: 'return' | 'discard', e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (action === 'return' && onReturn) onReturn();
    if (action === 'discard' && onDiscard) onDiscard();
  };

  return (
    <div
      className={`relative w-full aspect-[2/3] group perspective-1000 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={handleCardClick}
      style={{ zIndex: showMenu ? 50 : 'auto' }}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isRevealed ? 'rotate-y-0' : 'rotate-y-180'}`}>

        {/* === FRONT OF CARD === */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-xl shadow-md border border-gray-200 flex flex-col">

          {/* Card Header & Image */}
          <div className="h-2/5 relative">
            <div className="absolute inset-0 rounded-t-xl overflow-hidden">
              {card.image ? (
                <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-3xl opacity-20">🃏</span>
                </div>
              )}
            </div>

            {/* Top Right Type Label */}
            <div className="absolute top-2 left-2 z-10">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase ${card.card_type === 'CURSE' ? 'bg-purple-100 text-purple-800' : 'bg-white/90 text-gray-800'
                }`}>
                {card.card_type}
              </span>
            </div>

            {/* === MENU BUTTON === */}
            {(onDiscard || onReturn) && (
              <div className="absolute top-1 right-1 z-20" ref={menuRef}>
                <button
                  onClick={handleMenuClick}
                  className="card-menu-btn p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-colors shadow-sm"
                >
                  <MoreVertical size={16} />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden text-sm z-30 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    {onReturn && (
                      <button
                        onClick={(e) => handleAction('return', e)}
                        className="w-full px-3 py-3 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-b border-gray-50 active:bg-gray-100"
                      >
                        <RotateCcw size={14} /> Return
                      </button>
                    )}
                    {onDiscard && (
                      <button
                        onClick={(e) => handleAction('discard', e)}
                        className="w-full px-3 py-3 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 active:bg-red-100"
                      >
                        <Trash2 size={14} /> Discard
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="flex-1 p-2 sm:p-3 flex flex-col justify-between overflow-hidden">
            <div>
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm mb-1 leading-tight line-clamp-2">{card.title}</h4>
              <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-3 leading-relaxed">{card.description}</p>
            </div>

            <div className="space-y-1.5 mt-2">
              {/* Cost */}
              {card.metadata?.casting_cost && (
                <div className="flex items-start gap-1.5 text-[10px] text-red-600 bg-red-50 p-1 rounded inline-flex">
                  <Flame size={10} className="mt-0.5 shrink-0" />
                  <span className="font-medium leading-tight">{card.metadata.casting_cost}</span>
                </div>
              )}

              {/* Tags */}
              {card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {card.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium border border-gray-200">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === BACK OF CARD === */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-indigo-900 rounded-xl border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
          <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center text-white/50">
            <span className="text-xl font-bold">?</span>
          </div>
        </div>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-0 { transform: rotateY(0deg); }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};