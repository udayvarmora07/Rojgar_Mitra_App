import { useEffect, useRef, useState } from 'react';

/**
 * Counts down once per second while `running`. Calls `onExpire` exactly once at zero.
 * Uses wall-clock time so a backgrounded app does not "pause" the exam timer.
 */
export function useCountdown(totalSeconds: number, running: boolean, onExpire: () => void) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const endAt = useRef<number | null>(null);
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!running) {
      // Stopped: arm a fresh countdown for the next run (e.g. "New Test").
      endAt.current = null;
      expired.current = false;
      setRemaining(totalSeconds);
      return;
    }
    if (endAt.current === null) endAt.current = Date.now() + totalSeconds * 1000;

    const tick = () => {
      const left = Math.max(0, Math.round(((endAt.current ?? 0) - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !expired.current) {
        expired.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, totalSeconds]);

  return remaining;
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
