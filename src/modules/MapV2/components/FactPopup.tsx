import React from 'react';
import { Modal } from '../../../components/ui/modal';
import { FactDto } from '../factsV2/factTypes';

interface FactPopupProps {
  fact: FactDto | null;
  isDraft: boolean;
  onClose: () => void;
}

const formatSlotValue = (value: unknown): string => {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if ('lat' in v && 'lon' in v) {
      const label = typeof v.name === 'string' ? `${v.name} — ` : '';
      return `${label}${v.lat}, ${v.lon}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Every map modal that shows fact details reads straight off the FactsV2
 * DTO from "Ask to Fact" — op_type, the resolved op_meta slots, and the
 * assertedAnswer/value pair the region was computed from — rather than the
 * old ad hoc Fact.fact_info blob.
 *
 * Skips Modal's built-in `title` (it hardcodes dark text, illegible on this
 * dark-theme card) and renders its own light-colored heading instead.
 */
export const FactPopup: React.FC<FactPopupProps> = ({ fact, isDraft, onClose }) => {
  if (!fact) return null;

  const { op_type, op_meta } = fact.fact_info;
  const { assertedAnswer, value, ...slots } = op_meta;

  return (
    <Modal isOpen onClose={onClose} className="dark bg-neutral-900 border border-white/10 text-white">
      <div className="space-y-3 text-sm">
        <h2 className="text-lg font-bold text-white">{isDraft ? 'Draft Fact' : 'Fact'}</h2>

        {isDraft && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-amber-300 text-xs">
            Not yet confirmed by the hider — shown assuming the asserted answer holds.
          </div>
        )}

        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <span className="text-white/50">fact_id</span>
          <span className="font-mono text-xs text-white/90">{fact.fact_id}</span>

          <span className="text-white/50">op_type</span>
          <span className="font-mono text-xs text-white/90">{op_type}</span>

          <span className="text-white/50">assertedAnswer</span>
          <span className="font-mono text-xs text-white/90">{String(assertedAnswer)}</span>

          <span className="text-white/50">value</span>
          <span className="font-mono text-xs text-white/90">{String(value)}{isDraft ? ' (assumed)' : ''}</span>
        </div>

        <div>
          <div className="text-white/50 text-xs uppercase tracking-wide mb-1">op_meta slots</div>
          <div className="rounded-md border border-white/10 divide-y divide-white/10">
            {Object.entries(slots).map(([key, val]) => (
              <div key={key} className="grid grid-cols-[auto_1fr] gap-x-3 px-3 py-1.5">
                <span className="text-white/50">{key}</span>
                <span className="font-mono text-xs text-white/90 break-words">{formatSlotValue(val)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-white/40">
          question_id: {fact.question_id} · answer_id: {fact.answer_id}
        </div>
      </div>
    </Modal>
  );
};
