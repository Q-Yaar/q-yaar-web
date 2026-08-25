import { useCallback, useState } from 'react';
import { CardDto, MOCK_CARD_DECK } from './mockDeck';

export interface HeldCard {
  instance_id: string;
  card: CardDto;
}

export const CARD_SHEET = {
  HAND: 'hand',
  DISCARD: 'discard',
} as const;

export type CardSheet = (typeof CARD_SHEET)[keyof typeof CARD_SHEET] | null;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface CardsState {
  drawPile: CardDto[];
  hand: HeldCard[];
  discardPile: HeldCard[];
}

const initialCardsState = (): CardsState => ({ drawPile: shuffle(MOCK_CARD_DECK), hand: [], discardPile: [] });

export interface UseCardModuleResult {
  hand: HeldCard[];
  discardPile: HeldCard[];
  drawCard: () => void;
  discardCard: (instanceId: string) => void;
  activeSheet: CardSheet;
  openHand: () => void;
  openDiscard: () => void;
  closeSheet: () => void;
}

/**
 * The hider's card system — mock and purely local, same reasoning as
 * useFactsLayers's draftQuestions: there's no backend concept of a deck to
 * fetch or mutate yet, so state just lives in this hook for the session. A
 * shuffled draw pile seeds from MOCK_CARD_DECK; drawing pops its next card
 * into the hand, reshuffling a fresh copy once the pile runs dry so drawing
 * never dead-ends. Discarding moves a held card from hand to the discard
 * pile — nothing removes a card from the game entirely (no "play" effect
 * exists to resolve yet), it just changes which pile it's sitting in.
 *
 * drawPile/hand/discardPile live in one combined state object rather than
 * three separate useState calls specifically so each mutation is a single,
 * pure updater — moving a card between piles needs to change two of them
 * atomically, and calling one piece's setState from inside another's
 * updater (the tempting alternative) is impure and gets double-invoked
 * under StrictMode in development, silently drawing or discarding twice
 * per click.
 */
export function useCardModule(): UseCardModuleResult {
  const [state, setState] = useState<CardsState>(initialCardsState);
  const [activeSheet, setActiveSheet] = useState<CardSheet>(null);

  const drawCard = useCallback(() => {
    setState((prev) => {
      const source = prev.drawPile.length > 0 ? prev.drawPile : shuffle(MOCK_CARD_DECK);
      const [drawn, ...rest] = source;
      const heldCard: HeldCard = {
        instance_id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        card: drawn,
      };
      return { ...prev, drawPile: rest, hand: [...prev.hand, heldCard] };
    });
  }, []);

  const discardCard = useCallback((instanceId: string) => {
    setState((prev) => {
      const held = prev.hand.find((h) => h.instance_id === instanceId);
      if (!held) return prev;
      return {
        ...prev,
        hand: prev.hand.filter((h) => h.instance_id !== instanceId),
        discardPile: [...prev.discardPile, held],
      };
    });
  }, []);

  return {
    hand: state.hand,
    discardPile: state.discardPile,
    drawCard,
    discardCard,
    activeSheet,
    openHand: () => setActiveSheet(CARD_SHEET.HAND),
    openDiscard: () => setActiveSheet(CARD_SHEET.DISCARD),
    closeSheet: () => setActiveSheet(null),
  };
}
