import { ChevronRight, RotateCw, Layers, History, Hand } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
    useGetDeckStatsQuery,
    useGetHandQuery,
    useGetDiscardPileQuery,
    usePeekDeckQuery,
    useDrawCardMutation,
    useDiscardCardMutation,
    useShuffleDeckMutation
} from "../../apis/deckApi";
import { PlayingCard } from "./PlayingCard";

export default function DeckPage() {
    const navigate = useNavigate();

    const { teamId } = useParams();

    // --- API HOOKS ---
    const { data: stats } = useGetDeckStatsQuery(teamId!);

    // Fetch actual card objects for the Deck (Draw Pile)
    const { data: deckData } = usePeekDeckQuery({
        teamId: teamId!,
        numberOfCards: stats?.deck_cards ?? 0
    });

    // Fetch Hand and Discard
    const { data: handCards = [] } = useGetHandQuery(teamId!);
    const { data: discardCards = [] } = useGetDiscardPileQuery(teamId!);

    const [drawCard, { isLoading: isDrawing }] = useDrawCardMutation();
    const [discardCard] = useDiscardCardMutation();
    const [shuffleDeck, { isLoading: isShuffling }] = useShuffleDeckMutation();

    // --- LOGIC ---

    // To draw, we pick the first card from the deck list
    // The UI hides the details, but we need the ID for the API call
    const nextCardToDraw = deckData?.[0];

    const handleDraw = async () => {
        if (nextCardToDraw) {
            await drawCard({
                cardId: nextCardToDraw.card_id,
                teamId: teamId!
            });
        }
    };

    const handleDiscard = async (cardId: string) => {
        await discardCard({ cardId, teamId: teamId! });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-4 shadow-lg sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ChevronRight className="w-5 h-5 rotate-180" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Card Deck</h1>
                            <div className="text-xs text-indigo-200 flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <Layers size={14} />
                                    <span>{stats?.deck_cards ?? 0} in Deck</span>
                                </div>
                                <div className="w-px h-3 bg-indigo-400/30"></div>
                                <div className="flex items-center gap-1">
                                    <History size={14} />
                                    <span>{stats?.discard_cards ?? 0} Discarded</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => shuffleDeck(teamId!)}
                        disabled={isShuffling}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                        <RotateCw size={16} className={isShuffling ? "animate-spin" : ""} />
                        <span className="hidden sm:inline">Shuffle</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 grid grid-rows-[auto_1fr] gap-8">

                {/* Table Area: Draw & Discard */}
                <section className="bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-200 p-8 flex flex-col sm:flex-row items-center justify-center gap-12 sm:gap-24 min-h-[300px]">

                    {/* === Draw Pile === */}
                    <div className="relative group perspective-1000 z-10">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm font-bold text-indigo-400 uppercase tracking-wider">
                            Draw Pile
                        </div>

                        <div className="relative w-40 sm:w-48">
                            {/* Visual Stack Effect */}
                            {stats && stats.deck_cards > 1 && (
                                <>
                                    <div className="absolute top-1 left-1 w-full h-full bg-indigo-800 rounded-xl border border-white opacity-50"></div>
                                    <div className="absolute top-2 left-2 w-full h-full bg-indigo-800 rounded-xl border border-white opacity-50"></div>
                                </>
                            )}

                            {/* The Interactive Top Card */}
                            {/* We pass the actual card data, but set defaultFaceDown={true} so it looks like a card back */}
                            {/* We disable the internal flip logic here because clicking draw should remove it, not flip it */}
                            {nextCardToDraw ? (
                                <div onClick={handleDraw} className="cursor-pointer transition-transform active:scale-95">
                                    <PlayingCard
                                        card={nextCardToDraw}
                                        defaultFaceDown={true}
                                        disabled={isDrawing}
                                    // We prevent default flip behavior on the draw pile to act as a button
                                    />
                                </div>
                            ) : (
                                <div className="aspect-[2/3] border-2 border-indigo-200 border-dashed rounded-xl flex items-center justify-center text-indigo-300 bg-white/50">
                                    Empty
                                </div>
                            )}

                            {isDrawing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl backdrop-blur-sm z-20">
                                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-center">
                            <button
                                onClick={handleDraw}
                                disabled={isDrawing || !nextCardToDraw}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {nextCardToDraw ? "Draw Card" : "Deck Empty"}
                            </button>
                        </div>
                    </div>

                    {/* === Discard Pile === */}
                    <div className="relative">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <History size={16} /> Discard
                        </div>
                        <div className="w-40 sm:w-48 opacity-90">
                            {discardCards.length > 0 ? (
                                <PlayingCard
                                    card={discardCards[0]}
                                    defaultFaceDown={false} // Discards are face up
                                />
                            ) : (
                                <div className="aspect-[2/3] border-2 border-gray-300 border-dashed rounded-xl flex items-center justify-center text-gray-400 bg-gray-50 text-sm">
                                    Empty
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* === Hand Area === */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Hand className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Your Hand</h2>
                            <p className="text-xs text-gray-500">Tap cards to reveal</p>
                        </div>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm font-medium ml-auto">
                            {handCards.length}
                        </span>
                    </div>

                    {handCards.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <p className="text-gray-500">Your hand is empty.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {handCards.map((card) => (
                                <PlayingCard
                                    key={card.card_id}
                                    card={card}
                                    defaultFaceDown={true} // Hidden by default, tap to flip
                                    onAction={() => handleDiscard(card.card_id)}
                                    actionLabel="Discard"
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}