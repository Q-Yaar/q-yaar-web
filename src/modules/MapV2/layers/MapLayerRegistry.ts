import maplibregl from 'maplibre-gl';
import { GeoJsonLayerModule } from './GeoJsonLayerModule';
import { GroupNode, LayerItem, LayerTree, ModuleNode } from './types';

interface GroupEntry {
  label: string;
  visible: boolean;
}

interface ModuleEntry {
  groupId: string;
  label: string;
  visible: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: GeoJsonLayerModule<any>;
}

type Listener = () => void;

/**
 * One instance per map mount. Owns the group -> module -> item visibility
 * tree and the single map instance every module mounts against. A toggle
 * anywhere in the tree resolves through exactly one path and reaches only
 * the one module it concerns — the registry never iterates or notifies
 * modules outside the one whose group/module/item changed.
 */
export class MapLayerRegistry {
  private groups = new Map<string, GroupEntry>();
  private modules = new Map<string, ModuleEntry>();
  private map: maplibregl.Map | null = null;
  private listeners = new Set<Listener>();
  private cachedTree: LayerTree | null = null;

  /** Idempotent — safe for any module to call on mount regardless of order.
   * Two modules declaring the same group id with different labels silently
   * keep whichever registered first; same for `initialVisible` — only the
   * first call (typically the explicit one in MapCanvas) decides it. */
  registerGroup(groupId: string, label: string, initialVisible = true): void {
    if (this.groups.has(groupId)) return;
    this.groups.set(groupId, { label, visible: initialVisible });
    this.invalidate();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(instance: GeoJsonLayerModule<any>): void {
    this.registerGroup(instance.groupId, instance.groupId);
    this.modules.set(instance.id, {
      groupId: instance.groupId,
      label: instance.label,
      visible: true,
      instance,
    });
    instance.notifyTreeChange = () => this.invalidate();

    if (this.map) {
      instance.mount(this.map);
      instance.applyContainerVisibility(this.effectiveContainerVisible(instance.id));
    }
    this.invalidate();
  }

  unregister(moduleId: string): void {
    if (!this.modules.delete(moduleId)) return;
    this.invalidate();
  }

  /** Called once the MapLibre instance is ready. Mounts every module
   * registered so far; any module registered afterwards mounts immediately
   * in register(). */
  setMap(map: maplibregl.Map): void {
    this.map = map;
    this.modules.forEach((entry, moduleId) => {
      if (!entry.instance.isMounted) {
        entry.instance.mount(map);
        entry.instance.applyContainerVisibility(this.effectiveContainerVisible(moduleId));
      }
    });
    this.invalidate();
  }

  setGroupVisible(groupId: string, visible: boolean): void {
    const group = this.groups.get(groupId);
    if (!group) return;
    group.visible = visible;
    this.modules.forEach((entry, moduleId) => {
      if (entry.groupId === groupId) {
        entry.instance.applyContainerVisibility(this.effectiveContainerVisible(moduleId));
      }
    });
    this.invalidate();
  }

  setModuleVisible(moduleId: string, visible: boolean): void {
    const entry = this.modules.get(moduleId);
    if (!entry) return;
    entry.visible = visible;
    entry.instance.applyContainerVisibility(this.effectiveContainerVisible(moduleId));
    this.invalidate();
  }

  setItemVisible(moduleId: string, itemId: string, visible: boolean): void {
    const entry = this.modules.get(moduleId);
    if (!entry) return;
    // instance.setItemVisible() calls notifyTreeChange() -> this.invalidate()
    entry.instance.setItemVisible(itemId, visible);
  }

  private effectiveContainerVisible(moduleId: string): boolean {
    const entry = this.modules.get(moduleId);
    if (!entry) return false;
    const group = this.groups.get(entry.groupId);
    return (group?.visible ?? true) && entry.visible;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private invalidate(): void {
    this.cachedTree = null;
    this.listeners.forEach((listener) => listener());
  }

  /** Referentially stable until something actually changes — required for
   * useSyncExternalStore, which the control-panel hook is built on. */
  getLayerTree = (): LayerTree => {
    if (this.cachedTree) return this.cachedTree;

    const groups: GroupNode[] = Array.from(this.groups.entries()).map(([groupId, group]) => {
      const modules: ModuleNode[] = Array.from(this.modules.entries())
        .filter(([, entry]) => entry.groupId === groupId)
        .map(([moduleId, entry]) => ({
          id: moduleId,
          groupId,
          label: entry.label,
          visible: entry.visible,
          items: entry.instance.getItemNodes(),
        }));

      return { id: groupId, label: group.label, visible: group.visible, modules };
    });

    this.cachedTree = { groups };
    return this.cachedTree;
  };
}

export type { LayerItem };
