import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLayerTree } from '../layers/hooks';
import { GROUP_ID } from '../layers/groupIds';
import { POLYGON_OVERLAY_MODULE_ID } from '../layers/modules/PolygonOverlayModule';
import { PolygonOverlayItemData, REGION_KIND, usePolygonCatalog } from '../factsV2/geometryAssets';
import { uberDark } from '../theme';

interface ZoneSectionProps {
  title: string;
  zones: PolygonOverlayItemData[];
  visibleIds: Set<string>;
  onToggle: (id: string, visible: boolean) => void;
}

const ZoneSection: React.FC<ZoneSectionProps> = ({ title, zones, visibleIds, onToggle }) => {
  if (zones.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: uberDark.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
        {title}
      </div>
      {zones.map((zone) => (
        <label
          key={zone.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 4px', minHeight: '40px', fontSize: '14px',
            color: uberDark.textPrimary, cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={visibleIds.has(zone.id)}
            onChange={(e) => onToggle(zone.id, e.target.checked)}
          />
          {zone.displayName}
        </label>
      ))}
    </div>
  );
};

/**
 * A flat list of every zone the "Registry Polygons" overlay can draw — city
 * corporations, then metro line regions, each its own titled section, no
 * group/module nesting. This sheet only ever controls that one overlay now:
 * Measurement stays always-on, and Facts has its own quick-toggle chip on
 * the map (see FactsChip.tsx) — neither needs a place in this list.
 */
export const LayerControlPanel: React.FC = () => {
  const { tree, setItemVisible } = useLayerTree();
  const polygonCatalog = usePolygonCatalog();

  const overlaysGroup = tree.groups.find((g) => g.id === GROUP_ID.OVERLAYS);
  const polygonModule = overlaysGroup?.modules.find((m) => m.id === POLYGON_OVERLAY_MODULE_ID);
  const visibleIds = new Set(polygonModule?.items.filter((item) => item.visible).map((item) => item.id) ?? []);

  if (polygonCatalog.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: uberDark.textSecondary, fontSize: '13px', padding: '8px 4px' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading zones…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <ZoneSection
        title="City corporations"
        zones={polygonCatalog.items.filter((z) => z.kind === REGION_KIND.CORPORATION)}
        visibleIds={visibleIds}
        onToggle={(id, visible) => setItemVisible(POLYGON_OVERLAY_MODULE_ID, id, visible)}
      />
      <ZoneSection
        title="Metro line regions"
        zones={polygonCatalog.items.filter((z) => z.kind === REGION_KIND.METRO_CATCHMENT)}
        visibleIds={visibleIds}
        onToggle={(id, visible) => setItemVisible(POLYGON_OVERLAY_MODULE_ID, id, visible)}
      />
    </div>
  );
};
