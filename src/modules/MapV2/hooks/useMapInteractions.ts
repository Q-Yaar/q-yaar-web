import { useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapLayerModule, EMPTY_ITEMS } from '../layers/hooks';
import { PointDistanceItem, PointsDistanceModule } from '../layers/modules/PointsDistanceModule';
import { PointPreviewModule } from '../layers/modules/PointPreviewModule';
import { FactsLayerModule } from '../layers/modules/FactsLayerModule';
import { FactDto } from '../factsV2/factTypes';
import { DRAFT_FACTS_FILL_LAYER, FACT_HIT_LAYERS } from '../factsV2/factsLayerIds';

export interface SelectedFact {
  fact: FactDto;
  isDraft: boolean;
}

export interface UseMapInteractionsOptions {
  mapRef: React.RefObject<maplibregl.Map | null>;
  isMapReady: boolean;
  factsModule: FactsLayerModule;
  draftFactsModule: FactsLayerModule;
  /** Owned by useDraftFactWizard — a pending pick takes priority over
   * everything else a click could mean, and also drives the hover preview
   * while it's active. */
  pickResolverRef: React.RefObject<((coordinates: [number, number]) => void) | null>;
  isPicking: boolean;
}

export interface UseMapInteractionsResult {
  selectedFact: SelectedFact | null;
  clearSelectedFact: () => void;
  previewEnabled: boolean;
  togglePreview: () => void;
}

/**
 * Owns Points & Distance measurement (capability #1) and Point Preview
 * (capability #4) end to end — their module instances, the click handler
 * that places points / opens a fact's popup / resolves a wizard map-pick,
 * and the hover effect that drives the preview ring. MapCanvas just needs
 * `selectedFact` (for the popup) and the preview toggle's own UI state.
 */
export function useMapInteractions({
  mapRef,
  isMapReady,
  factsModule,
  draftFactsModule,
  pickResolverRef,
  isPicking,
}: UseMapInteractionsOptions): UseMapInteractionsResult {
  const [pointsModule] = useState(() => new PointsDistanceModule());
  const [previewModule] = useState(() => new PointPreviewModule());

  const [points, setPoints] = useState<PointDistanceItem[]>([]);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [selectedFact, setSelectedFact] = useState<SelectedFact | null>(null);

  useMapLayerModule(pointsModule, points);
  useMapLayerModule(previewModule, EMPTY_ITEMS);

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
  }, [mapRef, isMapReady, pickResolverRef, factsModule, draftFactsModule]);

  // Hover preview (capability #4) — driven either by the "Preview" toggle,
  // or by an in-progress wizard map-pick.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || (!previewEnabled && !isPicking)) return;

    const handleMove = (e: maplibregl.MapMouseEvent) => previewModule.preview([e.lngLat.lng, e.lngLat.lat]);
    map.on('mousemove', handleMove);
    return () => {
      map.off('mousemove', handleMove);
      previewModule.clear();
    };
  }, [mapRef, isMapReady, previewEnabled, isPicking, previewModule]);

  return {
    selectedFact,
    clearSelectedFact: () => setSelectedFact(null),
    previewEnabled,
    togglePreview: () => setPreviewEnabled((v) => !v),
  };
}
