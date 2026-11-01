'use client';

import { useEffect, useRef } from 'react';

/**
 * Polling fallback hook for real-time synchronization.
 * Guarantees interval callback stability with useRef, preventing unnecessary re-subscriptions.
 */
export function usePolling(callback, intervalMs = 3500, enabled = true, { pauseWhenHidden = true } = {}) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (pauseWhenHidden && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (typeof saved.current === 'function') {
        saved.current();
      }
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled, pauseWhenHidden]);
}

export default usePolling;
