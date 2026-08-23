import React from 'react';
import { uberDark } from '../theme';

interface IconButtonProps {
  onClick: () => void;
  ariaLabel: string;
  active?: boolean;
  children: React.ReactNode;
}

/** The one 40px circular touch target every icon control in MapV2's chrome
 * (back, layers, preview) is built from, so they line up exactly regardless
 * of which component renders them. */
export const IconButton: React.FC<IconButtonProps> = ({ onClick, ariaLabel, active, children }) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      border: `1px solid ${active ? uberDark.accent : uberDark.border}`,
      backgroundColor: active ? uberDark.accent : uberDark.surfaceElevated,
      color: uberDark.textPrimary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0,
    }}
  >
    {children}
  </button>
);
