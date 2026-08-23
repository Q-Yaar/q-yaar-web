import React, { useEffect, useState } from 'react';
import { MapLayerRegistry } from './layers/MapLayerRegistry';
import { MapLayerRegistryProvider, useMapLayerModule, EMPTY_ITEMS } from './layers/hooks';
import { GROUP_ID } from './layers/groupIds';
import { PolygonOverlayModule } from './layers/modules/PolygonOverlayModule';
import { useMapInstance } from './hooks/useMapInstance';
import { useTeamFilter } from './hooks/useTeamFilter';
import { useMapInteractions } from './hooks/useMapInteractions';
import { usePlayArea, usePolygonCatalog } from './factsV2/geometryAssets';
import { useFactsLayers } from './factsV2/useFactsLayers';
import { useDraftFactWizard } from './factsV2/useDraftFactWizard';
import { TopBar } from './components/TopBar';
import { LayersSheet } from './components/LayersSheet';
import { AskQuestionFab } from './components/AskQuestionFab';
import { DraftQuestionsList } from './components/DraftQuestionsList';
import { FactsChip } from './components/FactsChip';
import { MapStatusBanner } from './components/MapStatusBanner';
import { FactPopup } from './components/FactPopup';
import { CreateDraftFactWizard } from './components/CreateDraftFactWizard';

interface MapCanvasInnerProps {
  registry: MapLayerRegistry;
  gameId?: string;
  onBack?: () => void;
}

/**
 * Orchestrator only. Each capability lives in its own hook or module — this
 * component's whole job is creating them in the right order, wiring their
 * outputs together, and laying out the chrome around the map itself:
 *   playArea         -> the eagerly-loaded game zone (factsV2/geometryAssets.ts)
 *   polygonCatalog   -> corporation/metro-catchment zones, loaded lazily
 *                        (factsV2/geometryAssets.ts)
 *   teamFilter       -> which team's facts to show (hooks/useTeamFilter.ts)
 *   facts            -> Facts/Draft Facts data + modules (factsV2/useFactsLayers.ts)
 *   wizard           -> the "Ask a question" form (factsV2/useDraftFactWizard.ts)
 *   interactions     -> map clicks/hover, Points & Distance
 *                        (hooks/useMapInteractions.ts)
 * `wizard` feeds `interactions` its pick-resolver so a click can satisfy a
 * pending "tap the map" request; nothing else crosses between them.
 *
 * Layout is two real flex rows stacked in a column — a fixed-height TopBar,
 * then a flex:1 map area — rather than one full-bleed map with every
 * control floating on top of it. The wizard/layers/fact-detail sheets still
 * overlay the map (they're full-viewport portals, by design — see
 * BottomSheet), but nothing about them blocks it: no backdrop, and the
 * sheet's own header never covers more than the bottom portion of the
 * screen, so there's always map visible above it for orientation while a
 * question is being composed.
 */
const MapCanvasInner: React.FC<MapCanvasInnerProps> = ({ registry, gameId, onBack }) => {
  useEffect(() => {
    // Measurement has no visibility toggle anywhere in the UI right now, so
    // it stays permanently on — registering it is still required so
    // PointsDistanceModule has a group to mount into.
    registry.registerGroup(GROUP_ID.MEASUREMENT, 'Measurement');
    // Registry Polygons' only visibility control is now the per-zone flat
    // list in LayersSheet (no group-level toggle exposed), so the group
    // itself must default visible — otherwise every zone checkbox would be
    // fighting a group that's permanently hidden.
    registry.registerGroup(GROUP_ID.OVERLAYS, 'Overlays');
    registry.registerGroup(GROUP_ID.FACTS, 'Facts');
  }, [registry]);

  const { containerRef, mapRef, isMapReady } = useMapInstance({ registry });
  const playAreaState = usePlayArea();
  const polygonCatalog = usePolygonCatalog();
  const teamFilter = useTeamFilter(gameId);

  const facts = useFactsLayers({ gameId, teamId: teamFilter.selectedTeamId, playAreaState });
  const wizard = useDraftFactWizard({
    zoneOptions: polygonCatalog.items,
    zoneOptionsLoading: polygonCatalog.loading,
    previewUniverse: facts.draftsUniverse,
    onSubmit: facts.addDraftQuestion,
  });
  const interactions = useMapInteractions({
    mapRef,
    isMapReady,
    factsModule: facts.factsModule,
    draftFactsModule: facts.draftFactsModule,
    pickResolverRef: wizard.pickResolverRef,
  });

  // Capability #2 — Registry Polygons. Simple enough (no data pipeline of
  // its own, just polygonCatalog.items) to wire directly here rather than
  // through a dedicated hook. Loads independently of the map/facts —
  // usePolygonCatalog() fetches every known zone's geometry in the
  // background, never gating on it.
  const [polygonModule] = useState(() => new PolygonOverlayModule());
  useMapLayerModule(polygonModule, polygonCatalog.loading ? EMPTY_ITEMS : polygonCatalog.items);

  const [layersOpen, setLayersOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0 }}>
      <TopBar
        onBack={onBack}
        teamFilter={teamFilter}
        onOpenLayers={() => setLayersOpen(true)}
      />

      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0 }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

        <FactsChip count={facts.factsCount} />
        <MapStatusBanner pickPrompt={wizard.pickPrompt} onCancelPick={wizard.cancelPick} />
        <DraftQuestionsList questions={facts.draftQuestions} onRemove={facts.removeDraftQuestion} />
        <AskQuestionFab onClick={wizard.openWizard} />

        <LayersSheet isOpen={layersOpen} onClose={() => setLayersOpen(false)} />

        <FactPopup
          fact={interactions.selectedFact?.fact ?? null}
          isDraft={interactions.selectedFact?.isDraft ?? false}
          onClose={interactions.clearSelectedFact}
        />

        <CreateDraftFactWizard {...wizard.props} />
      </div>
    </div>
  );
};

export const MapCanvas: React.FC<{ gameId?: string; onBack?: () => void }> = ({ gameId, onBack }) => {
  const [registry] = useState(() => new MapLayerRegistry());

  return (
    <MapLayerRegistryProvider value={registry}>
      <MapCanvasInner registry={registry} gameId={gameId} onBack={onBack} />
    </MapLayerRegistryProvider>
  );
};
