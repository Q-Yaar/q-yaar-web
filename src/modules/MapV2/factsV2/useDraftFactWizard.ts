import { useCallback, useMemo, useRef, useState } from 'react';
import { AskedQuestionDto, POINT_SOURCE, ResolvedLatLon } from './factTypes';
import { buildDraftQuestion, describeResolvedPoint, formatDistance, WIZARD_KIND, WizardKind } from './buildDraftQuestion';
import { resolveCurrentLocation } from '../utils/geolocation';
import { GeometryRegistriesResult } from './registries';
import { CreateDraftFactWizardProps, WIZARD_STEP, WizardStep } from '../components/CreateDraftFactWizard';

const toMapPoint = (coordinates: [number, number]): ResolvedLatLon => ({
  lon: String(coordinates[0]),
  lat: String(coordinates[1]),
  source: POINT_SOURCE.MAP_POINT,
  picked_at: new Date().toISOString(),
});

export interface UseDraftFactWizardOptions {
  geometry: GeometryRegistriesResult;
  onSubmit: (question: AskedQuestionDto) => void;
}

export interface UseDraftFactWizardResult {
  /** Spread directly onto <CreateDraftFactWizard>. */
  props: CreateDraftFactWizardProps;
  openWizard: () => void;
  /** For the pick-prompt banner: the prompt text (null when no pick is
   * pending) and its cancel button. */
  pickPrompt: string | null;
  cancelPick: () => void;
  /** For the map's click handler: resolve the pending pick, if any. */
  pickResolverRef: React.RefObject<((coordinates: [number, number]) => void) | null>;
  /** For the map's hover-preview effect: a pick is in progress. */
  isPicking: boolean;
}

/**
 * The whole "Ask a question" wizard as one hook: every piece of its form
 * state, the map-pick handshake (hide the wizard, wait for a click, refill
 * the field, reopen), and the final AskedQuestionDto it hands to onSubmit.
 * MapCanvas only needs to render <CreateDraftFactWizard {...wizard.props}>,
 * wire the pick-prompt banner, and let its click handler check
 * pickResolverRef.
 */
export function useDraftFactWizard({ geometry, onSubmit }: UseDraftFactWizardOptions): UseDraftFactWizardResult {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(WIZARD_STEP.KIND);
  const [kind, setKind] = useState<WizardKind | null>(null);
  const [circleCenter, setCircleCenter] = useState<ResolvedLatLon | null>(null);
  const [circleRadius, setCircleRadius] = useState<number | null>(null);
  const [zoneKey, setZoneKey] = useState<string | null>(null);
  const [pointA, setPointA] = useState<ResolvedLatLon | null>(null);
  const [pointB, setPointB] = useState<ResolvedLatLon | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // A map-pick in progress: the prompt shown in the banner, and the
  // resolver the next map click feeds into.
  const [pickPrompt, setPickPrompt] = useState<string | null>(null);
  const pickResolverRef = useRef<((coordinates: [number, number]) => void) | null>(null);

  const resetForm = useCallback(() => {
    setStep(WIZARD_STEP.KIND);
    setKind(null);
    setCircleCenter(null);
    setCircleRadius(null);
    setZoneKey(null);
    setPointA(null);
    setPointB(null);
    setLocationError(null);
  }, []);

  const openWizard = useCallback(() => {
    resetForm();
    setIsOpen(true);
  }, [resetForm]);

  const closeWizard = useCallback(() => {
    setIsOpen(false);
    setPickPrompt(null);
    pickResolverRef.current = null;
    resetForm();
  }, [resetForm]);

  /** Hides the wizard, arms the next map click to resolve `onResolved`, and
   * reopens the wizard once it fires. Cancelling (via the banner) just
   * reopens the wizard with nothing changed. */
  const pickOnMap = useCallback((prompt: string, onResolved: (p: ResolvedLatLon) => void) => {
    setIsOpen(false);
    setPickPrompt(prompt);
    pickResolverRef.current = (coordinates) => {
      setPickPrompt(null);
      pickResolverRef.current = null;
      onResolved(toMapPoint(coordinates));
      setIsOpen(true);
    };
  }, []);

  const cancelPick = useCallback(() => {
    setPickPrompt(null);
    pickResolverRef.current = null;
    setIsOpen(true);
  }, []);

  const locateMeFor = useCallback((onResolved: (p: ResolvedLatLon) => void) => {
    setLocating(true);
    setLocationError(null);
    resolveCurrentLocation()
      .then(onResolved)
      .catch((err: Error) => setLocationError(err.message || 'Could not get your location.'))
      .finally(() => setLocating(false));
  }, []);

  const canContinue = kind === WIZARD_KIND.CIRCLE
    ? !!circleCenter && !!circleRadius
    : kind === WIZARD_KIND.ZONE
      ? !!zoneKey
      : kind === WIZARD_KIND.HOTTER_COLDER
        ? !!pointA && !!pointB
        : false;

  const renderedQuestionPreview = useMemo(() => {
    if (kind === WIZARD_KIND.CIRCLE && circleCenter && circleRadius) {
      return `Are you within ${formatDistance(circleRadius)} of ${describeResolvedPoint(circleCenter)}?`;
    }
    if (kind === WIZARD_KIND.ZONE && zoneKey) {
      const zone = geometry.polygonItems.find((z) => z.id === zoneKey);
      return `Are you inside ${zone?.displayName ?? zoneKey}?`;
    }
    if (kind === WIZARD_KIND.HOTTER_COLDER && pointA && pointB) {
      return `Compared to ${describeResolvedPoint(pointA)}, are you now closer to ${describeResolvedPoint(pointB)}?`;
    }
    return null;
  }, [kind, circleCenter, circleRadius, zoneKey, pointA, pointB, geometry.polygonItems]);

  const handleSubmit = useCallback(() => {
    if (!kind) return;
    let question: AskedQuestionDto | null = null;
    if (kind === WIZARD_KIND.CIRCLE && circleCenter && circleRadius) {
      question = buildDraftQuestion({ kind: WIZARD_KIND.CIRCLE, center: circleCenter, radius: circleRadius });
    } else if (kind === WIZARD_KIND.ZONE && zoneKey) {
      const zone = geometry.polygonItems.find((z) => z.id === zoneKey);
      question = buildDraftQuestion({ kind: WIZARD_KIND.ZONE, zoneKey, zoneLabel: zone?.displayName ?? zoneKey });
    } else if (kind === WIZARD_KIND.HOTTER_COLDER && pointA && pointB) {
      question = buildDraftQuestion({ kind: WIZARD_KIND.HOTTER_COLDER, pointA, pointB });
    }
    if (!question) return;
    onSubmit(question);
    closeWizard();
  }, [kind, circleCenter, circleRadius, zoneKey, pointA, pointB, geometry.polygonItems, onSubmit, closeWizard]);

  const props: CreateDraftFactWizardProps = {
    isOpen,
    onClose: closeWizard,
    step,
    kind,
    onSelectKind: (k) => { setKind(k); setStep(WIZARD_STEP.DETAILS); },
    onBack: () => setStep(step === WIZARD_STEP.REVIEW ? WIZARD_STEP.DETAILS : WIZARD_STEP.KIND),
    locating,
    locationError,
    circleCenter,
    circleRadius,
    onPickCircleCenterOnMap: () => pickOnMap('Tap the map to set the circle’s center', setCircleCenter),
    onUseMyLocationForCircle: () => locateMeFor(setCircleCenter),
    onSetCircleRadius: setCircleRadius,
    zoneOptions: geometry.polygonItems,
    zoneOptionsLoading: geometry.loading,
    zoneKey,
    onSelectZone: setZoneKey,
    pointA,
    pointB,
    onPickPointAOnMap: () => pickOnMap('Tap the map for Point A', setPointA),
    onUseMyLocationForPointA: () => locateMeFor(setPointA),
    onPickPointBOnMap: () => pickOnMap('Tap the map for Point B', setPointB),
    onUseMyLocationForPointB: () => locateMeFor(setPointB),
    renderedQuestionPreview,
    canContinue,
    onContinue: () => setStep(WIZARD_STEP.REVIEW),
    onSubmit: handleSubmit,
  };

  return { props, openWizard, pickPrompt, cancelPick, pickResolverRef, isPicking: pickPrompt !== null };
}
