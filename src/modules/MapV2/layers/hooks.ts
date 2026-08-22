import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { MapLayerRegistry } from './MapLayerRegistry';
import { GeoJsonLayerModule } from './GeoJsonLayerModule';
import { LayerItem, LayerTree } from './types';

const MapLayerRegistryContext = createContext<MapLayerRegistry | null>(null);

export const MapLayerRegistryProvider = MapLayerRegistryContext.Provider;

export function useMapLayerRegistry(): MapLayerRegistry {
  const registry = useContext(MapLayerRegistryContext);
  if (!registry) throw new Error('useMapLayerRegistry must be used within a MapLayerRegistryProvider');
  return registry;
}

/** A stable "no items yet" reference for useMapLayerModule callers. Passing
 * a fresh `[]` literal instead re-triggers the setItems effect below on
 * every render (new array => changed dependency), which calls
 * notifyTreeChange() => registry.invalidate(), which re-renders any
 * useLayerTree() subscriber => another render => another fresh `[]` =>
 * infinite loop. One shared empty array (TS accepts `never[]` for any
 * element type here) breaks that cycle. */
export const EMPTY_ITEMS: never[] = [];

/**
 * Register one module instance for the lifetime of the owning component, and
 * keep its item list in sync with `items`. Call once per capability — in
 * whatever component owns that capability's data, usually alongside the
 * other useMapLayerModule calls in the map canvas.
 *
 * `module` must be a stable instance (create it with useState/useMemo's
 * lazy-initializer form) — a new instance every render would re-register
 * on every render.
 */
export function useMapLayerModule<Item extends LayerItem>(
  module: GeoJsonLayerModule<Item>,
  items: Item[],
): void {
  const registry = useMapLayerRegistry();

  useEffect(() => {
    registry.register(module);
    return () => registry.unregister(module.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry, module]);

  useEffect(() => {
    module.setItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, items]);
}

export interface LayerTreeControls {
  tree: LayerTree;
  setGroupVisible: (groupId: string, visible: boolean) => void;
  setModuleVisible: (moduleId: string, visible: boolean) => void;
  setItemVisible: (moduleId: string, itemId: string, visible: boolean) => void;
}

/** The full group/module/item tree with visibility flags, plus the setters
 * a control-panel's checkboxes call. */
export function useLayerTree(): LayerTreeControls {
  const registry = useMapLayerRegistry();
  const tree = useSyncExternalStore(registry.subscribe, registry.getLayerTree);

  return useMemo(
    () => ({
      tree,
      setGroupVisible: registry.setGroupVisible.bind(registry),
      setModuleVisible: registry.setModuleVisible.bind(registry),
      setItemVisible: registry.setItemVisible.bind(registry),
    }),
    [tree, registry],
  );
}
