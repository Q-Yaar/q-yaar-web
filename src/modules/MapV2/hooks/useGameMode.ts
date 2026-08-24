import { useCallback, useState } from 'react';

/**
 * There is no hider/seeker role anywhere in the real data model today —
 * Team.team_type is only 'PLAYER' | 'SPECTATOR', Game.game_status only
 * tracks the match lifecycle. So this is a manual, per-device toggle, not
 * a fetched truth — persisted per game in localStorage so a reload doesn't
 * silently reset a hider back to the "Seeking" default mid-game.
 */
export const GAME_MODE = {
  HIDING: 'HIDING',
  SEEKING: 'SEEKING',
} as const;

export type GameMode = (typeof GAME_MODE)[keyof typeof GAME_MODE];

export interface UseGameModeResult {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
}

const storageKey = (gameId: string | undefined): string => `mapv2-mode-${gameId ?? 'default'}`;

function readStoredMode(gameId: string | undefined): GameMode {
  try {
    const stored = localStorage.getItem(storageKey(gameId));
    return stored === GAME_MODE.HIDING || stored === GAME_MODE.SEEKING ? stored : GAME_MODE.SEEKING;
  } catch {
    return GAME_MODE.SEEKING;
  }
}

export function useGameMode(gameId: string | undefined): UseGameModeResult {
  const [mode, setModeState] = useState<GameMode>(() => readStoredMode(gameId));

  const setMode = useCallback((next: GameMode) => {
    setModeState(next);
    try {
      localStorage.setItem(storageKey(gameId), next);
    } catch {
      // Best-effort only — a failed write just means the toggle won't
      // survive a reload, not a broken mode switch.
    }
  }, [gameId]);

  return { mode, setMode };
}
