import { useCallback, useMemo, useState } from 'react';
import { resolveCurrentLocation } from '../utils/geolocation';
import { useHidingZone } from './useHidingZone';
import { HidingZoneItem } from '../layers/modules/HidingZoneModule';
import { HidingZoneSheetProps } from '../components/HidingZoneSheet';
import { useLayerTree } from '../layers/hooks';
import { GROUP_ID } from '../layers/groupIds';

const DEFAULT_RADIUS_M = 250;

interface DraftPoint {
  lat: number;
  lon: number;
  /** Distinguishes a GPS fix (shown as "Your location") from a map tap
   * (shown as raw coordinates) — same distinction describeResolvedPoint
   * draws for the ask-question wizard's own point fields. */
  fromDevice: boolean;
}

export interface UseHidingZoneFlowOptions {
  gameId: string | undefined;
  /** Shared with useMapInteractions/useDraftFactWizard — only one flow is
   * ever actually awaiting a pick at a time (this one's only reachable
   * from Hiding mode, the wizard's only from Seeking), so reusing the same
   * ref needs no extra coordination. */
  pickResolverRef: React.RefObject<((coordinates: [number, number]) => void) | null>;
}

export interface UseHidingZoneFlowResult {
  /** Spread directly onto <HidingZoneSheet>. */
  props: HidingZoneSheetProps;
  openSheet: () => void;
  hasSavedZone: boolean;
  /** For the pick-prompt banner: the prompt text (null when no pick is
   * pending) and its cancel button. */
  pickPrompt: string | null;
  cancelPick: () => void;
  /** Feed straight into HidingZoneModule via useMapLayerModule. */
  items: HidingZoneItem[];
}

/**
 * The Hider's "My hiding zone" flow as one hook: a point + radius saved
 * only to this device (useHidingZone.ts), the same map-pick handshake
 * pattern the ask-question wizard uses (hide the sheet, wait for a click,
 * refill the field, reopen), and the resulting HidingZoneModule item.
 */
export function useHidingZoneFlow({ gameId, pickResolverRef }: UseHidingZoneFlowOptions): UseHidingZoneFlowResult {
  const { zone, saveZone, clearZone } = useHidingZone(gameId);
  const { tree, setGroupVisible } = useLayerTree();
  const isVisible = tree.groups.find((g) => g.id === GROUP_ID.HIDING_ZONE)?.visible ?? true;
  const onToggleVisible = useCallback(() => setGroupVisible(GROUP_ID.HIDING_ZONE, !isVisible), [setGroupVisible, isVisible]);

  const [isOpen, setIsOpen] = useState(false);
  const [pickPrompt, setPickPrompt] = useState<string | null>(null);
  const [draftPoint, setDraftPoint] = useState<DraftPoint | null>(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_M);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const openSheet = useCallback(() => {
    setDraftPoint(zone ? { ...zone.point, fromDevice: false } : null);
    setRadius(zone?.radius ?? DEFAULT_RADIUS_M);
    setLocationError(null);
    setIsOpen(true);
  }, [zone]);

  const closeSheet = useCallback(() => {
    setIsOpen(false);
    setPickPrompt(null);
    pickResolverRef.current = null;
  }, [pickResolverRef]);

  const onUseMyLocation = useCallback(() => {
    setLocating(true);
    setLocationError(null);
    resolveCurrentLocation()
      .then((p) => setDraftPoint({ lat: parseFloat(p.lat), lon: parseFloat(p.lon), fromDevice: true }))
      .catch((err: Error) => setLocationError(err.message || 'Could not get your location.'))
      .finally(() => setLocating(false));
  }, []);

  const onPickOnMap = useCallback(() => {
    setIsOpen(false);
    setPickPrompt('Tap the map for your hiding zone');
    pickResolverRef.current = (coordinates) => {
      setPickPrompt(null);
      pickResolverRef.current = null;
      setDraftPoint({ lon: coordinates[0], lat: coordinates[1], fromDevice: false });
      setIsOpen(true);
    };
  }, [pickResolverRef]);

  const cancelPick = useCallback(() => {
    setPickPrompt(null);
    pickResolverRef.current = null;
    setIsOpen(true);
  }, [pickResolverRef]);

  const onSave = useCallback(() => {
    if (!draftPoint) return;
    saveZone({ point: { lat: draftPoint.lat, lon: draftPoint.lon }, radius });
    closeSheet();
  }, [draftPoint, radius, saveZone, closeSheet]);

  const onClear = useCallback(() => {
    clearZone();
    closeSheet();
  }, [clearZone, closeSheet]);

  const pointLabel = draftPoint
    ? (draftPoint.fromDevice ? 'Your location' : `${draftPoint.lat.toFixed(5)}, ${draftPoint.lon.toFixed(5)}`)
    : null;

  const props: HidingZoneSheetProps = {
    isOpen,
    onClose: closeSheet,
    hasPoint: draftPoint !== null,
    pointLabel,
    locating,
    locationError,
    onUseMyLocation,
    onPickOnMap,
    radius,
    onSetRadius: setRadius,
    hasSavedZone: zone !== null,
    onSave,
    onClear,
    isVisible,
    onToggleVisible,
  };

  // While composing (sheet open with a point chosen), preview the *draft*
  // point/radius live — updates instantly as the point or radius chip
  // changes, same "see it before you commit" reasoning as the ask-question
  // wizard's own live preview. Falls back to whatever's actually saved once
  // the sheet is closed (including right after Save, since saveZone updates
  // `zone` before closeSheet runs).
  const items = useMemo<HidingZoneItem[]>(() => {
    if (isOpen && draftPoint) {
      return [{ id: 'hiding-zone', point: [draftPoint.lon, draftPoint.lat], radius }];
    }
    if (zone) {
      return [{ id: 'hiding-zone', point: [zone.point.lon, zone.point.lat], radius: zone.radius }];
    }
    return [];
  }, [isOpen, draftPoint, radius, zone]);

  return { props, openSheet, hasSavedZone: zone !== null, pickPrompt, cancelPick, items };
}
