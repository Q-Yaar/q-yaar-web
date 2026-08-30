import { useMemo } from 'react';
import { useGetLocationsForGameQuery } from '../../../apis/locationApi';
import { formatLastSeen } from '../../../utils/formatTime';
import { PlayerLocationItem } from '../layers/modules/PlayerLocationsModule';

const POLL_INTERVAL_MS = 30000;

export interface UsePlayerLocationsResult {
  items: PlayerLocationItem[];
  isLoading: boolean;
}

/**
 * Player location pings for the map, reshaped into PlayerLocationsModule's
 * item shape. Same real endpoint (src/apis/locationApi.ts's
 * useGetLocationsForGameQuery, GET /live-location/games/:id/) and the same
 * 30s poll the old Map page already uses (src/modules/Map/index.tsx) — no
 * websocket/push channel exists anywhere in this app, so polling is the
 * only way either map gets updated positions. One marker per player
 * (user_id); "last seen" is only recomputed when a poll actually returns
 * new data, same as v1.
 */
export function usePlayerLocations(gameId: string | undefined): UsePlayerLocationsResult {
  const { data, isLoading } = useGetLocationsForGameQuery(gameId ?? '', {
    skip: !gameId,
    pollingInterval: POLL_INTERVAL_MS,
  });

  const items = useMemo<PlayerLocationItem[]>(() => {
    if (!data) return [];
    return data.map((ping) => ({
      id: ping.player.user_profile.user_id,
      coordinates: [ping.location_pnt.lng, ping.location_pnt.lat],
      playerName: ping.player.profile_name || 'Unknown',
      lastSeen: formatLastSeen(ping.modified),
    }));
  }, [data]);

  return { items, isLoading };
}
