import { useCallback, useState } from 'react';
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
  peekedCard: Card | null;
  peeking: boolean;
  drawing: boolean;
  openDrawModal: () => void;
  confirmDraw: () => void;
  closeDrawModal: () => void;
}

/**
 * The hider's card system, wired to the real deck API (src/apis/deckApi.ts
 * — the same endpoints DeckPage.tsx uses for its own hand/discard/draw
 * flows) rather than mock data. Counts on the CardModule buttons come from
 * the dedicated stats endpoint, not derived from the full hand/discard
 * lists — those only fetch once their sheet is actually opened (`skip`
 * gated on `activeSheet`), since a badge number doesn't need the full card
 * payload. Drawing peeks exactly one card and waits for confirmation
 * before actually drawing it — DeckPage's own peek-then-draw mechanic,
 * simplified to one card at a time since this module has no multi-select
 * peek UI.
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
  const { data: peeked, isFetching: peeking } = usePeekDeckQuery(
    { teamId: teamId ?? '', numberOfCards: 1 },
    { skip: !teamId || !isDrawModalOpen },
  );
  const [drawCardMutation, { isLoading: drawing }] = useDrawCardMutation();
  const peekedCard = peeked?.[0] ?? null;

  const openDrawModal = useCallback(() => setIsDrawModalOpen(true), []);
  const closeDrawModal = useCallback(() => setIsDrawModalOpen(false), []);

  const confirmDraw = useCallback(() => {
    if (!teamId || !peekedCard) return;
    drawCardMutation({ cardId: peekedCard.card_id, teamId })
      .unwrap()
      .then(() => setIsDrawModalOpen(false))
      .catch((err) => console.warn('[MapV2] Draw card failed', err));
  }, [teamId, peekedCard, drawCardMutation]);

  const discardCard = useCallback((cardId: string) => {
    if (!teamId) return;
    discardCardMutation({ cardId, teamId })
      .unwrap()
      .catch((err) => console.warn('[MapV2] Discard card failed', err));
  }, [teamId, discardCardMutation]);

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
    peekedCard,
    peeking,
    drawing,
    openDrawModal,
    confirmDraw,
    closeDrawModal,
  };
}
