import React from 'react';
import { MAP_HEADER_HEIGHT_PX, uberDark } from '../theme';

interface MapStatusBannerProps {
  /** Non-null while a wizard map-pick is pending — the prompt for what to
   * tap and a way to cancel it. Nothing renders otherwise. */
  pickPrompt: string | null;
  onCancelPick: () => void;
}

/**
 * Shown only while the draft-fact wizard is waiting for a map tap — the
 * prompt for what to tap and a way to cancel it.
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

  return null;
};
