import React from 'react';
import { MAP_HEADER_HEIGHT_PX, uberDark } from '../theme';

interface MapStatusBannerProps {
  /** Non-null while a wizard map-pick is pending — shown instead of the
   * default hint bar, with a way to back out of the pick. */
  pickPrompt: string | null;
  onCancelPick: () => void;
}

/**
 * The single bottom-of-map status line: either the default "how to use
 * this map" hint, or — while the draft-fact wizard is waiting for a map
 * tap — the prompt for what to tap and a way to cancel it.
 */
export const MapStatusBanner: React.FC<MapStatusBannerProps> = ({ pickPrompt, onCancelPick }) => {
  if (pickPrompt) {
    return (
      <div
        style={{
          position: 'absolute',
          top: `calc(${MAP_HEADER_HEIGHT_PX}px + env(safe-area-inset-top) + 8px)`,
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, backgroundColor: uberDark.surfaceElevated, color: uberDark.textPrimary,
          padding: '8px 10px 8px 16px', border: `1px solid ${uberDark.border}`,
          borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.6)', maxWidth: 'calc(100% - 24px)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pickPrompt}</span>
        <button
          onClick={onCancelPick}
          style={{
            background: 'rgba(255,255,255,0.12)', border: 'none', color: uberDark.textPrimary,
            borderRadius: '14px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Stacked *above* the FAB row (not beside it) — sharing the bottom-right
  // corner with "Ask a question" left too little horizontal room for this
  // text on a phone-width screen and the two visibly overlapped.
  return (
    <div
      style={{
        position: 'absolute', left: '12px', right: '12px', bottom: 'calc(76px + env(safe-area-inset-bottom))',
        zIndex: 10, display: 'flex', justifyContent: 'flex-start',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(20,20,20,0.85)', padding: '6px 14px',
          border: `1px solid ${uberDark.border}`,
          borderRadius: '20px', fontSize: '11px', color: uberDark.textSecondary,
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)', maxWidth: '100%',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        Tap the map to measure · tap shading to inspect
      </div>
    </div>
  );
};
