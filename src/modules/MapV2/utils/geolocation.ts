import { POINT_SOURCE, ResolvedLatLon } from '../factsV2/factTypes';

/**
 * The ASKER_LOCATION slot source from "Ask to Fact" — a device GPS fix,
 * captured automatically. Used by the draft-fact wizard's "Use my current
 * location" option so a resolved point carries the same provenance a real
 * question would.
 */
export function resolveCurrentLocation(): Promise<ResolvedLatLon> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: String(position.coords.latitude),
          lon: String(position.coords.longitude),
          source: POINT_SOURCE.ASKER_LOCATION,
          captured_at: new Date().toISOString(),
          accuracy_m: Math.round(position.coords.accuracy),
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}
