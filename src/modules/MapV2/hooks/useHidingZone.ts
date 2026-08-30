import { useCallback, useEffect, useState } from 'react';

export interface HidingZone {
  point: { lat: number; lon: number };
  /** Metres. */
  radius: number;
}

export interface UseHidingZoneResult {
  zone: HidingZone | null;
  saveZone: (zone: HidingZone) => void;
  clearZone: () => void;
}

const storageKey = (gameId: string | undefined): string => `mapv2-hiding-zone-${gameId ?? 'default'}`;

function readStoredZone(gameId: string | undefined): HidingZone | null {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.radius === 'number'
      && typeof parsed?.point?.lat === 'number'
      && typeof parsed?.point?.lon === 'number'
    ) {
      return parsed as HidingZone;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * A hider's own "remember where I'm hiding" marker — a point + radius kept
 * entirely on this device (localStorage, keyed per game like
 * useGameMode.ts's mode toggle), never sent to the backend or any other
 * player. Purely a personal reminder, not part of the Ask-to-Fact pipeline.
 */
export function useHidingZone(gameId: string | undefined): UseHidingZoneResult {
  const [zone, setZone] = useState<HidingZone | null>(() => readStoredZone(gameId));

  useEffect(() => {
    setZone(readStoredZone(gameId));
  }, [gameId]);

  const saveZone = useCallback((next: HidingZone) => {
    setZone(next);
    try {
      localStorage.setItem(storageKey(gameId), JSON.stringify(next));
    } catch {
      // Best-effort only — a failed write just means the zone won't
      // survive a reload, not a broken save.
    }
  }, [gameId]);

  const clearZone = useCallback(() => {
    setZone(null);
    try {
      localStorage.removeItem(storageKey(gameId));
    } catch {
      // Best-effort only, same as above.
    }
  }, [gameId]);

  return { zone, saveZone, clearZone };
}
