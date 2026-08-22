import React, { useEffect, useState } from 'react';
import { MapLayerRegistry } from './layers/MapLayerRegistry';
import { MapLayerRegistryProvider, useMapLayerModule, EMPTY_ITEMS } from './layers/hooks';
import { GROUP_ID } from './layers/groupIds';
import { PolygonOverlayModule } from './layers/modules/PolygonOverlayModule';
import { useMapInstance } from './hooks/useMapInstance';
import { useTeamFilter } from './hooks/useTeamFilter';
import { useMapInteractions } from './hooks/useMapInteractions';
import { useGeometryRegistries } from './factsV2/registries';
import { useFactsLayers } from './factsV2/useFactsLayers';
import { useDraftFactWizard } from './factsV2/useDraftFactWizard';
import { MapControlsPanel } from './components/MapControlsPanel';
import { MapStatusBanner } from './components/MapStatusBanner';
import { FactPopup } from './components/FactPopup';
import { CreateDraftFactWizard } from './components/CreateDraftFactWizard';

/**
 * Orchestrator only. Each capability lives in its own hook or module —
 * this component's whole job is creating them in the right order and
 * wiring their outputs together:
 *   geometry         -> shared registries + play area (factsV2/registries.ts)
 *   teamFilter       -> which team's facts to show (hooks/useTeamFilter.ts)
 *   facts            -> Facts/Draft Facts data + modules (factsV2/useFactsLayers.ts)
 *   wizard           -> the "Ask a question" form (factsV2/useDraftFactWizard.ts)
 *   interactions     -> map clicks/hover, Points & Distance, Point Preview
 *                        (hooks/useMapInteractions.ts)
 * `wizard` feeds `interactions` its pick-resolver so a click can satisfy a
 * pending "tap the map" request; nothing else crosses between them.
 */
const MapCanvasInner: React.FC<{ registry: MapLayerRegistry; gameId?: string }> = ({ registry, gameId }) => {
  useEffect(() => {
    registry.registerGroup(GROUP_ID.MEASUREMENT, 'Measurement');
    registry.registerGroup(GROUP_ID.OVERLAYS, 'Overlays', false);
    registry.registerGroup(GROUP_ID.FACTS, 'Facts');
    registry.registerGroup(GROUP_ID.PREVIEW, 'Preview');
  }, [registry]);

  const { containerRef, mapRef, isMapReady } = useMapInstance({ registry });
  const geometry = useGeometryRegistries();
  const teamFilter = useTeamFilter(gameId);

  const facts = useFactsLayers({ gameId, teamId: teamFilter.selectedTeamId, geometry });
  const wizard = useDraftFactWizard({ geometry, onSubmit: facts.addDraftQuestion });
  const interactions = useMapInteractions({
    mapRef,
    isMapReady,
    factsModule: facts.factsModule,
    draftFactsModule: facts.draftFactsModule,
    pickResolverRef: wizard.pickResolverRef,
    isPicking: wizard.isPicking,
  });

  // Capability #2 — Registry Polygons. Simple enough (no data pipeline of
  // its own, just geometry.polygonItems) to wire directly here rather than
  // through a dedicated hook.
  const [polygonModule] = useState(() => new PolygonOverlayModule());
  useMapLayerModule(polygonModule, geometry.loading ? EMPTY_ITEMS : geometry.polygonItems);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <MapControlsPanel
        teamFilter={teamFilter}
        onOpenWizard={wizard.openWizard}
        previewEnabled={interactions.previewEnabled}
        onTogglePreview={interactions.togglePreview}
        draftQuestions={facts.draftQuestions}
        onRemoveDraftQuestion={facts.removeDraftQuestion}
      />

      <MapStatusBanner pickPrompt={wizard.pickPrompt} onCancelPick={wizard.cancelPick} />

      <FactPopup
        fact={interactions.selectedFact?.fact ?? null}
        isDraft={interactions.selectedFact?.isDraft ?? false}
        onClose={interactions.clearSelectedFact}
      />

      <CreateDraftFactWizard {...wizard.props} />
    </div>
  );
};

export const MapCanvas: React.FC<{ gameId?: string }> = ({ gameId }) => {
  const [registry] = useState(() => new MapLayerRegistry());

  return (
    <MapLayerRegistryProvider value={registry}>
      <MapCanvasInner registry={registry} gameId={gameId} />
    </MapLayerRegistryProvider>
  );
};
