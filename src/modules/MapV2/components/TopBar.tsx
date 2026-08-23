import React from 'react';
import { ChevronLeft, Layers } from 'lucide-react';
import { TeamFilterResult } from '../hooks/useTeamFilter';
import { uberDark } from '../theme';
import { IconButton } from './IconButton';
import { TeamFilterDropdown } from './TeamFilterDropdown';

interface TopBarProps {
  onBack?: () => void;
  teamFilter: TeamFilterResult;
  onOpenLayers: () => void;
}

/**
 * The map's persistent app-bar row — real flex chrome that sits *above* the
 * map (flex column, not position:absolute over it), so it reflows properly
 * and the map's own flex:1 area shrinks to make room for it instead of the
 * two competing for the same space. Team filter takes the flexible middle
 * slot (only rendered once player teams exist); the zones icon is a fixed
 * button on the right.
 */
export const TopBar: React.FC<TopBarProps> = ({ onBack, teamFilter, onOpenLayers }) => (
  <div
    style={{
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      paddingTop: 'calc(10px + env(safe-area-inset-top))',
      backgroundColor: uberDark.surface,
      borderBottom: `1px solid ${uberDark.border}`,
    }}
  >
    {onBack && (
      <IconButton onClick={onBack} ariaLabel="Go back">
        <ChevronLeft size={20} />
      </IconButton>
    )}

    <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
      <TeamFilterDropdown
        playerTeams={teamFilter.playerTeams}
        selectedTeamId={teamFilter.selectedTeamId}
        onChange={teamFilter.setSelectedTeamId}
        isLoading={teamFilter.isLoading}
      />
    </div>

    <IconButton onClick={onOpenLayers} ariaLabel="Zones">
      <Layers size={18} />
    </IconButton>
  </div>
);
