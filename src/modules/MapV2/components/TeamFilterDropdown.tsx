import React from 'react';
import { Team } from '../../../models/Team';
import { uberDark } from '../theme';

interface TeamFilterDropdownProps {
  playerTeams: Team[];
  selectedTeamId: string | null;
  onChange: (teamId: string) => void;
  isLoading: boolean;
}

/**
 * Compact team-filter select for the top bar — a plain inline pill rather
 * than a floating card, so it sits alongside the other top-bar controls
 * instead of stacking its own box above them.
 */
export const TeamFilterDropdown: React.FC<TeamFilterDropdownProps> = ({ playerTeams, selectedTeamId, onChange, isLoading }) => {
  if (isLoading || playerTeams.length === 0) return null;

  return (
    <select
      value={selectedTeamId ?? ''}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Facts for team"
      style={{
        width: '100%',
        maxWidth: '220px',
        padding: '9px 12px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: uberDark.textPrimary,
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}
    >
      {playerTeams.map((team) => (
        <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
      ))}
    </select>
  );
};
