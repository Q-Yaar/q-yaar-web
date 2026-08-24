import React from 'react';
import { ChevronLeft, Layers } from 'lucide-react';
import { TeamFilterResult } from '../hooks/useTeamFilter';
import { GAME_MODE, GameMode } from '../hooks/useGameMode';
import { IconButton } from './IconButton';
import { TeamFilterDropdown } from './TeamFilterDropdown';
import { uberDark } from '../theme';

interface TopBarProps {
  onBack?: () => void;
  mode: GameMode;
  onSetMode: (mode: GameMode) => void;
  teamFilter: TeamFilterResult;
  onOpenLayers: () => void;
}

const MODE_OPTIONS: { mode: GameMode; label: string }[] = [
  { mode: GAME_MODE.SEEKING, label: 'Seeking' },
  { mode: GAME_MODE.HIDING, label: 'Hiding' },
];

const ModeToggle: React.FC<{ mode: GameMode; onSetMode: (mode: GameMode) => void }> = ({ mode, onSetMode }) => (
  <div
    style={{
      display: 'flex',
      borderRadius: '20px',
      backgroundColor: 'rgba(255,255,255,0.12)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      padding: '3px',
      flexShrink: 0,
    }}
  >
    {MODE_OPTIONS.map((opt) => (
      <button
        key={opt.mode}
        onClick={() => onSetMode(opt.mode)}
        style={{
          padding: '6px 12px',
          borderRadius: '16px',
          border: 'none',
          backgroundColor: mode === opt.mode ? uberDark.accent : 'transparent',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

/**
 * The map's app-bar row — no background of its own, just a positioning
 * strip over the top of the map (position:absolute) so its buttons float
 * directly on the basemap, each carrying its own translucent glass styling
 * (see IconButton, ModeToggle, TeamFilterDropdown) rather than sitting on a
 * unifying bar. The mode toggle (Hiding/Seeking — see hooks/useGameMode.ts;
 * there's no real hider/seeker field anywhere in the data model, this is a
 * manual per-device choice) always shows; the team filter dropdown only
 * makes sense in Seeking mode (a hider already sees their own team's facts
 * by definition), so it's only rendered there, otherwise leaving that
 * flexible middle slot empty. The zones icon is a fixed button on the
 * right. See useMapInstance.ts for the matching push-down of MapLibre's own
 * top-right zoom/geolocate controls, and theme.ts's MAP_HEADER_HEIGHT_PX
 * for what everything else positioned near the top of the map clears this
 * row by.
 */
export const TopBar: React.FC<TopBarProps> = ({ onBack, mode, onSetMode, teamFilter, onOpenLayers }) => (
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
    }}
  >
    {onBack && (
      <IconButton onClick={onBack} ariaLabel="Go back">
        <ChevronLeft size={20} />
      </IconButton>
    )}

    <ModeToggle mode={mode} onSetMode={onSetMode} />

    <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
      {mode === GAME_MODE.SEEKING && (
        <TeamFilterDropdown
          playerTeams={teamFilter.playerTeams}
          selectedTeamId={teamFilter.selectedTeamId}
          onChange={teamFilter.setSelectedTeamId}
          isLoading={teamFilter.isLoading}
        />
      )}
    </div>

    <IconButton onClick={onOpenLayers} ariaLabel="Zones">
      <Layers size={18} />
    </IconButton>
  </div>
);
