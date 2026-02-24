import React from 'react';
import { Label } from '../ui/label';

interface TeamFilterDropdownProps {
  teamsData: any[];
  selectedTeamFilter: string;
  setSelectedTeamFilter: (teamId: string) => void;
  isLoading?: boolean;
  error?: any;
}

export const TeamFilterDropdown: React.FC<TeamFilterDropdownProps> = ({
  teamsData,
  selectedTeamFilter,
  setSelectedTeamFilter,
  isLoading = false,
  error = null
}) => {
  // Handle loading state
  if (isLoading) {
    return (
      <div style={{ margin: '15px 0', padding: '10px 0', borderBottom: '1px solid #eee' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#555' }}>
          Filter Facts by Team
        </label>
        <div style={{
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '0.9rem',
          backgroundColor: '#f5f5f5',
          color: '#666',
          display: 'flex',
          alignItems: 'center'
        }}>
          Loading teams...
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div style={{ margin: '15px 0', padding: '10px 0', borderBottom: '1px solid #eee' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#555' }}>
          Filter Facts by Team
        </label>
        <div style={{
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ffcccc',
          fontSize: '0.9rem',
          backgroundColor: '#fff5f5',
          color: '#d32f2f',
          display: 'flex',
          alignItems: 'center'
        }}>
          Error loading teams. Please refresh.
        </div>
      </div>
    );
  }

  // Handle empty state
  if (!teamsData || teamsData.length === 0) {
    return (
      <div style={{ margin: '15px 0', padding: '10px 0', borderBottom: '1px solid #eee' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: '#555' }}>
          Filter Facts by Team
        </label>
        <div style={{
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '0.9rem',
          backgroundColor: '#f5f5f5',
          color: '#666',
          display: 'flex',
          alignItems: 'center'
        }}>
          No teams available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-4 border-b border-gray-100">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block text-left">
        Filter Facts by Team
      </Label>
      <select
        value={selectedTeamFilter}
        onChange={(e) => setSelectedTeamFilter(e.target.value)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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