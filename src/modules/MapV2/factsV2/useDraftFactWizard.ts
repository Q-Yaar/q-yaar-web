import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import { AskedQuestionDto, FactDto, POINT_SOURCE, ResolvedLatLon } from './factTypes';
import { buildDraftQuestion, describeResolvedPoint, formatDistance, WIZARD_KIND, WizardKind } from './buildDraftQuestion';
import { resolveCurrentLocation } from '../utils/geolocation';
import { PolygonOverlayItemData } from './geometryAssets';
import { draftQuestionToFact } from './mockData';
import { foldFactsAreaInWorker } from './geoWorkerClient';
import { GROUP_ID } from '../layers/groupIds';
import { useMapLayerModule } from '../layers/hooks';
import { FactItem, FactsLayerModule } from '../layers/modules/FactsLayerModule';
import { PointDistanceItem } from '../layers/modules/PointsDistanceModule';
import { WizardPointItem, WizardPointsModule } from '../layers/modules/WizardPointsModule';
import { WizardShapeItem, WizardShapePreviewModule } from '../layers/modules/WizardShapePreviewModule';
import { WIZARD_PREVIEW_MODULE_ID } from './factsLayerIds';
import { CreateDraftFactWizardProps, WIZARD_STEP, WizardStep } from '../components/CreateDraftFactWizard';

const toMapPoint = (coordinates: [number, number]): ResolvedLatLon => ({
  lon: String(coordinates[0]),
  lat: String(coordinates[1]),
  source: POINT_SOURCE.MAP_POINT,
  picked_at: new Date().toISOString(),
});

const toCoordinates = (p: ResolvedLatLon): [number, number] => [Number(p.lon), Number(p.lat)];

export interface UseDraftFactWizardOptions {
  zoneOptions: PolygonOverlayItemData[];
  zoneOptionsLoading: boolean;
  /** Same starting area a real draft would fold on top of once added (see
   * useFactsLayers's draftsUniverse) — the live review-step preview folds
   * from here too, so it shows the same shape the draft will actually have. */
  previewUniverse: () => Feature<Polygon | MultiPolygon>;
  /** The raw game zone, unreduced by any fact — what the details step's
   * shape preview is bounded to instead of previewUniverse, since at that
   * point the question isn't asking "what stays possible," just "what does
   * this shape look like." */
  playArea: Feature<Polygon | MultiPolygon>;
  /** Owned by MapCanvas (not created here) so useMapInteractions can be
   * wired up — and its Measurement module registered/mounted — *before*
   * this hook runs, without a circular data dependency between the two.
   * MapLibre draws later-mounted layers on top, and the wizard's own
   * preview/points should always be the topmost thing on the map, never
   * obscured by the measurement tool's crosshair/rings/points. */
  pickResolverRef: React.RefObject<((coordinates: [number, number]) => void) | null>;
  onSubmit: (question: AskedQuestionDto) => void;
}

export interface UseDraftFactWizardResult {
  /** Spread directly onto <CreateDraftFactWizard>. */
  props: CreateDraftFactWizardProps;
  /** Opens the wizard, optionally seeded from the Points & Distance tool's
   * currently-placed points — one point becomes the circle's center, two
   * become hotter/colder's point A and B, so measuring first and asking
   * about the same spot doesn't mean picking it all over again. */
  openWizard: (measurementPoints?: PointDistanceItem[]) => void;
  /** For the pick-prompt banner: the prompt text (null when no pick is
   * pending) and its cancel button. */
  pickPrompt: string | null;
  cancelPick: () => void;
}

/**
 * The whole "Ask a question" wizard as one hook: every piece of its form
 * state, the map-pick handshake (hide the wizard, wait for a click, refill
 * the field, reopen), a live on-map preview of the shape while reviewing it,
 * and the final AskedQuestionDto it hands to onSubmit. MapCanvas only needs
 * to render <CreateDraftFactWizard {...wizard.props}> and wire the
 * pick-prompt banner — pickResolverRef itself is MapCanvas's (see that
 * option's doc) and already shared with useMapInteractions.
 */
export function useDraftFactWizard({ zoneOptions, zoneOptionsLoading, previewUniverse, playArea, pickResolverRef, onSubmit }: UseDraftFactWizardOptions): UseDraftFactWizardResult {
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
  // What the review step assumes the hider will answer — true (the default)
  // assumes the asserted pole holds, false previews the opposite instead.
  const [assumedValue, setAssumedValue] = useState(true);

  // A map-pick in progress: the prompt shown in the banner. pickResolverRef
  // itself is passed in (see UseDraftFactWizardOptions) — the next map
  // click feeds into it.
  const [pickPrompt, setPickPrompt] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setStep(WIZARD_STEP.KIND);
    setKind(null);
    setCircleCenter(null);
    setCircleRadius(null);
    setZoneKey(null);
    setPointA(null);
    setPointB(null);
    setLocationError(null);
    setAssumedValue(true);
  }, []);

  const openWizard = useCallback((measurementPoints: PointDistanceItem[] = []) => {
    resetForm();
    if (measurementPoints.length === 1) {
      setCircleCenter(toMapPoint(measurementPoints[0].coordinates));
    } else if (measurementPoints.length === 2) {
      setPointA(toMapPoint(measurementPoints[0].coordinates));
      setPointB(toMapPoint(measurementPoints[1].coordinates));
    }
    setIsOpen(true);
  }, [resetForm]);

  const closeWizard = useCallback(() => {
    setIsOpen(false);
    setPickPrompt(null);
    pickResolverRef.current = null;
    resetForm();
  }, [resetForm, pickResolverRef]);

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
  }, [pickResolverRef]);

  const cancelPick = useCallback(() => {
    setPickPrompt(null);
    pickResolverRef.current = null;
    setIsOpen(true);
  }, [pickResolverRef]);

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
      const zone = zoneOptions.find((z) => z.id === zoneKey);
      return `Are you inside ${zone?.displayName ?? zoneKey}?`;
    }
    if (kind === WIZARD_KIND.HOTTER_COLDER && pointA && pointB) {
      return `Compared to ${describeResolvedPoint(pointA)}, are you now closer to ${describeResolvedPoint(pointB)}?`;
    }
    return null;
  }, [kind, circleCenter, circleRadius, zoneKey, pointA, pointB, zoneOptions]);

  const handleSubmit = useCallback(() => {
    if (!kind) return;
    let question: AskedQuestionDto | null = null;
    if (kind === WIZARD_KIND.CIRCLE && circleCenter && circleRadius) {
      question = buildDraftQuestion({ kind: WIZARD_KIND.CIRCLE, center: circleCenter, radius: circleRadius, assumedValue });
    } else if (kind === WIZARD_KIND.ZONE && zoneKey) {
      const zone = zoneOptions.find((z) => z.id === zoneKey);
      question = buildDraftQuestion({ kind: WIZARD_KIND.ZONE, zoneKey, zoneLabel: zone?.displayName ?? zoneKey, assumedValue });
    } else if (kind === WIZARD_KIND.HOTTER_COLDER && pointA && pointB) {
      question = buildDraftQuestion({ kind: WIZARD_KIND.HOTTER_COLDER, pointA, pointB, assumedValue });
    }
    if (!question) return;
    onSubmit(question);
    closeWizard();
  }, [kind, circleCenter, circleRadius, zoneKey, pointA, pointB, zoneOptions, assumedValue, onSubmit, closeWizard]);

  // Live "what would this look like" preview — only while reviewing, so the
  // shape the user is about to commit to shows on the map before they add
  // it, reacting instantly to the Yes/No toggle. Rebuilt (not reused) from
  // handleSubmit's own inputs rather than sharing one FactDto, since the
  // preview needs to recompute on every field change while composing, not
  // just once at submit time.
  const previewFact = useMemo<FactDto | null>(() => {
    if (step !== WIZARD_STEP.REVIEW || !kind) return null;
    let question: AskedQuestionDto | null = null;
    if (kind === WIZARD_KIND.CIRCLE && circleCenter && circleRadius) {
      question = buildDraftQuestion({ kind: WIZARD_KIND.CIRCLE, center: circleCenter, radius: circleRadius, assumedValue });
    } else if (kind === WIZARD_KIND.ZONE && zoneKey) {
      const zone = zoneOptions.find((z) => z.id === zoneKey);
      question = buildDraftQuestion({ kind: WIZARD_KIND.ZONE, zoneKey, zoneLabel: zone?.displayName ?? zoneKey, assumedValue });
    } else if (kind === WIZARD_KIND.HOTTER_COLDER && pointA && pointB) {
      question = buildDraftQuestion({ kind: WIZARD_KIND.HOTTER_COLDER, pointA, pointB, assumedValue });
    }
    return question ? draftQuestionToFact(question) : null;
  }, [step, kind, circleCenter, circleRadius, zoneKey, zoneOptions, pointA, pointB, assumedValue]);

  const [previewModule] = useState(() => new FactsLayerModule(
    { id: WIZARD_PREVIEW_MODULE_ID, groupId: GROUP_ID.FACTS, label: 'Question preview', fillColor: '#FFC043', fillOpacity: 0.3, dashed: true },
    previewUniverse,
  ));
  const previewItems = useMemo<FactItem[]>(
    () => (previewFact ? [{ id: previewFact.fact_id, fact: previewFact }] : []),
    [previewFact],
  );
  useMapLayerModule(previewModule, previewItems);

  // Details-step shape preview — the raw region a fact would describe
  // (assuming its asserted pole holds; there's no yes/no toggle yet at this
  // step), bounded only by the play area, not by other facts. Shows the
  // instant enough fields exist to compute it (canContinue), e.g. a full
  // circle the moment a radius chip is tapped, or a zone's own boundary
  // the moment it's picked — distinct from the review step's amber
  // possible-area preview above, which folds against previewUniverse
  // instead. Built the same way previewFact is, just gated on DETAILS
  // instead of REVIEW and always assuming true (no toggle to read yet).
  const detailsShapeFact = useMemo<FactDto | null>(() => {
    if (step !== WIZARD_STEP.DETAILS || !canContinue) return null;
    let question: AskedQuestionDto | null = null;
    if (kind === WIZARD_KIND.CIRCLE && circleCenter && circleRadius) {
      question = buildDraftQuestion({ kind: WIZARD_KIND.CIRCLE, center: circleCenter, radius: circleRadius, assumedValue: true });
    } else if (kind === WIZARD_KIND.ZONE && zoneKey) {
      const zone = zoneOptions.find((z) => z.id === zoneKey);
      question = buildDraftQuestion({ kind: WIZARD_KIND.ZONE, zoneKey, zoneLabel: zone?.displayName ?? zoneKey, assumedValue: true });
    } else if (kind === WIZARD_KIND.HOTTER_COLDER && pointA && pointB) {
      question = buildDraftQuestion({ kind: WIZARD_KIND.HOTTER_COLDER, pointA, pointB, assumedValue: true });
    }
    return question ? draftQuestionToFact(question) : null;
  }, [step, canContinue, kind, circleCenter, circleRadius, zoneKey, zoneOptions, pointA, pointB]);

  const [shapeModule] = useState(() => new WizardShapePreviewModule());
  const [detailsShapeArea, setDetailsShapeArea] = useState<Feature<Polygon | MultiPolygon> | null>(null);
  const shapeGenerationRef = useRef(0);
  useEffect(() => {
    if (!detailsShapeFact) {
      setDetailsShapeArea(null);
      return;
    }
    const generation = ++shapeGenerationRef.current;
    foldFactsAreaInWorker(playArea, [detailsShapeFact])
      .then((area) => {
        if (generation !== shapeGenerationRef.current) return;
        setDetailsShapeArea(area);
      })
      .catch((err) => {
        console.warn('[MapV2] Failed to compute wizard shape preview', err);
      });
  }, [detailsShapeFact, playArea]);
  const shapeItems = useMemo<WizardShapeItem[]>(
    () => (detailsShapeArea ? [{ id: 'shape', geometry: detailsShapeArea.geometry }] : []),
    [detailsShapeArea],
  );
  useMapLayerModule(shapeModule, shapeItems);

  // Marks whichever point(s) the current kind actually uses, live as soon
  // as each is picked (not only once the shaded preview exists on review) —
  // "where is the center/point I just tapped" is useful feedback while
  // still composing, not just at the end.
  const [pointsModule] = useState(() => new WizardPointsModule());
  const wizardPointItems = useMemo<WizardPointItem[]>(() => {
    if (kind === WIZARD_KIND.CIRCLE && circleCenter) {
      return [{ id: 'center', coordinates: toCoordinates(circleCenter), label: 'Center' }];
    }
    if (kind === WIZARD_KIND.HOTTER_COLDER) {
      const items: WizardPointItem[] = [];
      if (pointA) items.push({ id: 'point-a', coordinates: toCoordinates(pointA), label: 'A' });
      if (pointB) items.push({ id: 'point-b', coordinates: toCoordinates(pointB), label: 'B' });
      return items;
    }
    return [];
  }, [kind, circleCenter, pointA, pointB]);
  useMapLayerModule(pointsModule, wizardPointItems);

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
    zoneOptions,
    zoneOptionsLoading,
    zoneKey,
    onSelectZone: setZoneKey,
    pointA,
    pointB,
    onPickPointAOnMap: () => pickOnMap('Tap the map for Point A', setPointA),
    onUseMyLocationForPointA: () => locateMeFor(setPointA),
    onPickPointBOnMap: () => pickOnMap('Tap the map for Point B', setPointB),
    onUseMyLocationForPointB: () => locateMeFor(setPointB),
    renderedQuestionPreview,
    assumedValue,
    onSetAssumedValue: setAssumedValue,
    canContinue,
    onContinue: () => setStep(WIZARD_STEP.REVIEW),
    onSubmit: handleSubmit,
  };

  return { props, openWizard, pickPrompt, cancelPick };
}
