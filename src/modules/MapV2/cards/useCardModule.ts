import { useCallback, useMemo, useState } from 'react';
import { Card } from '../../../models/Deck';
import {
  useDiscardCardMutation,
  useDrawCardMutation,
  useGetDeckStatsQuery,
  useGetDiscardPileQuery,
  useGetHandQuery,
  usePeekDeckQuery,
} from '../../../apis/deckApi';

export const CARD_SHEET = {
  HAND: 'hand',
  DISCARD: 'discard',
} as const;

export type CardSheet = (typeof CARD_SHEET)[keyof typeof CARD_SHEET] | null;

/** Which list a card being detail-viewed came from — decides what action
 * (if any) CardDetailModal offers for it. */
export const DETAIL_CONTEXT = {
  DRAW: 'draw',
  HAND: 'hand',
  DISCARD: 'discard',
} as const;

export type DetailContext = (typeof DETAIL_CONTEXT)[keyof typeof DETAIL_CONTEXT];

/** How many cards the peek grid starts revealed — DeckPage's own default
 * (handlePeekDeck sets peekCount = 1); a "Peek more" tile in the grid
 * reveals one more at a time from there, up to however many are left. */
const INITIAL_PEEK_COUNT = 1;

export interface UseCardModuleResult {
  handCount: number;
  discardCount: number;

  activeSheet: CardSheet;
  openHand: () => void;
  openDiscard: () => void;
  closeSheet: () => void;

  hand: Card[];
  handLoading: boolean;
  discardPile: Card[];
  discardLoading: boolean;
  discardCard: (cardId: string) => void;

  isDrawModalOpen: boolean;
  peekedCards: Card[];
  /** Whether the deck has more cards beyond what's currently revealed —
   * gates the peek grid's "Peek more" tile. */
  canPeekMore: boolean;
  peekMore: () => void;
  peeking: boolean;
  selectedIds: Set<string>;
  toggleSelect: (cardId: string) => void;
  drawing: boolean;
  openDrawModal: () => void;
  closeDrawModal: () => void;
  drawSelected: () => void;
  drawAll: () => void;

  detailCard: Card | null;
  detailContext: DetailContext | null;
  openDetail: (card: Card, context: DetailContext) => void;
  closeDetail: () => void;
  /** Used by the detail modal's "Draw this card" action (DETAIL_CONTEXT.DRAW) —
   * draws just this one card and closes both the detail view and the peek
   * modal behind it. */
  drawOneAndClose: (cardId: string) => void;
}

/**
 * The hider's card system, wired to the real deck API (src/apis/deckApi.ts
 * — the same endpoints DeckPage.tsx uses) rather than mock data. Counts on
 * the CardModule buttons come from the dedicated stats endpoint; the full
 * hand/discard lists only fetch once their sheet is opened.
 *
 * Draw follows DeckPage's own "peek then draw" mechanic exactly: opening
 * the draw modal fetches the *entire* remaining deck in one request
 * (numberOfCards: stats.deck_cards, same as DeckPage.tsx itself) but only
 * *reveals* INITIAL_PEEK_COUNT of them — a "Peek more" tile in the grid
 * reveals one more at a time from the already-fetched list (instant, no
 * extra request), same progressive reveal DeckPage's own peekCount does.
 * The player selects zero or more of what's revealed (or draws all of
 * them), and only the selected ids actually get drawn — never a blind
 * single draw. A card can also be inspected via the detail modal
 * (CardDetailModal) from any list it appears in (peek grid, hand, discard);
 * from the peek grid specifically, the detail view's own action draws that
 * one card directly.
 */
export function useCardModule(teamId: string | null): UseCardModuleResult {
  const { data: stats } = useGetDeckStatsQuery(teamId ?? '', { skip: !teamId });

  const [activeSheet, setActiveSheet] = useState<CardSheet>(null);
  const { data: hand, isFetching: handLoading } = useGetHandQuery(teamId ?? '', {
    skip: !teamId || activeSheet !== CARD_SHEET.HAND,
  });
  const { data: discardPile, isFetching: discardLoading } = useGetDiscardPileQuery(teamId ?? '', {
    skip: !teamId || activeSheet !== CARD_SHEET.DISCARD,
  });
  const [discardCardMutation] = useDiscardCardMutation();

  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [peekCount, setPeekCount] = useState(INITIAL_PEEK_COUNT);
  const { data: peeked, isFetching: peeking } = usePeekDeckQuery(
    { teamId: teamId ?? '', numberOfCards: stats?.deck_cards ?? 0 },
    { skip: !teamId || !isDrawModalOpen || !stats?.deck_cards },
  );
  const allPeeked = useMemo(() => peeked ?? [], [peeked]);
  const peekedCards = useMemo(() => allPeeked.slice(0, peekCount), [allPeeked, peekCount]);
  const canPeekMore = allPeeked.length > peekedCards.length;
  const [drawCardMutation, { isLoading: drawing }] = useDrawCardMutation();

  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [detailContext, setDetailContext] = useState<DetailContext | null>(null);

  const openDrawModal = useCallback(() => {
    setSelectedIds(new Set());
    setPeekCount(INITIAL_PEEK_COUNT);
    setIsDrawModalOpen(true);
  }, []);
  const closeDrawModal = useCallback(() => {
    setIsDrawModalOpen(false);
    setSelectedIds(new Set());
  }, []);
  const peekMore = useCallback(() => setPeekCount((prev) => prev + 1), []);

  const toggleSelect = useCallback((cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const drawCardIds = useCallback((cardIds: string[]): Promise<void> => {
    if (!teamId || cardIds.length === 0) return Promise.resolve();
    return Promise.all(cardIds.map((cardId) => drawCardMutation({ cardId, teamId }).unwrap()))
      .then(() => undefined)
      .catch((err) => {
        console.warn('[MapV2] Draw card failed', err);
      });
  }, [teamId, drawCardMutation]);

  const drawSelected = useCallback(() => {
    drawCardIds(Array.from(selectedIds)).then(closeDrawModal);
  }, [drawCardIds, selectedIds, closeDrawModal]);

  const drawAll = useCallback(() => {
    drawCardIds(peekedCards.map((c) => c.card_id)).then(closeDrawModal);
  }, [drawCardIds, peekedCards, closeDrawModal]);

  const drawOneAndClose = useCallback((cardId: string) => {
    drawCardIds([cardId]).then(() => {
      setDetailCard(null);
      setDetailContext(null);
      closeDrawModal();
    });
  }, [drawCardIds, closeDrawModal]);

  const discardCard = useCallback((cardId: string) => {
    if (!teamId) return;
    discardCardMutation({ cardId, teamId })
      .unwrap()
      .catch((err) => console.warn('[MapV2] Discard card failed', err));
  }, [teamId, discardCardMutation]);

  const openDetail = useCallback((card: Card, context: DetailContext) => {
    setDetailCard(card);
    setDetailContext(context);
  }, []);
  const closeDetail = useCallback(() => {
    setDetailCard(null);
    setDetailContext(null);
  }, []);

  return {
    handCount: stats?.hand_cards ?? 0,
    discardCount: stats?.discard_cards ?? 0,
    activeSheet,
    openHand: () => setActiveSheet(CARD_SHEET.HAND),
    openDiscard: () => setActiveSheet(CARD_SHEET.DISCARD),
    closeSheet: () => setActiveSheet(null),
    hand: hand ?? [],
    handLoading,
    discardPile: discardPile ?? [],
    discardLoading,
    discardCard,
    isDrawModalOpen,
    peekedCards,
    canPeekMore,
    peekMore,
    peeking,
    selectedIds,
    toggleSelect,
    drawing,
    openDrawModal,
    closeDrawModal,
    drawSelected,
    drawAll,
    detailCard,
    detailContext,
    openDetail,
    closeDetail,
    drawOneAndClose,
  };
}
