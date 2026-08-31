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
 * (if any) CardDetailModal offers for it. CURSE is the odd one out: it's
 * not one of this hook's own lists (see curse/useCurseModule.ts), but the
 * detail-view plumbing here is generic enough to reuse for "show me this
 * curse's card properly" from the Seeking-mode Cursed sheet too — no
 * action, view only. */
export const DETAIL_CONTEXT = {
  DRAW: 'draw',
  HAND: 'hand',
  DISCARD: 'discard',
  CURSE: 'curse',
} as const;

export type DetailContext = (typeof DETAIL_CONTEXT)[keyof typeof DETAIL_CONTEXT];

/** How many cards the peek grid starts revealed — DeckPage's own default
 * (handlePeekDeck sets peekCount = 1); a "Peek more" tile in the grid
 * reveals one more at a time from there, up to however many are left. Not
 * used for a bounded reward draw (see DrawOptions.maxCards below), which
 * starts fully revealed instead — a handful of reward cards doesn't need
 * the same one-at-a-time pacing the whole deck does. */
const INITIAL_PEEK_COUNT = 1;

/** Bounds a draw to a specific "draw N, pick M" — a reward's own counts
 * (models/QnA.ts's Reward.reward_meta), rather than the ordinary free
 * peek-then-draw flow's "peek the whole deck, pick as many as you like."
 * See cards/useRewardClaimFlow.ts, the only caller that passes this. */
export interface DrawOptions {
  /** Peek exactly this many cards instead of the whole remaining deck. */
  maxCards: number;
  /** toggleSelect silently ignores a pick past this many already selected. */
  maxPick: number;
  /** Fired once the draw call(s) succeed, before the modal closes — the
   * reward flow uses this to mark its reward claimed right away, per
   * "update the asked question's reward as claimed right after calling the
   * draw api" rather than waiting on the modal to fully close. */
  onDrawn: () => void;
}

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
  /** Omit for the ordinary free draw (peek the whole deck, pick any number);
   * pass DrawOptions for a reward's bounded "draw N, pick M" (see
   * cards/useRewardClaimFlow.ts). */
  openDrawModal: (options?: DrawOptions) => void;
  closeDrawModal: () => void;
  drawSelected: () => void;
  drawAll: () => void;
  /** Set only during a reward-bounded draw — DrawCardModal reads this to
   * cap its header copy and hide "Draw all" (picking a subset, not
   * everything drawn, is the whole point of "pick M"). */
  maxPick: number | undefined;

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
 *
 * openDrawModal(options) bounds this same mechanic to a reward's own
 * "draw N, pick M" (DrawOptions) instead: peeks exactly N (not the whole
 * deck), reveals all of them immediately (no "Peek more" pacing — a
 * handful of reward cards doesn't need it), caps selection at M
 * (toggleSelect silently ignores a pick past that), and fires
 * DrawOptions.onDrawn right after the draw call(s) succeed. "Draw all"
 * still exists but the caller (cards/useRewardClaimFlow.ts) hides it in
 * this case — drawing every peeked card isn't "pick M" at all once N > M.
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
  const [drawOptions, setDrawOptions] = useState<DrawOptions | null>(null);
  const drawNumberOfCards = drawOptions?.maxCards ?? stats?.deck_cards ?? 0;
  const { data: peeked, isFetching: peeking } = usePeekDeckQuery(
    { teamId: teamId ?? '', numberOfCards: drawNumberOfCards },
    { skip: !teamId || !isDrawModalOpen || !drawNumberOfCards },
  );
  const allPeeked = useMemo(() => peeked ?? [], [peeked]);
  const peekedCards = useMemo(() => allPeeked.slice(0, peekCount), [allPeeked, peekCount]);
  const canPeekMore = allPeeked.length > peekedCards.length;
  const [drawCardMutation, { isLoading: drawing }] = useDrawCardMutation();

  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [detailContext, setDetailContext] = useState<DetailContext | null>(null);

  const openDrawModal = useCallback((options?: DrawOptions) => {
    setSelectedIds(new Set());
    // A bounded reward draw reveals its whole (small) N immediately rather
    // than pacing through INITIAL_PEEK_COUNT-at-a-time "Peek more" taps.
    setPeekCount(options?.maxCards ?? INITIAL_PEEK_COUNT);
    setDrawOptions(options ?? null);
    setIsDrawModalOpen(true);
  }, []);
  const closeDrawModal = useCallback(() => {
    setIsDrawModalOpen(false);
    setSelectedIds(new Set());
    setDrawOptions(null);
  }, []);
  const peekMore = useCallback(() => setPeekCount((prev) => prev + 1), []);

  const toggleSelect = useCallback((cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
        return next;
      }
      // At a reward's pick cap already — silently ignore rather than
      // letting DrawCardModal draw more than the reward actually grants.
      if (drawOptions && next.size >= drawOptions.maxPick) return prev;
      next.add(cardId);
      return next;
    });
  }, [drawOptions]);

  // Resolves true/false rather than swallowing the outcome entirely — a
  // reward's onDrawn (see DrawOptions) must only fire once the draw
  // actually succeeded, never on a caught failure, or a claim would be
  // spent for nothing.
  const drawCardIds = useCallback((cardIds: string[]): Promise<boolean> => {
    if (!teamId || cardIds.length === 0) return Promise.resolve(false);
    return Promise.all(cardIds.map((cardId) => drawCardMutation({ cardId, teamId }).unwrap()))
      .then(() => true)
      .catch((err) => {
        console.warn('[MapV2] Draw card failed', err);
        return false;
      });
  }, [teamId, drawCardMutation]);

  const drawSelected = useCallback(() => {
    drawCardIds(Array.from(selectedIds)).then((success) => {
      if (success) drawOptions?.onDrawn();
      closeDrawModal();
    });
  }, [drawCardIds, selectedIds, closeDrawModal, drawOptions]);

  const drawAll = useCallback(() => {
    drawCardIds(peekedCards.map((c) => c.card_id)).then((success) => {
      if (success) drawOptions?.onDrawn();
      closeDrawModal();
    });
  }, [drawCardIds, peekedCards, closeDrawModal, drawOptions]);

  const drawOneAndClose = useCallback((cardId: string) => {
    drawCardIds([cardId]).then((success) => {
      if (success) drawOptions?.onDrawn();
      setDetailCard(null);
      setDetailContext(null);
      closeDrawModal();
    });
  }, [drawCardIds, closeDrawModal, drawOptions]);

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
    maxPick: drawOptions?.maxPick,
    detailCard,
    detailContext,
    openDetail,
    closeDetail,
    drawOneAndClose,
  };
}
