import React from 'react';
import { Label } from '../ui/label';

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