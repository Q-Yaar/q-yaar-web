import { useEffect } from 'react';

export function useLockBodyScroll(isLocked = true) {
  useEffect(() => {
    if (!isLocked) return;

    // Save initial body style
    const originalStyle = window.getComputedStyle(document.body).overflow;

    // Prevent scrolling on mount
    document.body.style.overflow = 'hidden';

    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isLocked]); // Re-run effect if lock state changes
}
