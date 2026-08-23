import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLayerTree } from '../layers/hooks';
import { GROUP_ID } from '../layers/groupIds';
import { uberDark } from '../theme';

interface FactsChipProps {
  count: number;
}

/**
 * A floating chip over the map's top-left corner reporting how many
 * confirmed facts are loaded, with a quick eye toggle for the whole Facts
 * group (Facts + Draft Facts together) — faster than opening a sheet just
 * to hide shading while you're eyeballing the map underneath it.
 */
export const FactsChip: React.FC<FactsChipProps> = ({ count }) => {
  const { tree, setGroupVisible } = useLayerTree();
  const factsGroup = tree.groups.find((g) => g.id === GROUP_ID.FACTS);
  const visible = factsGroup?.visible ?? true;

  return (
    <div
      style={{
        position: 'absolute', top: '12px', left: '12px', zIndex: 15,
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 8px 6px 14px', borderRadius: '20px',
        backgroundColor: uberDark.surfaceElevated,
        border: `1px solid ${uberDark.border}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        fontSize: '12px', color: uberDark.textPrimary,
      }}
    >
      <span>{count} {count === 1 ? 'fact' : 'facts'} loaded</span>
      <button
        onClick={() => setGroupVisible(GROUP_ID.FACTS, !visible)}
        aria-label={visible ? 'Hide facts' : 'Show facts'}
        style={{
          width: '26px', height: '26px', borderRadius: '50%', border: 'none',
          backgroundColor: 'rgba(255,255,255,0.12)', color: uberDark.textPrimary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
        }}
      >
        {visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
    </div>
  );
};
