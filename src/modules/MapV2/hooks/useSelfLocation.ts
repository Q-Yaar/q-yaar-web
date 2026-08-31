import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_ITEMS } from '../layers/hooks';
import { MyLocationItem } from '../layers/modules/MyLocationModule';

const ITEM_ID = 'me';

/** iOS Safari's non-standard field — already a compass heading (0 = north,
 * clockwise), no conversion needed, and the only reliable heading source on
 * iOS since `event.absolute` there is never true. Elsewhere (Chrome/Android's
 * deviceorientationabsolute, or a deviceorientation event whose `absolute`
 * flag is true), alpha is degrees counter-clockwise from calibration, so the
 * compass heading is `360 - alpha`. Returns null when neither is usable —
 * plenty of devices fire orientation events with every field empty until
 * their sensor actually settles. */
function extractHeading(event: DeviceOrientationEvent): number | null {
  const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
  if (typeof webkitHeading === 'number' && !Number.isNaN(webkitHeading)) return webkitHeading;
  if (event.absolute && typeof event.alpha === 'number') return (360 - event.alpha) % 360;
  return null;
}

export interface UseSelfLocationResult {
  /** [] until a fix arrives — the single "me" item once one has. Feeds
   * MyLocationModule directly. */
  items: MyLocationItem[];
  /** Starts (or, if already running, no-ops) watching this device's
   * position. Safe to call from any user gesture — the map's first tap
   * (MapCanvas) and the GeolocateControl button (useMapInstance) both call
   * it. If permission is already granted this starts tracking silently; if
   * not yet decided, the browser's own native prompt appears exactly as it
   * always has for a manual "locate me" click. Denial or an unsupported
   * browser just leaves `items` empty, same as before this feature existed. */
  requestLocation: () => void;
}

/**
 * This device's own live position + compass heading — the data behind
 * MyLocationModule's persistent "you are here" dot and heading cone.
 * Position comes from a continuous watchPosition (unlike
 * utils/geolocation.ts's resolveCurrentLocation, a one-shot fix for the
 * wizard's own point slots), gated behind requestLocation() rather than
 * started unconditionally on mount so this never forces a fresh permission
 * prompt just from opening the map. It self-starts on mount only when the
 * Permissions API (where the browser supports querying it) reports
 * geolocation is already granted — "when we have permission ... always show
 * it" — and re-checks if that grant changes while the map stays open.
 */
export function useSelfLocation(): UseSelfLocationResult {
  const [fix, setFix] = useState<MyLocationItem | null>(null);
  const headingRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startWatch = useCallback(() => {
    if (watchIdRef.current !== null || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const heading = headingRef.current
          ?? (typeof position.coords.heading === 'number' && !Number.isNaN(position.coords.heading) ? position.coords.heading : null);
        setFix({
          id: ITEM_ID,
          coordinates: [position.coords.longitude, position.coords.latitude],
          accuracyM: position.coords.accuracy,
          headingDeg: heading,
        });
      },
      (error) => console.warn('[MapV2] Self-location watch failed:', error),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    let status: PermissionStatus | undefined;

    navigator.permissions?.query({ name: 'geolocation' }).then((s) => {
      if (cancelled) return;
      status = s;
      if (s.state === 'granted') startWatch();
      s.onchange = () => { if (s.state === 'granted') startWatch(); };
    }).catch(() => {
      // Permissions API unsupported for this query (notably iOS Safari) —
      // requestLocation() from a real user gesture is the only path there.
    });

    return () => {
      cancelled = true;
      if (status) status.onchange = null;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [startWatch]);

  useEffect(() => {
    if (typeof DeviceOrientationEvent === 'undefined') return undefined;

    const onOrientation = (event: DeviceOrientationEvent) => {
      const heading = extractHeading(event);
      if (heading === null) return;
      headingRef.current = heading;
      setFix((current) => (current ? { ...current, headingDeg: heading } : current));
    };

    // Chrome/Android and most non-iOS browsers: fires with no permission
    // gate at all. iOS Safari never fires this one (no `absolute` support)
    // but does fire plain deviceorientation with webkitCompassHeading —
    // gated behind requestOrientationPermission(), called from a real
    // gesture (see MapCanvas's first-map-tap handler).
    window.addEventListener('deviceorientationabsolute', onOrientation as EventListener);
    window.addEventListener('deviceorientation', onOrientation as EventListener);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrientation as EventListener);
      window.removeEventListener('deviceorientation', onOrientation as EventListener);
    };
  }, []);

  const items = useMemo<MyLocationItem[]>(() => (fix ? [fix] : EMPTY_ITEMS), [fix]);

  return { items, requestLocation: startWatch };
}

/** iOS 13+ gates deviceorientation behind an explicit user gesture — a
 * no-op everywhere else (every non-Safari browser fires
 * deviceorientation/deviceorientationabsolute unconditionally, no
 * permission concept at all). Call from inside a real click/tap handler,
 * never on mount — see MapCanvas's first-map-tap listener. */
export function requestOrientationPermission(): void {
  // Routed through `window` rather than the bare `DeviceOrientationEvent`
  // identifier — a browser that never declares that global at all (plenty
  // of desktop browsers don't) throws a ReferenceError on the bare name
  // outside a `typeof` check; property access on `window` just reads
  // undefined instead.
  const ctor = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> } }).DeviceOrientationEvent;
  if (typeof ctor?.requestPermission === 'function') {
    ctor.requestPermission().catch(() => {
      // Denied, or the call itself unsupported here — heading just stays
      // unavailable, same as any browser that never had it.
    });
  }
}
