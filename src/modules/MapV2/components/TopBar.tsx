import React from 'react';
import { Bell, ChevronLeft } from 'lucide-react';
import { TeamFilterResult } from '../hooks/useTeamFilter';
import { GAME_MODE, GameMode } from '../hooks/useGameMode';
import { CompactGameButton } from './CompactGameButton';
import { TeamFilterDropdown } from './TeamFilterDropdown';

interface TopBarProps {
  onBack?: () => void;
  mode: GameMode;
  onSetMode: (mode: GameMode) => void;
  teamFilter: TeamFilterResult;
  onOpenNotifications: () => void;
  unreadNotificationCount: number;
}

const MODE_OPTIONS: { mode: GameMode; label: string }[] = [
  { mode: GAME_MODE.SEEKING, label: 'Seeking' },
  { mode: GAME_MODE.HIDING, label: 'Hiding' },
];

/**
 * A recessed track with a raised, beveled pill for whichever mode is
 * active — same game-button material as GameButton/CompactGameButton
 * (gradient fill, hard bottom-edge shadow standing in for bevel), just
 * shaped as a segmented control instead of a standalone button.
 */
const ModeToggle: React.FC<{ mode: GameMode; onSetMode: (mode: GameMode) => void }> = ({ mode, onSetMode }) => (
  <div
    style={{
      display: 'flex',
      gap: '2px',
      borderRadius: '20px',
      backgroundColor: 'rgba(0,0,0,0.35)',
      border: '1px solid rgba(255,255,255,0.15)',
      boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.45)',
      padding: '4px',
      flexShrink: 0,
    }}
  >
    {MODE_OPTIONS.map((opt) => {
      const isActive = mode === opt.mode;
      return (
        <button
          key={opt.mode}
          onClick={() => onSetMode(opt.mode)}
          style={{
            padding: '6px 14px',
            borderRadius: '16px',
            border: isActive ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
            background: isActive ? 'linear-gradient(180deg, #4F91FF, #1E56D6)' : 'transparent',
            boxShadow: isActive ? '0 3px 0 #123a91, 0 4px 10px rgba(30,86,214,0.4)' : undefined,
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

/**
 * The map's app-bar row — no background of its own, just a positioning
 * strip over the top of the map (position:absolute) so its buttons float
 * directly on the basemap. Back and Zones are CompactGameButton instances
 * (the same chunky, beveled press-button material as Draw/Answer/Ask/
 * Cursed) rather than IconButton's plain frosted-glass circles, and the
 * mode toggle is a recessed track with a raised beveled pill for whichever
 * mode is active — the whole bar reads as game chrome now, not a settings
 * strip. The mode toggle (Hiding/Seeking — see hooks/useGameMode.ts;
 * there's no real hider/seeker field anywhere in the data model, this is a
 * manual per-device choice) always shows; the team filter dropdown only
 * makes sense in Seeking mode (a hider already sees their own team's facts
 * by definition), so it's only rendered there, otherwise leaving that
 * flexible middle slot empty. The bell is fixed on the right — it mirrors
 * the game home page's notification bell
 * (src/components/ui/NotificationBell.tsx), same real API
 * (hooks/useNotifications.ts), just opening a BottomSheet instead of an
 * anchored dropdown to match every other MapV2 flow. The Zones button
 * lives below the FactsChip instead of here now (see MapCanvas.tsx's
 * top-left column) — grouped with the other map-content toggle rather
 * than this app-bar row. See useMapInstance.ts for the matching push-down
 * of MapLibre's own top-right zoom/geolocate controls, and theme.ts's
 * MAP_HEADER_HEIGHT_PX for what everything else positioned near the top of
 * the map clears this row by.
 */
export const TopBar: React.FC<TopBarProps> = ({ onBack, mode, onSetMode, teamFilter, onOpenNotifications, unreadNotificationCount }) => (
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
    {onBack && <CompactGameButton icon={<ChevronLeft size={20} />} ariaLabel="Go back" onClick={onBack} size="sm" />}

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

    <CompactGameButton icon={<Bell size={18} />} ariaLabel="Notifications" badge={unreadNotificationCount} onClick={onOpenNotifications} size="sm" />
  </div>
);
