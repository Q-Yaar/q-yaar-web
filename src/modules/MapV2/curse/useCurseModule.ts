import { useCallback, useState } from 'react';
import { Card } from '../../../models/Deck';

export interface CurseInfo {
  /** Unique per cast, not per team — a team can be under several curses at
   * once, so this (not targetTeamId) is what identifies one to complete. */
  id: string;
  targetTeamId: string;
  card: Card;
  castByTeamId: string;
  castAt: string;
}

export interface UseCurseModuleResult {
  /** Every active curse, across every team — see the DEMO SIMPLIFICATION
   * note below for why this isn't scoped to just the viewer's own team. A
   * team can carry more than one at once (a hider can stack curses), so
   * this is a flat list rather than one-per-team. */
  curses: CurseInfo[];
  curseFor: (teamId: string | null) => CurseInfo[];
  /** Hider action — casts a CURSE-type card on another team, from that
   * card's detail view (see MapCanvas.tsx's CardDetailModal wiring). Adds
   * a new curse rather than replacing one already on that team. */
  castCurse: (targetTeamId: string, card: Card, castByTeamId: string) => void;
  /** Seeker action — marks one specific curse's real-world challenge as
   * done, clearing just that one (identified by CurseInfo.id) — the rest,
   * if any, stay active and can be completed in any order. */
  completeCurse: (curseId: string) => void;

  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

/**
 * Mock curse status — there's no real backend field or endpoint for "is
 * this team currently cursed" yet (the user's own words: "there will be a
 * new api or status for that"), so this is local state for the session,
 * same reasoning as useFactsLayers's draftQuestions. A hider casts a
 * CURSE-type card (src/models/Deck.ts — see mock/cards_response.ts for
 * what a real one looks like: a real-world physical/verbal challenge in
 * its description, not a digital effect) on another team from that card's
 * CardDetailModal; the cursed team's own Seeking-mode "Cursed" button
 * lights up until every active curse on it is marked completed. Multiple
 * curses can stack on the same team — nothing here assumes only one is
 * ever active. Both sides read/write the same instance of this hook
 * (owned once in MapCanvas.tsx), so casting and completing stay in sync
 * within one session the same way answeredFacts does for the
 * answer-questions flow.
 *
 * DEMO SIMPLIFICATION — TODO fix later: the Seeking-mode "Cursed" button
 * and sheet show *every* active curse rather than just the viewer's own
 * team's, because there's no session/role linkage yet that would let a
 * single browser tab know "which team am I actually playing as"
 * independent of the manual Hiding/Seeking toggle (a hider can never
 * curse their own team, so scoping strictly to teamFilter.myTeamId would
 * mean this mock could never demo the seeker side at all in one session).
 * Once there's a real per-player team identity (or a real backend
 * endpoint that already scopes this correctly), curseFor(teamId) below is
 * the right building block to switch back to.
 */
export function useCurseModule(): UseCurseModuleResult {
  const [curses, setCurses] = useState<CurseInfo[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const curseFor = useCallback(
    (teamId: string | null) => (teamId ? curses.filter((c) => c.targetTeamId === teamId) : []),
    [curses],
  );

  const castCurse = useCallback((targetTeamId: string, card: Card, castByTeamId: string) => {
    const curse: CurseInfo = {
      id: `curse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      targetTeamId,
      card,
      castByTeamId,
      castAt: new Date().toISOString(),
    };
    setCurses((prev) => [...prev, curse]);
  }, []);

  const completeCurse = useCallback((curseId: string) => {
    setCurses((prev) => prev.filter((c) => c.id !== curseId));
  }, []);

  return {
    curses,
    curseFor,
    castCurse,
    completeCurse,
    isSheetOpen,
    openSheet: () => setIsSheetOpen(true),
    closeSheet: () => setIsSheetOpen(false),
  };
}
