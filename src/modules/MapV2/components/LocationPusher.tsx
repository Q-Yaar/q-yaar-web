import { useEffect } from 'react';
import { useGetLocationSettingsQuery } from '../../../apis/locationApi';
import { BASE_URL } from '../../../constants/api-endpoints';

const PUSH_INTERVAL_MS = 30000;
/** The client-type segment LocationSettings.tsx substitutes into
 * tracking_endpoint's `<location_client>` placeholder for the Traccar
 * mobile flow ('TRACCAR') — this is the browser-tab equivalent, per the
 * live-location webhook's own OpenAPI spec
 * (/api/v1/wh/live-location/WEB_APP/track/{tracking_id}). */
const LOCATION_CLIENT = 'WEB_APP';

/**
 * Renders nothing — a headless side effect that pushes this browser tab's
 * location to the real live-location webhook every 30s, the same
 * tracking_id-authenticated endpoint the Traccar mobile client already
 * pushes to (see src/modules/Location/LocationSettings.tsx's
 * tracking_endpoint handling), just sourced from the Geolocation API
 * instead of a native app. Only active while location sharing is enabled
 * (useGetLocationSettingsQuery's is_sharing_enabled) — nothing is
 * scheduled otherwise, and disabling sharing (or a settings refetch
 * turning it off) stops the interval via this effect's own cleanup.
 *
 * The webhook itself takes no auth token (its OpenAPI spec declares
 * `security: []`, overriding the app's global bearer requirement — the
 * unguessable tracking_id embedded in the URL is what authorizes the
 * push), so this uses a plain fetch rather than the app's authenticated
 * baseQuery.
 */
export function LocationPusher(): null {
  const { data: settings } = useGetLocationSettingsQuery();

  useEffect(() => {
    if (!settings?.is_sharing_enabled || !settings.tracking_endpoint || !settings.tracking_id) return;
    if (!navigator.geolocation) return;

    const endpointTemplate = settings.tracking_endpoint.replace('<location_client>', LOCATION_CLIENT);
    const endpointPath = endpointTemplate.endsWith('/') ? endpointTemplate : `${endpointTemplate}/`;
    const pushUrl = `${BASE_URL}${endpointPath}${settings.tracking_id}`;

    let cancelled = false;

    const pushOnce = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return;
          fetch(pushUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }),
          }).catch((err) => {
            console.warn('[MapV2] Failed to push location', err);
          });
        },
        (err) => {
          // Most commonly permission denied — nothing to push this tick;
          // the browser won't re-prompt on its own, but a later grant
          // (settings change, permission re-request elsewhere) just makes
          // the next tick succeed without any action needed here.
          console.warn('[MapV2] Geolocation unavailable for location push', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    };

    pushOnce();
    const interval = setInterval(pushOnce, PUSH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [settings]);

  return null;
}
