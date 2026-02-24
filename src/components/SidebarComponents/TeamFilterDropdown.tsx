import React from 'react';

interface TeamFilterDropdownProps {
  teamsData: any[];
  selectedTeamFilter: string;
  setSelectedTeamFilter: (teamId: string) => void;
}

export const TeamFilterDropdown: React.FC<TeamFilterDropdownProps> = ({
  teamsData,
  selectedTeamFilter,
  setSelectedTeamFilter
}) => {
  if (!teamsData || teamsData.length === 0) return null;

  return (
    <div style={{ margin: '15px 0', padding: '10px 0', borderBottom: '1px solid #eee' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#555' }}>
        Filter Facts by Team
      </label>
      <select
        value={selectedTeamFilter}
        onChange={(e) => setSelectedTeamFilter(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '0.9rem',
          backgroundColor: 'white',
          cursor: 'pointer',
        }}
      >
        {teamsData.map((team) => (
          <option key={team.team_id} value={team.team_id}>
            {team.team_name}
          </option>
        ))}
      </select>
    </div>
  );
};