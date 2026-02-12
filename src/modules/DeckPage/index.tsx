import {
  ChevronRight,
  RotateCw,
  Layers,
  History,
  Hand,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { PeekModal } from './PeekModal';
import {
  useGetDeckStatsQuery,
  useGetHandQuery,
  useGetDiscardPileQuery,
  usePeekDeckQuery,
  useDrawCardMutation,
  useDiscardCardMutation,
  useShuffleDeckMutation,
  useReturnCardMutation,
} from '../../apis/deckApi';
import { PlayingCard, PlayingCardUIType } from './PlayingCard';
import { Card } from '../../models/Deck';

export default function DeckPage() {
  const navigate = useNavigate();
  const { teamId } = useParams();

  // --- STATE ---
  const [allHandFaceUp, setAllHandFaceUp] = useState(false); // Controls flip state
  const [showAllDiscard, setShowAllDiscard] = useState(false); // Keeps discard collapsible

  // Peek Modal State
  const [isPeekModalOpen, setIsPeekModalOpen] = useState(false);
  const [peekCount, setPeekCount] = useState(0);

  // --- API HOOKS ---
  const { data: stats } = useGetDeckStatsQuery(teamId!);

  // Fetch actual card objects for the Deck (Draw Pile)
  const { data: deckData } = usePeekDeckQuery({
    teamId: teamId!,
    numberOfCards: stats?.deck_cards ?? 0,
  });

  const { data: handCards = [] } = useGetHandQuery(teamId!);
  const { data: discardCards = [] } = useGetDiscardPileQuery(teamId!);

  const [drawCard, { isLoading: isDrawing }] = useDrawCardMutation();
  const [discardCard] = useDiscardCardMutation();
  const [returnCard] = useReturnCardMutation();
  const [shuffleDeck, { isLoading: isShuffling }] = useShuffleDeckMutation();

  // --- LOGIC ---
  const deckSize = stats?.deck_cards ?? 0;
  const peekedCards = deckData?.slice(0, peekCount) || [];

  const handlePeekDeck = () => {
    if (deckSize > 0) {
      setPeekCount(1);
      setIsPeekModalOpen(true);
    }
  };

  const handlePeekOneMore = () => {
    if (deckData && peekCount < deckData.length) {
      setPeekCount((prev) => prev + 1);
    }
  };

  const handleClosePeekModal = () => {
    setIsPeekModalOpen(false);
    setPeekCount(0);
  };

  const handleDrawSpecific = async (cardId: string) => {
    await drawCard({
      cardId,
      teamId: teamId!,
    });
    // If we draw a card, we should probably close the modal or update the peek view
    // Since drawing modifies the deck, the query will invalidate and refetch.
    // However, the "peekCount" might need adjustment or we might want to close.
    // Let's close the modal for "Draw One" as it's a primary action.
    // OR we can keep it open if we want to "Draw Another".
    // User goal: "Draw One" -> "Verify Card A disappears from modal... Modal stays open (if Card B remains)."

    // We don't need to manually remove it from `peekedCards` because `deckData` will update from the server.
    // BUT there is a race condition where `deckData` updates and `peekCount` stays high.
    // If we draw index 0, everything shifts.
    // Let's keep `peekCount` as is (or decrement if we are at the end).
    if (peekCount > 0) setPeekCount((c) => c - 1);
  };

  const handleDrawAllPeeked = async () => {
    // Draw all currently peeked cards
    // We can do this serially or parallel.
    // Serial is safer for order.
    for (const card of peekedCards) {
      await drawCard({
        cardId: card.card_id,
        teamId: teamId!,
      });
    }
    handleClosePeekModal();
  };

  const handleDiscard = async (cardId: string) => {
    await discardCard({ cardId, teamId: teamId! });
  };

  const handleReturn = async (cardId: string) => {
    await returnCard({ cardId, teamId: teamId! });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Sticky Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-3 sm:p-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-left">
                Card Deck
              </h1>
              <div className="text-[10px] sm:text-xs text-indigo-200 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Layers size={12} /> {deckSize} Deck
                </span>
                <span className="w-px h-3 bg-indigo-400/30"></span>
                <span className="flex items-center gap-1">
                  <History size={12} /> {stats?.discard_cards ?? 0} Discard
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => shuffleDeck(teamId!)}
            disabled={isShuffling}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors disabled:opacity-50"
          >
            <RotateCw size={14} className={isShuffling ? 'animate-spin' : ''} />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-8">
        {/* === SECTION 1: DRAW PILE (HIDDEN) === */}
        <section className="flex flex-col items-center justify-center py-6 sm:py-10 bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-200">
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-6">
            Draw Pile
          </div>

          <div
            className={`relative group perspective-1000 z-10 w-48 sm:w-56 aspect-[9/16] ${deckSize > 0 ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
            onClick={handlePeekDeck}
          >
            {/* Visual Stack Effect */}
            {deckSize > 1 && (
              <>
                <div className="absolute top-1 left-1 w-full h-full bg-indigo-800 rounded-xl border border-white opacity-40"></div>
                <div className="absolute top-2 left-2 w-full h-full bg-indigo-800 rounded-xl border border-white opacity-40"></div>
              </>
            )}

            {deckSize > 0 ? (
              // Render a "Face Down" card look manually or using CSS
              <div className="absolute inset-0 bg-indigo-950 rounded-xl border-4 border-indigo-300/50 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:16px_16px]"></div>
                <div className="w-16 h-16 rounded-full border-2 border-indigo-400/30 flex items-center justify-center bg-indigo-900/50 backdrop-blur-sm">
                  <span className="text-2xl font-bold text-indigo-300 grid place-items-center">
                    <Layers size={24} />
                  </span>
                </div>
                <div className="absolute bottom-4 text-indigo-300/50 text-xs font-bold uppercase tracking-widest">
                  Tap to Peek
                </div>
              </div>
            ) : (
              <div className="aspect-[9/16] border-2 border-indigo-200 border-dashed rounded-xl flex items-center justify-center text-indigo-300 bg-white/50">
                Empty
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            {deckSize > 0 ? (
              <p className="text-sm text-indigo-600 font-medium animate-pulse">
                Click deck to reveal cards
              </p>
            ) : (
              <p className="text-sm text-gray-400 font-medium">No cards left</p>
            )}
          </div>
        </section>

        {/* === SECTION 2: HAND CARDS === */}
        <section>
          <div className="flex items-center justify-between mb-4 sticky top-16 bg-gray-50/95 backdrop-blur py-2 z-20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Hand className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Your Hand</h2>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {handCards.length}
              </span>
            </div>

            {/* Toggle Button for FLIPPING cards, not hiding grid */}
            <button
              onClick={() => setAllHandFaceUp(!allHandFaceUp)}
              className="text-xs font-medium text-gray-500 hover:text-indigo-600 flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-transform"
            >
              {allHandFaceUp ? <EyeOff size={12} /> : <Eye size={12} />}
              {allHandFaceUp ? 'Conceal All' : 'Reveal All'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {handCards.length === 0 ? (
              <div className="col-span-full py-8 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                No cards in hand
              </div>
            ) : (
              handCards.map((card) => (
                <PlayingCard
                  key={card.card_id}
                  card={card}
                  uiType={PlayingCardUIType.HAND_PILE}
                  forceFaceUp={allHandFaceUp} // Pass the state down
                  onDiscard={() => handleDiscard(card.card_id)}
                  onReturn={() => handleReturn(card.card_id)}
                />
              ))
            )}
          </div>
        </section>

        <hr className="border-gray-200" />

        {/* === SECTION 3: DISCARD PILE (Kept Collapsible) === */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-200 rounded-lg">
                <History className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-700">Discard Pile</h2>
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {discardCards.length}
              </span>
            </div>

            <button
              onClick={() => setShowAllDiscard(!showAllDiscard)}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded-full"
            >
              {showAllDiscard ? <EyeOff size={12} /> : <Eye size={12} />}
              {showAllDiscard ? 'Collapse' : 'View All'}
            </button>
          </div>

          {!showAllDiscard && discardCards.length > 0 && (
            <div className="flex justify-center sm:justify-start">
              <div className="w-32 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
                <PlayingCard
                  card={discardCards[0]}
                  uiType={PlayingCardUIType.DISCARD_PILE}
                  disabled={true}
                />
                <p className="text-center text-[10px] text-gray-500 mt-2">
                  Most Recent
                </p>
              </div>
            </div>
          )}

          {showAllDiscard && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 animate-in slide-in-from-top-4 duration-300">
              {discardCards.length === 0 ? (
                <div className="col-span-full py-8 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                  Discard pile is empty
                </div>
              ) : (
                discardCards.map((card) => (
                  <div
                    key={card.card_id}
                    className="opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <PlayingCard
                      card={card}
                      uiType={PlayingCardUIType.DISCARD_PILE}
                      onReturn={() => handleReturn(card.card_id)}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>

      {/* === PEEK MODAL === */}
      <PeekModal
        isOpen={isPeekModalOpen}
        onClose={handleClosePeekModal}
        peekCount={peekCount}
        peekedCards={peekedCards}
        totalDeckCount={deckData?.length ?? 0}
        onPeekMore={handlePeekOneMore}
        onDraw={handleDrawSpecific}
        onDrawAll={handleDrawAllPeeked}
        isDrawing={isDrawing}
      />
    </div>
  );
}
