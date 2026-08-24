import { useEffect, useMemo, useRef, useState } from 'react';
import { useFetchMyTeamQuery, useFetchTeamsQuery } from '../../../apis/gameApi';
import { isPlayerTeam, Team } from '../../../models/Team';

export interface TeamFilterResult {
  /** Player teams only — spectator teams (isPlayerTeam, same helper the
   * old Map page's team filter uses) never appear as an option. */
  playerTeams: Team[];
  selectedTeamId: string | null;
  setSelectedTeamId: (teamId: string) => void;
  /** The signed-in player's own team — Hiding mode's facts load from here
   * instead of the dropdown's selectedTeamId. Null until useFetchMyTeamQuery
   * settles. */
  myTeamId: string | null;
  isLoading: boolean;
  error: unknown;
}

/**
 * A manual team-filter dropdown, like the old Map page's, but defaulted to
 * an *opposite* team rather than an arbitrary first-in-list one: a seeker
 * generally wants to see the other team's facts, not their own team's
 * reflected back at them. The user can still pick any player team,
 * including their own, from the dropdown afterwards.
 */
export function useTeamFilter(gameId: string | undefined): TeamFilterResult {
  const { data: teamsData, isLoading: teamsLoading, error } = useFetchTeamsQuery(gameId ?? '', { skip: !gameId });
  const { data: myTeam, isLoading: myTeamLoading } = useFetchMyTeamQuery(gameId ?? '', { skip: !gameId });

  const playerTeams = useMemo(() => (teamsData ?? []).filter(isPlayerTeam), [teamsData]);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Runs once, after both teams and "my team" have settled (myTeam may
  // come back undefined — e.g. an error, or a user with no team — in which
  // case the first player team is as good a default as any).
  useEffect(() => {
    if (initializedRef.current || teamsLoading || myTeamLoading || playerTeams.length === 0) return;
    const opposite = playerTeams.find((t) => t.team_id !== myTeam?.team_id) ?? playerTeams[0];
    setSelectedTeamId(opposite.team_id);
    initializedRef.current = true;
  }, [teamsLoading, myTeamLoading, playerTeams, myTeam]);

  return { playerTeams, selectedTeamId, setSelectedTeamId, myTeamId: myTeam?.team_id ?? null, isLoading: teamsLoading, error };
}
