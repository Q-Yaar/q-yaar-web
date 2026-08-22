import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { MapLayerRegistry } from './layers/MapLayerRegistry';
import { MapLayerRegistryProvider, useMapLayerModule } from './layers/hooks';
import { useMapInstance } from './hooks/useMapInstance';
import { useGeometryRegistries } from './factsV2/registries';
import { MOCK_DRAFT_QUESTIONS, MOCK_FACTS, draftQuestionToFact } from './factsV2/mockData';
import { AskedQuestionDto, FactDto, POINT_SOURCE, ResolvedLatLon } from './factsV2/factTypes';
import { buildDraftQuestion, describeResolvedPoint, formatDistance, WIZARD_KIND } from './factsV2/buildDraftQuestion';
import { resolveCurrentLocation } from './utils/geolocation';
import { PointDistanceItem, PointsDistanceModule } from './layers/modules/PointsDistanceModule';
import { PolygonOverlayModule } from './layers/modules/PolygonOverlayModule';
import { MetroLinesModule } from './layers/modules/MetroLinesModule';
import { PointPreviewModule } from './layers/modules/PointPreviewModule';
import { FactItem, FactsLayerModule } from './layers/modules/FactsLayerModule';
import { GROUP_ID } from './layers/groupIds';
import { LayerControlPanel } from './components/LayerControlPanel';
import { FactPopup } from './components/FactPopup';
import { CreateDraftFactWizard, WIZARD_STEP, WizardKind, WizardStep } from './components/CreateDraftFactWizard';
import { DraftQuestionsList } from './components/DraftQuestionsList';
import { uberDark } from './theme';

const FACTS_MODULE_ID = 'facts';
const DRAFT_FACTS_MODULE_ID = 'draft-facts';
const FACTS_FILL_LAYER = `${FACTS_MODULE_ID}-fill`;
const DRAFT_FACTS_FILL_LAYER = `${DRAFT_FACTS_MODULE_ID}-fill`;
const FACT_HIT_LAYERS = [FACTS_FILL_LAYER, DRAFT_FACTS_FILL_LAYER];

interface SelectedFact {
  fact: FactDto;
  isDraft: boolean;
}

const toMapPoint = (coordinates: [number, number]): ResolvedLatLon => ({
  lon: String(coordinates[0]),
  lat: String(coordinates[1]),
  source: POINT_SOURCE.MAP_POINT,
  picked_at: new Date().toISOString(),
});

/**
 * Orchestrator only — wires the four hooks/pieces (map lifecycle, geometry
 * registries, the layer modules, and interaction) into one canvas. Each
 * capability is one useMapLayerModule call; nothing here reaches into a
 * module's internals beyond setItems (via that hook) and, for the two
 * imperative cases, preview()/clear()/getFact().
 *
 * The draft-fact wizard's form state also lives here (not inside the wizard
 * component) so the wizard modal can be hidden mid-flow — while the user
 * taps the map to place a point — without losing anything already filled in.
 */
const MapCanvasInner: React.FC<{ registry: MapLayerRegistry }> = ({ registry }) => {
  useEffect(() => {
    registry.registerGroup(GROUP_ID.MEASUREMENT, 'Measurement');
    registry.registerGroup(GROUP_ID.OVERLAYS, 'Overlays', false);
    registry.registerGroup(GROUP_ID.FACTS, 'Facts');
    registry.registerGroup(GROUP_ID.PREVIEW, 'Preview');
  }, [registry]);

  const { containerRef, mapRef, isMapReady } = useMapInstance({ registry });
  const geometry = useGeometryRegistries();

  const playAreaRef = useRef(geometry.playArea);
  playAreaRef.current = geometry.playArea;
  const universe = useMemo(() => () => playAreaRef.current, []);

  // Stable module instances — created once, kept for the canvas's lifetime.
  const [pointsModule] = useState(() => new PointsDistanceModule());
  const [polygonModule] = useState(() => new PolygonOverlayModule());
  const [metroModule] = useState(() => new MetroLinesModule());
  const [previewModule] = useState(() => new PointPreviewModule());
  const [factsModule] = useState(() => new FactsLayerModule(
    { id: FACTS_MODULE_ID, groupId: GROUP_ID.FACTS, label: 'Facts', fillColor: '#d32f2f', fillOpacity: 0.35 },
    geometry.registries,
    universe,
  ));
  const [draftFactsModule] = useState(() => new FactsLayerModule(
    { id: DRAFT_FACTS_MODULE_ID, groupId: GROUP_ID.FACTS, label: 'Draft Facts', fillColor: '#9c27b0', fillOpacity: 0.28, dashed: true },
    geometry.registries,
    universe,
  ));

  const [points, setPoints] = useState<PointDistanceItem[]>([]);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [selectedFact, setSelectedFact] = useState<SelectedFact | null>(null);

  // Draft questions created via the wizard, seeded with the mock pending
  // questions — backend can't persist these yet, so they live in component
  // state for the session.
  const [draftQuestions, setDraftQuestions] = useState<AskedQuestionDto[]>(MOCK_DRAFT_QUESTIONS);
  const addDraftQuestion = useCallback((q: AskedQuestionDto) => setDraftQuestions((prev) => [...prev, q]), []);
  const removeDraftQuestion = useCallback(
    (questionId: string) => setDraftQuestions((prev) => prev.filter((q) => q.question_id !== questionId)),
    [],
  );

  const factItems = useMemo<FactItem[]>(
    () => MOCK_FACTS.map((fact) => ({ id: fact.fact_id, fact })),
    [],
  );
  const draftFactItems = useMemo<FactItem[]>(
    () => draftQuestions.map((q) => {
      const fact = draftQuestionToFact(q);
      return { id: fact.fact_id, fact };
    }),
    [draftQuestions],
  );

  useMapLayerModule(pointsModule, points);
  useMapLayerModule(polygonModule, geometry.loading ? [] : geometry.polygonItems);
  useMapLayerModule(metroModule, geometry.loading ? [] : geometry.lineItems);
  useMapLayerModule(previewModule, []);
  useMapLayerModule(factsModule, geometry.loading ? [] : factItems);
  useMapLayerModule(draftFactsModule, geometry.loading ? [] : draftFactItems);

  // --- Draft-fact wizard state -------------------------------------------
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(WIZARD_STEP.KIND);
  const [wizardKind, setWizardKind] = useState<WizardKind | null>(null);
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

  const resetWizard = useCallback(() => {
    setWizardStep(WIZARD_STEP.KIND);
    setWizardKind(null);
    setCircleCenter(null);
    setCircleRadius(null);
    setZoneKey(null);
    setPointA(null);
    setPointB(null);
    setLocationError(null);
  }, []);

  const openWizard = useCallback(() => {
    resetWizard();
    setWizardOpen(true);
  }, [resetWizard]);

  const closeWizard = useCallback(() => {
    setWizardOpen(false);
    setPickPrompt(null);
    pickResolverRef.current = null;
    resetWizard();
  }, [resetWizard]);

  /** Hides the wizard, arms the next map click to resolve `onResolved`, and
   * reopens the wizard once it fires. Cancelling (via the banner) just
   * reopens the wizard with nothing changed. */
  const pickOnMap = useCallback((prompt: string, onResolved: (p: ResolvedLatLon) => void) => {
    setWizardOpen(false);
    setPickPrompt(prompt);
    pickResolverRef.current = (coordinates) => {
      setPickPrompt(null);
      pickResolverRef.current = null;
      onResolved(toMapPoint(coordinates));
      setWizardOpen(true);
    };
  }, []);

  const cancelPick = useCallback(() => {
    setPickPrompt(null);
    pickResolverRef.current = null;
    previewModule.clear();
    setWizardOpen(true);
  }, [previewModule]);

  const locateMeFor = useCallback((onResolved: (p: ResolvedLatLon) => void) => {
    setLocating(true);
    setLocationError(null);
    resolveCurrentLocation()
      .then(onResolved)
      .catch((err: Error) => setLocationError(err.message || 'Could not get your location.'))
      .finally(() => setLocating(false));
  }, []);

  const canContinue = wizardKind === WIZARD_KIND.CIRCLE
    ? !!circleCenter && !!circleRadius
    : wizardKind === WIZARD_KIND.ZONE
      ? !!zoneKey
      : wizardKind === WIZARD_KIND.HOTTER_COLDER
        ? !!pointA && !!pointB
        : false;

  const renderedQuestionPreview = useMemo(() => {
    if (wizardKind === WIZARD_KIND.CIRCLE && circleCenter && circleRadius) {
      return `Are you within ${formatDistance(circleRadius)} of ${describeResolvedPoint(circleCenter)}?`;
    }
    if (wizardKind === WIZARD_KIND.ZONE && zoneKey) {
      const zone = geometry.polygonItems.find((z) => z.id === zoneKey);
      return `Are you inside ${zone?.displayName ?? zoneKey}?`;
    }
    if (wizardKind === WIZARD_KIND.HOTTER_COLDER && pointA && pointB) {
      return `Compared to ${describeResolvedPoint(pointA)}, are you now closer to ${describeResolvedPoint(pointB)}?`;
    }
    return null;
  }, [wizardKind, circleCenter, circleRadius, zoneKey, pointA, pointB, geometry.polygonItems]);

  const handleSubmitWizard = useCallback(() => {
    if (!wizardKind) return;
    let question: AskedQuestionDto | null = null;
    if (wizardKind === WIZARD_KIND.CIRCLE && circleCenter && circleRadius) {
      question = buildDraftQuestion({ kind: WIZARD_KIND.CIRCLE, center: circleCenter, radius: circleRadius });
    } else if (wizardKind === WIZARD_KIND.ZONE && zoneKey) {
      const zone = geometry.polygonItems.find((z) => z.id === zoneKey);
      question = buildDraftQuestion({ kind: WIZARD_KIND.ZONE, zoneKey, zoneLabel: zone?.displayName ?? zoneKey });
    } else if (wizardKind === WIZARD_KIND.HOTTER_COLDER && pointA && pointB) {
      question = buildDraftQuestion({ kind: WIZARD_KIND.HOTTER_COLDER, pointA, pointB });
    }
    if (!question) return;
    addDraftQuestion(question);
    closeWizard();
  }, [wizardKind, circleCenter, circleRadius, zoneKey, pointA, pointB, geometry.polygonItems, addDraftQuestion, closeWizard]);

  // Click: while a wizard map-pick is pending, resolve it. Otherwise, a hit
  // on a fact polygon opens its FactsV2 popup; anything else places a
  // Points & Distance measurement point (resets after the second).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (pickResolverRef.current) {
        pickResolverRef.current([e.lngLat.lng, e.lngLat.lat]);
        return;
      }

      let factFeatures: maplibregl.MapGeoJSONFeature[] = [];
      try {
        factFeatures = map.queryRenderedFeatures(e.point, { layers: FACT_HIT_LAYERS });
      } catch {
        factFeatures = [];
      }

      if (factFeatures.length > 0) {
        const feature = factFeatures[0];
        const isDraft = feature.layer.id === DRAFT_FACTS_FILL_LAYER;
        const factId = feature.properties?.factId as string | undefined;
        const fact = factId ? (isDraft ? draftFactsModule.getFact(factId) : factsModule.getFact(factId)) : undefined;
        if (fact) {
          setSelectedFact({ fact, isDraft });
          return;
        }
      }

      const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setPoints((prev) => {
        if (prev.length >= 2) return [{ id: 'p1', coordinates }];
        return [...prev, { id: prev.length === 0 ? 'p1' : 'p2', coordinates }];
      });
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [mapRef, isMapReady, factsModule, draftFactsModule]);

  // Hover preview (capability #4) — driven either by the "Preview" toggle
  // below, or by an in-progress wizard map-pick.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || (!previewEnabled && !pickPrompt)) return;

    const handleMove = (e: maplibregl.MapMouseEvent) => previewModule.preview([e.lngLat.lng, e.lngLat.lat]);
    map.on('mousemove', handleMove);
    return () => {
      map.off('mousemove', handleMove);
      previewModule.clear();
    };
  }, [mapRef, isMapReady, previewEnabled, pickPrompt, previewModule]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div style={{ position: 'absolute', top: '68px', left: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <LayerControlPanel />
        <button
          onClick={openWizard}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 16px',
            borderRadius: '24px',
            border: `1px solid ${uberDark.accent}`,
            backgroundColor: uberDark.accent,
            color: uberDark.accentText,
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          + Ask a question
        </button>
        <button
          onClick={() => setPreviewEnabled((v) => !v)}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 16px',
            borderRadius: '24px',
            border: `1px solid ${previewEnabled ? uberDark.success : uberDark.border}`,
            backgroundColor: previewEnabled ? uberDark.success : uberDark.surfaceElevated,
            color: uberDark.textPrimary,
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          {previewEnabled ? 'Preview: on (hover map)' : 'Preview: off'}
        </button>
        <DraftQuestionsList questions={draftQuestions} onRemove={removeDraftQuestion} />
      </div>

      {pickPrompt ? (
        <div
          style={{
            position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 20, backgroundColor: uberDark.surfaceElevated, color: uberDark.textPrimary,
            padding: '8px 10px 8px 16px', border: `1px solid ${uberDark.border}`,
            borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
          }}
        >
          {pickPrompt}
          <button
            onClick={cancelPick}
            style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', color: uberDark.textPrimary,
              borderRadius: '14px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, backgroundColor: 'rgba(20,20,20,0.85)', padding: '6px 14px',
            border: `1px solid ${uberDark.border}`,
            borderRadius: '20px', fontSize: '12px', color: uberDark.textSecondary,
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          Click the map to place measurement points · click a shaded fact to inspect it
        </div>
      )}

      <FactPopup
        fact={selectedFact?.fact ?? null}
        isDraft={selectedFact?.isDraft ?? false}
        onClose={() => setSelectedFact(null)}
      />

      <CreateDraftFactWizard
        isOpen={wizardOpen}
        onClose={closeWizard}
        step={wizardStep}
        kind={wizardKind}
        onSelectKind={(k) => { setWizardKind(k); setWizardStep(WIZARD_STEP.DETAILS); }}
        onBack={() => setWizardStep(wizardStep === WIZARD_STEP.REVIEW ? WIZARD_STEP.DETAILS : WIZARD_STEP.KIND)}
        locating={locating}
        locationError={locationError}
        circleCenter={circleCenter}
        circleRadius={circleRadius}
        onPickCircleCenterOnMap={() => pickOnMap('Tap the map to set the circle’s center', setCircleCenter)}
        onUseMyLocationForCircle={() => locateMeFor(setCircleCenter)}
        onSetCircleRadius={setCircleRadius}
        zoneOptions={geometry.polygonItems}
        zoneOptionsLoading={geometry.loading}
        zoneKey={zoneKey}
        onSelectZone={setZoneKey}
        pointA={pointA}
        pointB={pointB}
        onPickPointAOnMap={() => pickOnMap('Tap the map for Point A', setPointA)}
        onUseMyLocationForPointA={() => locateMeFor(setPointA)}
        onPickPointBOnMap={() => pickOnMap('Tap the map for Point B', setPointB)}
        onUseMyLocationForPointB={() => locateMeFor(setPointB)}
        renderedQuestionPreview={renderedQuestionPreview}
        canContinue={canContinue}
        onContinue={() => setWizardStep(WIZARD_STEP.REVIEW)}
        onSubmit={handleSubmitWizard}
      />
    </div>
  );
};

export const MapCanvas: React.FC = () => {
  const [registry] = useState(() => new MapLayerRegistry());

  return (
    <MapLayerRegistryProvider value={registry}>
      <MapCanvasInner registry={registry} />
    </MapLayerRegistryProvider>
  );
};
