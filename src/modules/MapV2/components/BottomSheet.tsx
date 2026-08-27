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

/**
 * A miniature version of GameButton's chunky press-button material
 * (gradient fill, hard bottom-edge shadow standing in for bevel, a real
 * press animation) instead of a bare text link — the header actions
 * dismiss/advance the sheet, they're not incidental chrome, so they get
 * the same "this is a game control" language as Draw/Answer/Ask do.
 */
const headerButtonClass = (accent: boolean, disabled?: boolean): string => {
  if (disabled) {
    return 'rounded-full border border-white/10 bg-gradient-to-b from-[#4a4a4a] to-[#2e2e2e] px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white/40 shadow-[0_2px_0_#1a1a1a] cursor-not-allowed whitespace-nowrap';
  }
  return `rounded-full border px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap cursor-pointer transition-all active:translate-y-[2px] active:shadow-none ${
    accent
      ? 'border-white/30 bg-gradient-to-b from-[#4F91FF] to-[#1E56D6] text-white shadow-[0_3px_0_#123a91]'
      : 'border-white/20 bg-gradient-to-b from-[#5a5a5a] to-[#3a3a3a] text-white/90 shadow-[0_3px_0_#1e1e1e]'
  }`;
};

/**
 * The one sheet pattern every MapV2 flow that needs more room than a pill
 * uses (draft-fact wizard, layer controls, fact details) — slides up from
 * the bottom of the *viewport*, not the map, and only the sheet itself
 * takes pointer events (the fixed wrapper is pointerEvents:none). That's
 * what keeps the map visible *and* interactive above it instead of sitting
 * behind a darkened, blocking backdrop the way a centered modal would.
 *
 * Deliberately translucent (a blurred glass panel, not a solid card) with
 * no distinct header bar — just a title floating between two text
 * actions — so it reads as a light overlay on the map rather than a
 * separate screen bolted on top of it.
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
            maxWidth: '440px',
            maxHeight: '70dvh',
            backgroundColor: 'rgba(28,28,28,0.7)',
            backdropFilter: 'blur(22px) saturate(160%)',
            WebkitBackdropFilter: 'blur(22px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: '2px solid rgba(255,255,255,0.22)',
            borderBottom: 'none',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            boxShadow: '0 -10px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            animation: 'mapv2-sheet-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px', flex: '0 0 auto' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.28)', boxShadow: '0 0 6px rgba(255,255,255,0.15)' }} />
          </div>

          <div
            style={{
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px 8px',
            }}
          >
            <div style={{ flex: '0 0 auto', minWidth: '64px' }}>
              <button onClick={leftAction.onClick} disabled={leftAction.disabled} className={headerButtonClass(false, leftAction.disabled)}>
                {leftAction.label}
              </button>
            </div>
            <h2 style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: '13px', fontWeight: 700, color: uberDark.textPrimary, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </h2>
            <div style={{ flex: '0 0 auto', minWidth: '64px', display: 'flex', justifyContent: 'flex-end' }}>
              {rightAction && (
                <button onClick={rightAction.onClick} disabled={rightAction.disabled} className={headerButtonClass(true, rightAction.disabled)}>
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
              padding: '0 14px calc(12px + env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
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
