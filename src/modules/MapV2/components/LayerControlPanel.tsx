import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { useLayerTree } from '../layers/hooks';
import { uberDark } from '../theme';

/**
 * The control-panel UI the architecture doc left open: a checkbox tree over
 * useLayerTree's group -> module -> item structure, calling
 * setGroupVisible/setModuleVisible/setItemVisible directly. No layer module
 * needs to know this exists.
 */
export const LayerControlPanel: React.FC = () => {
  const { tree, setGroupVisible, setModuleVisible, setItemVisible } = useLayerTree();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(tree.groups.map((g) => g.id)));
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleExpanded = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next);
  };

  return (
    <div
      style={{
        backgroundColor: uberDark.surfaceElevated,
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        border: `1px solid ${uberDark.border}`,
        padding: '8px',
        width: '280px',
        maxHeight: '60vh',
        overflowY: 'auto',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '13px', fontWeight: 600, color: uberDark.textSecondary,
        padding: '8px 8px', borderBottom: `1px solid ${uberDark.border}`, marginBottom: '4px',
      }}
      >
        <Layers size={14} /> Layers
      </div>

      {tree.groups.map((group) => (
        <div key={group.id} style={{ marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 4px' }}>
            <button
              onClick={() => toggleExpanded(expandedGroups, setExpandedGroups, group.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: uberDark.textSecondary }}
              aria-label={expandedGroups.has(group.id) ? 'Collapse group' : 'Expand group'}
            >
              {expandedGroups.has(group.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flex: 1, color: uberDark.textPrimary }}>
              <input
                type="checkbox"
                checked={group.visible}
                onChange={(e) => setGroupVisible(group.id, e.target.checked)}
              />
              {group.label}
            </label>
          </div>

          {expandedGroups.has(group.id) && group.modules.map((mod) => (
            <div key={mod.id} style={{ marginLeft: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 4px' }}>
                {mod.items.length > 0 ? (
                  <button
                    onClick={() => toggleExpanded(expandedModules, setExpandedModules, mod.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: uberDark.textSecondary }}
                    aria-label={expandedModules.has(mod.id) ? 'Collapse module' : 'Expand module'}
                  >
                    {expandedModules.has(mod.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                ) : <span style={{ width: '12px', display: 'inline-block' }} />}
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', flex: 1, color: uberDark.textPrimary }}>
                  <input
                    type="checkbox"
                    checked={mod.visible}
                    onChange={(e) => setModuleVisible(mod.id, e.target.checked)}
                  />
                  {mod.label}
                  <span style={{ color: uberDark.textSecondary, fontSize: '11px' }}>
                    {mod.items.length > 0 ? `(${mod.items.filter((i) => i.visible).length}/${mod.items.length})` : ''}
                  </span>
                </label>
              </div>

              {expandedModules.has(mod.id) && mod.items.map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    marginLeft: '32px', padding: '2px 4px', fontSize: '12px',
                    color: uberDark.textSecondary, cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.visible}
                    onChange={(e) => setItemVisible(mod.id, item.id, e.target.checked)}
                  />
                  {item.label ?? item.id}
                </label>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
