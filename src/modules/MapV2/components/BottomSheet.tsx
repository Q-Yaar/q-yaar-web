import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { uberDark } from '../theme';

interface SheetAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface BottomSheetProps {
  isOpen: boolean;
  title: string;
  /** Left header slot — "Cancel" when there's nowhere to go back to yet,
   * "Back" mid-flow. Always present so the sheet is always dismissable. */
  leftAction: SheetAction;
  /** Right header slot — the flow's primary action (Continue, Add as draft
   * fact...). Omitted on steps with nothing to confirm yet. */
  rightAction?: SheetAction;
  children: React.ReactNode;
}

const headerButtonStyle = (accent: boolean, disabled?: boolean): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  padding: '6px 4px',
  fontSize: '14px',
  fontWeight: accent && !disabled ? 700 : 500,
  // A dimmed accent still reads as "blue, just paler" — swapping to the
  // muted secondary color when disabled makes "not ready yet" unambiguous.
  color: disabled ? uberDark.textSecondary : accent ? uberDark.accent : uberDark.textSecondary,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});

/**
 * The one sheet pattern every MapV2 flow that needs more room than a pill
 * uses (draft-fact wizard, layer controls, fact details) — slides up from
 * the bottom of the *viewport*, not the map, and only the sheet itself
 * takes pointer events (the fixed wrapper is pointerEvents:none). That's
 * what keeps the map visible *and* interactive above it instead of sitting
 * behind a darkened, blocking backdrop the way a centered modal would.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, title, leftAction, rightAction, children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leftAction.onClick();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, leftAction]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes mapv2-sheet-in {
          from { transform: translateY(24px); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '78dvh',
            backgroundColor: uberDark.surfaceElevated,
            border: `1px solid ${uberDark.border}`,
            borderBottom: 'none',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
            animation: 'mapv2-sheet-in 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px', flex: '0 0 auto' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: uberDark.border }} />
          </div>

          <div
            style={{
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderBottom: `1px solid ${uberDark.border}`,
            }}
          >
            <div style={{ flex: '0 0 76px' }}>
              <button onClick={leftAction.onClick} disabled={leftAction.disabled} style={headerButtonStyle(false, leftAction.disabled)}>
                {leftAction.label}
              </button>
            </div>
            <h2 style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: '15px', fontWeight: 700, color: uberDark.textPrimary, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </h2>
            <div style={{ flex: '0 0 76px', display: 'flex', justifyContent: 'flex-end' }}>
              {rightAction && (
                <button onClick={rightAction.onClick} disabled={rightAction.disabled} style={headerButtonStyle(true, rightAction.disabled)}>
                  {rightAction.label}
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};
