import React from 'react';
import { uberDark } from '../theme';

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
          position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, backgroundColor: uberDark.surfaceElevated, color: uberDark.textPrimary,
          padding: '8px 10px 8px 16px', border: `1px solid ${uberDark.border}`,
          borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
        }}
      >
        {pickPrompt}
        <button
          onClick={onCancelPick}
          style={{
            background: 'rgba(255,255,255,0.12)', border: 'none', color: uberDark.textPrimary,
            borderRadius: '14px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, backgroundColor: 'rgba(20,20,20,0.85)', padding: '6px 14px',
        border: `1px solid ${uberDark.border}`,
        borderRadius: '20px', fontSize: '12px', color: uberDark.textSecondary,
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
      }}
    >
      Click the map to place measurement points · click a shaded fact to inspect it
    </div>
  );
};
