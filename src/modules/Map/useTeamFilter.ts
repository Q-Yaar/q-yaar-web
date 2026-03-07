import { Team } from 'models/Team';
import { useState, useEffect, useMemo } from 'react';

export const useTeamFilter = (teamsData: Team[] | undefined) => {
  const STORAGE_KEY = 'map_selected_team_id';

  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });

  // Handle validation and fallback
  useEffect(() => {
    if (!teamsData || teamsData.length === 0) return;

    const isValid = teamsData.some((team) => team.team_id === selectedTeamFilter);

    if (!isValid) {
      const fallbackId = teamsData[0].team_id;
      setSelectedTeamFilter(fallbackId);
      localStorage.setItem(STORAGE_KEY, fallbackId);
    }
  }, [teamsData, selectedTeamFilter]);

  // Sync to localStorage on manual changes
  const handleSetSelectedTeam = (id: string) => {
    setSelectedTeamFilter(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
    selectedTeamFilter,
    setSelectedTeamFilter: handleSetSelectedTeam,
  };
};