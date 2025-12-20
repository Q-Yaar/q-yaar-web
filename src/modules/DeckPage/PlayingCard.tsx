import { useState } from "react";
import { X, Flame } from "lucide-react";
import { Card } from "../../models/Deck";

interface PlayingCardProps {
  card: Card;
  onAction?: () => void;
  actionLabel?: string;
  defaultFaceDown?: boolean; // New prop to control initial state
  disabled?: boolean;
}

export const PlayingCard = ({ 
  card, 
  onAction, 
  actionLabel, 
  defaultFaceDown = false,
  disabled = false
}: PlayingCardProps) => {
  // If defaultFaceDown is true, start isFlipped as false (showing back)
  const [isRevealed, setIsRevealed] = useState(!defaultFaceDown);

  const handleCardClick = () => {
    if (disabled) return;
    // Only toggle if it started face down (allow peeking/revealing)
    if (defaultFaceDown) {
      setIsRevealed(!isRevealed);
    }
  };

  return (
    <div 
      className={`relative w-full aspect-[2/3] group perspective-1000 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={handleCardClick}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isRevealed ? 'rotate-y-0' : 'rotate-y-180'}`}>
        
        {/* === FRONT OF CARD (Content) === */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-xl shadow-md border border-gray-200 flex flex-col overflow-hidden">
          {/* Card Header */}
          <div className="h-1/3 bg-gray-100 p-3 border-b border-gray-100 relative">
            {card.image ? (
                <img src={card.image} alt={card.title} className="w-full h-full object-cover rounded-lg" />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                     <span className="text-4xl opacity-20">🃏</span>
                </div>
            )}
            <div className="absolute top-2 right-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase ${
                    card.card_type === 'CURSE' ? 'bg-purple-100 text-purple-800' : 'bg-white/80 text-gray-800'
                }`}>
                    {card.card_type}
                </span>
            </div>
          </div>

          {/* Card Body */}
          <div className="flex-1 p-3 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-1 leading-tight">{card.title}</h4>
              <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{card.description}</p>
            </div>
            
            <div className="space-y-2 mt-2">
               {/* Metadata / Cost Section */}
               {card.metadata?.casting_cost && (
                 <div className="flex items-start gap-1.5 text-[10px] text-red-600 bg-red-50 p-1.5 rounded">
                    <Flame size={10} className="mt-0.5 shrink-0" />
                    <span className="font-medium leading-tight">{card.metadata.casting_cost}</span>
                 </div>
               )}

               {/* Tags */}
               {card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {card.tags.map((tag, idx) => (
                    <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
               )}
            </div>
          </div>

          {/* Action Overlay (Only visible on Front) */}
          {onAction && isRevealed && (
            <div className="absolute inset-0 bg-indigo-900/0 hover:bg-indigo-900/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
               <button 
                 onClick={(e) => { e.stopPropagation(); onAction(); }}
                 className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium flex items-center gap-1.5 transform translate-y-2 hover:translate-y-0 transition-all"
               >
                 <X size={14} />
                 {actionLabel || "Discard"}
               </button>
            </div>
          )}
        </div>

        {/* === BACK OF CARD (Hidden State) === */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-indigo-900 rounded-xl border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
          <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center text-white/50">
            <span className="text-xl font-bold">?</span>
          </div>
        </div>
      </div>
      
      {/* CSS Helper for 3D Transforms (You can add this to your global CSS or Tailwind config instead) */}
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