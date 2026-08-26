import { useCallback, useMemo, useState } from 'react';
import { Card } from '../../../models/Deck';

export interface CurseInfo {
  targetTeamId: string;
  card: Card;
  castByTeamId: string;
  castAt: string;
}

export interface UseCurseModuleResult {
  /** Every team currently under a curse, keyed by the *cursed* team's id
   * (not the caster's). */
  curses: Record<string, CurseInfo>;
  /** Same records, flattened — what the Seeking-mode sheet actually
   * renders. See the DEMO SIMPLIFICATION note below for why this is every
   * curse in play rather than just the viewer's own. */
  allCurses: CurseInfo[];
  hasAnyCurse: boolean;
  curseFor: (teamId: string | null) => CurseInfo | null;
  /** Hider action — casts a CURSE-type card on another team, from that
   * card's detail view (see MapCanvas.tsx's CardDetailModal wiring). */
  castCurse: (targetTeamId: string, card: Card, castByTeamId: string) => void;
  /** Seeker action — the cursed team marks the card's real-world challenge
   * as done, clearing the curse. */
  completeCurse: (teamId: string) => void;

  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

/**
 * Mock curse status — there's no real backend field or endpoint for "is
 * this team currently cursed" yet (the user's own words: "there will be a
 * new api or status for that"), so this is local state for the session,
 * keyed by the *cursed* team's id, same reasoning as useFactsLayers's
 * draftQuestions. A hider casts a CURSE-type card (src/models/Deck.ts —
 * see mock/cards_response.ts for what a real one looks like: a real-world
 * physical/verbal challenge in its description, not a digital effect) on
 * another team from that card's CardDetailModal; the cursed team's own
 * Seeking-mode "Cursed" button lights up until they mark that challenge
 * completed. Both sides read/write the same instance of this hook (owned
 * once in MapCanvas.tsx), so casting and completing stay in sync within
 * one session the same way answeredFacts does for the answer-questions flow.
 *
 * DEMO SIMPLIFICATION — TODO fix later: the Seeking-mode "Cursed" button
 * and sheet show *every* active curse (allCurses/hasAnyCurse) rather than
 * just the viewer's own team's, because there's no session/role linkage
 * yet that would let a single browser tab know "which team am I actually
 * playing as" independent of the manual Hiding/Seeking toggle (a hider can
 * never curse their own team, so scoping strictly to
 * teamFilter.myTeamId would mean this mock could never demo the seeker
 * side at all in one session). Once there's a real per-player team
 * identity (or a real backend endpoint that already scopes this
 * correctly), curseFor(teamId) below is the right building block to
 * switch back to — allCurses/hasAnyCurse should go away entirely.
 */
export function useCurseModule(): UseCurseModuleResult {
  const [curses, setCurses] = useState<Record<string, CurseInfo>>({});
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const curseFor = useCallback((teamId: string | null) => (teamId ? curses[teamId] ?? null : null), [curses]);
  const allCurses = useMemo(() => Object.values(curses), [curses]);

  const castCurse = useCallback((targetTeamId: string, card: Card, castByTeamId: string) => {
    setCurses((prev) => ({ ...prev, [targetTeamId]: { targetTeamId, card, castByTeamId, castAt: new Date().toISOString() } }));
  }, []);

  const completeCurse = useCallback((teamId: string) => {
    setCurses((prev) => {
      if (!(teamId in prev)) return prev;
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
  }, []);

  return {
    curses,
    allCurses,
    hasAnyCurse: allCurses.length > 0,
    curseFor,
    castCurse,
    completeCurse,
    isSheetOpen,
    openSheet: () => setIsSheetOpen(true),
    closeSheet: () => setIsSheetOpen(false),
  };
}
