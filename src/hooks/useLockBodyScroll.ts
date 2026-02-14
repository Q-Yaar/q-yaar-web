import { useEffect } from 'react';

// Global state to track lock count and original style to handle nested modals
let lockCount = 0;
let originalStyle = '';

export function useLockBodyScroll(isLocked = true) {
  useEffect(() => {
    if (!isLocked) return;

    // Increment lock count
    lockCount++;

    // Only lock and save style if this is the first lock
    if (lockCount === 1) {
      originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      lockCount--;

      // Only unlock if there are no more locks
      if (lockCount === 0) {
        document.body.style.overflow = originalStyle;
      }
    };
  }, [isLocked]);
}
