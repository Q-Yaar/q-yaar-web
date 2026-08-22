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
 * Manual team filter for which team's facts show on the map — defaults to
 * an opposite team (see hooks/useTeamFilter.ts) but any player team
 * (spectator teams excluded) can be picked here.
 */
export const TeamFilterDropdown: React.FC<TeamFilterDropdownProps> = ({ playerTeams, selectedTeamId, onChange, isLoading }) => {
  if (isLoading || playerTeams.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: uberDark.surfaceElevated,
        border: `1px solid ${uberDark.border}`,
        borderRadius: '16px',
        padding: '10px 12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        width: '280px',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 600, color: uberDark.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
        Facts for team
      </div>
      <select
        value={selectedTeamId ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: '8px',
          border: `1px solid ${uberDark.border}`,
          backgroundColor: uberDark.surface,
          color: uberDark.textPrimary,
          fontSize: '13px',
        }}
      >
        {playerTeams.map((team) => (
          <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
        ))}
      </select>
    </div>
  );
};
