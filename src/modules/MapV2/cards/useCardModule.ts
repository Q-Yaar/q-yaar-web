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

/** How many cards Draw peeks at once — DeckPage's own peek-then-draw
 * mechanic, just a fixed count here instead of a "peek more" control. */
const PEEK_COUNT = 3;

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
 * Draw follows DeckPage's own "peek then draw" mechanic: opening the draw
 * modal peeks PEEK_COUNT cards, the player selects zero or more (or draws
 * all of them), and only the selected ids actually get drawn — never a
 * blind single draw. A card can also be inspected via the detail modal
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
  const { data: peeked, isFetching: peeking } = usePeekDeckQuery(
    { teamId: teamId ?? '', numberOfCards: PEEK_COUNT },
    { skip: !teamId || !isDrawModalOpen },
  );
  const peekedCards = useMemo(() => peeked ?? [], [peeked]);
  const [drawCardMutation, { isLoading: drawing }] = useDrawCardMutation();

  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [detailContext, setDetailContext] = useState<DetailContext | null>(null);

  const openDrawModal = useCallback(() => {
    setSelectedIds(new Set());
    setIsDrawModalOpen(true);
  }, []);
  const closeDrawModal = useCallback(() => {
    setIsDrawModalOpen(false);
    setSelectedIds(new Set());
  }, []);

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
