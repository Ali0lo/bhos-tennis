'use client';

import { useEffect } from 'react';

let activeLocks = 0;
let savedOverflow = '';

/**
 * Locks background document scrolling while mounted.
 * Reference-counted so nested / stacked modals restore overflow only once all are closed.
 */
export default function ScrollLock() {
  useEffect(() => {
    if (activeLocks === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeLocks += 1;

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);
      if (activeLocks === 0) {
        document.body.style.overflow = savedOverflow;
      }
    };
  }, []);

  return null;
}
