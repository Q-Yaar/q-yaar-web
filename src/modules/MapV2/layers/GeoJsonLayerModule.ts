import { Feature, FeatureCollection, Geometry } from 'geojson';
import maplibregl from 'maplibre-gl';
import { ItemNode, LayerItem } from './types';

interface StoredItem<Item> {
  data: Item;
  visible: boolean;
}

/**
 * Shared base every capability extends. It owns item storage and the
 * visibility cascade; a concrete module implements four small pieces:
 * sourceId(), addLayers(map), toFeatures(item), and optionally
 * extraFeatures(visibleItems).
 *
 * The isolation guarantee is structural, not disciplinary: every module owns
 * exactly one MapLibre source and the layers reading from it, and render()
 * is the only place any module writes to the map (one setData call). Nothing
 * outside a module's own render() ever touches its source.
 */
export abstract class GeoJsonLayerModule<Item extends LayerItem> {
  abstract readonly id: string;
  abstract readonly groupId: string;
  abstract readonly label: string;

  private items = new Map<string, StoredItem<Item>>();
  private map: maplibregl.Map | null = null;
  private mounted = false;
  /** group.visible && module.visible, pushed down by the registry. */
  private containerVisible = true;

  /** Wired up by MapLayerRegistry.register() so item-level visibility
   * toggles — which the registry doesn't track itself — still trigger a
   * layer-tree re-render. */
  notifyTreeChange: () => void = () => {};

  /** This module's source id — must be unique on the map. */
  abstract sourceId(): string;

  /** What to draw. Called once, when the map instance is attached. */
  abstract addLayers(map: maplibregl.Map): void;

  /** One item -> one or more GeoJSON features. */
  abstract toFeatures(item: Item): Feature[];

  /** Optional: features derived from the whole visible set (a line between
   * two points, not any single one). */
  extraFeatures(_visibleItems: Item[]): Feature[] {
    return [];
  }

  /** Called once by the registry when the map instance becomes available. */
  mount(map: maplibregl.Map): void {
    if (this.mounted) return;
    this.map = map;
    this.addLayers(map);
    this.mounted = true;
    this.render();
  }

  get isMounted(): boolean {
    return this.mounted;
  }

  /** Whether an id never seen before starts visible. Overridden by
   * PolygonOverlayModule (zones start off, toggled on individually via the
   * Zones sheet) — every other module keeps the default. */
  protected defaultItemVisible(): boolean {
    return true;
  }

  /** Replace the full item list. An id seen before keeps its prior
   * visibility; a new id falls back to defaultItemVisible(). */
  setItems(items: Item[]): void {
    const next = new Map<string, StoredItem<Item>>();
    for (const data of items) {
      const prior = this.items.get(data.id);
      next.set(data.id, { data, visible: prior?.visible ?? this.defaultItemVisible() });
    }
    this.items = next;
    this.render();
    this.notifyTreeChange();
  }

  setItemVisible(itemId: string, visible: boolean): void {
    const entry = this.items.get(itemId);
    if (!entry) return;
    entry.visible = visible;
    this.render();
    this.notifyTreeChange();
  }

  /** Pushed by the registry: effective = group.visible && module.visible. */
  applyContainerVisibility(visible: boolean): void {
    this.containerVisible = visible;
    this.render();
  }

  getItemNodes(): ItemNode[] {
    return Array.from(this.items.values()).map(({ data, visible }) => ({
      id: data.id,
      visible,
      label: (data as Item & { displayName?: string; label?: string }).displayName
        ?? (data as Item & { displayName?: string; label?: string }).label,
    }));
  }

  /** Exposed (not private) so a subclass overriding render() — currently
   * only FactsLayerModule, to resolve regions asynchronously in a worker —
   * can still ask "which items should I actually draw right now?" without
   * reimplementing the group/module/item visibility cascade itself. */
  protected effectiveItems(): Item[] {
    if (!this.containerVisible) return [];
    return Array.from(this.items.values())
      .filter((entry) => entry.visible)
      .map((entry) => entry.data);
  }

  /** The tail end of render(), pulled out so a subclass with its own
   * (e.g. async) way of producing features can still finish through the
   * same single write path every module uses. */
  protected writeFeatures(features: Feature[]): void {
    if (!this.mounted || !this.map) return;
    const source = this.map.getSource(this.sourceId()) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const collection: FeatureCollection<Geometry> = { type: 'FeatureCollection', features };
    source.setData(collection);
  }

  /** The only write any module makes to the map on a visibility or data
   * change — filter to effectively-visible items, build one
   * FeatureCollection, call setData. */
  render(): void {
    const visibleItems = this.effectiveItems();
    const features: Feature[] = visibleItems.flatMap((item) => this.toFeatures(item));
    features.push(...this.extraFeatures(visibleItems));
    this.writeFeatures(features);
  }
}
