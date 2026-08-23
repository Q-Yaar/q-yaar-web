import { useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapLayerModule } from '../layers/hooks';
import { PointDistanceItem, PointsDistanceModule } from '../layers/modules/PointsDistanceModule';
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
   * everything else a click could mean. */
  pickResolverRef: React.RefObject<((coordinates: [number, number]) => void) | null>;
}

export interface UseMapInteractionsResult {
  selectedFact: SelectedFact | null;
  clearSelectedFact: () => void;
}

/**
 * Owns Points & Distance measurement (capability #1) end to end — its
 * module instance and the click handler that places points / opens a
 * fact's popup / resolves a wizard map-pick. MapCanvas just needs
 * `selectedFact` (for the popup).
 */
export function useMapInteractions({
  mapRef,
  isMapReady,
  factsModule,
  draftFactsModule,
  pickResolverRef,
}: UseMapInteractionsOptions): UseMapInteractionsResult {
  const [pointsModule] = useState(() => new PointsDistanceModule());

  const [points, setPoints] = useState<PointDistanceItem[]>([]);
  const [selectedFact, setSelectedFact] = useState<SelectedFact | null>(null);

  useMapLayerModule(pointsModule, points);

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

  return {
    selectedFact,
    clearSelectedFact: () => setSelectedFact(null),
  };
}
