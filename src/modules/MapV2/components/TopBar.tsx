import React from 'react';
import { ChevronLeft, Layers } from 'lucide-react';
import { TeamFilterResult } from '../hooks/useTeamFilter';
import { IconButton } from './IconButton';
import { TeamFilterDropdown } from './TeamFilterDropdown';

interface TopBarProps {
  onBack?: () => void;
  teamFilter: TeamFilterResult;
  onOpenLayers: () => void;
}

/**
 * The map's app-bar row — a floating glass strip over the top of the map
 * (position:absolute, blurred translucent background) rather than a solid
 * bar that pushes the map down, so the basemap stays visible — softened,
 * not hidden — right underneath it. Team filter takes the flexible middle
 * slot (only rendered once player teams exist); the zones icon is a fixed
 * button on the right. See useMapInstance.ts for the matching push-down of
 * MapLibre's own top-right zoom/geolocate controls, and theme.ts's
 * MAP_HEADER_HEIGHT_PX for what everything else positioned near the top of
 * the map clears this bar by.
 */
export const TopBar: React.FC<TopBarProps> = ({ onBack, teamFilter, onOpenLayers }) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 30,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      paddingTop: 'calc(10px + env(safe-area-inset-top))',
      background: 'linear-gradient(to bottom, rgba(20,20,20,0.6), rgba(20,20,20,0.28))',
      backdropFilter: 'blur(16px) saturate(160%)',
      WebkitBackdropFilter: 'blur(16px) saturate(160%)',
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
