import React from 'react';
import { Eye, EyeOff, Loader2, LocateFixed, MapPin, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { BottomSheet } from './BottomSheet';

const RADIUS_CHOICES_M = [100, 250, 500, 1000, 2000];

const formatDistance = (metres: number): string => (
  metres >= 1000 ? `${(metres / 1000).toFixed(metres % 1000 === 0 ? 0 : 1)} km` : `${metres} m`
);

export interface HidingZoneSheetProps {
  isOpen: boolean;
  onClose: () => void;
  hasPoint: boolean;
  pointLabel: string | null;
  locating: boolean;
  locationError: string | null;
  onUseMyLocation: () => void;
  onPickOnMap: () => void;
  radius: number;
  onSetRadius: (radius: number) => void;
  hasSavedZone: boolean;
  onSave: () => void;
  onClear: () => void;
  /** Whether the saved zone currently draws on the map — a separate
   * concern from having one saved at all, same as FactsChip's eye toggle
   * for the Facts group. */
  isVisible: boolean;
  onToggleVisible: () => void;
}

/**
 * The Hider's "My hiding zone" flow — a point + radius saved only to this
 * device (useHidingZone.ts, localStorage — never sent anywhere), so a
 * hider can mark where they're hiding as a private reminder to themselves.
 * One step, no map preview beyond the actual saved circle
 * (HidingZoneModule) that appears on the map once saved. Renders as a
 * BottomSheet, same reasoning as every other MapV2 flow.
 */
export const HidingZoneSheet: React.FC<HidingZoneSheetProps> = ({
  isOpen, onClose, hasPoint, pointLabel, locating, locationError, onUseMyLocation, onPickOnMap,
  radius, onSetRadius, hasSavedZone, onSave, onClear, isVisible, onToggleVisible,
}) => (
  <BottomSheet
    isOpen={isOpen}
    title="My hiding zone"
    leftAction={{ label: 'Close', onClick: onClose }}
    rightAction={{ label: 'Save', onClick: onSave, disabled: !hasPoint }}
  >
    <p className="text-[11px] text-white/40">
      Saved only on this device — nobody else can see it. A private reminder of where you're hiding.
    </p>

    {locationError && (
      <div className="rounded-md bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-[11px] text-red-300">
        {locationError}
      </div>
    )}

    <div>
      <div className="text-xs font-semibold text-white mb-1.5">Where</div>
      {hasPoint ? (
        <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-300">
          <span>✓ {pointLabel}</span>
          <button className="text-[11px] underline text-emerald-300" onClick={onPickOnMap}>change</button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={onUseMyLocation} disabled={locating} className="flex-1 h-9 text-xs">
            {locating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5 mr-1" />}
            Use my location
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onPickOnMap} className="flex-1 h-9 text-xs">
            <MapPin className="w-3.5 h-3.5 mr-1" />
            Tap the map
          </Button>
        </div>
      )}
    </div>

    <div>
      <div className="text-xs font-semibold text-white mb-1.5">Radius</div>
      <div className="flex flex-wrap gap-1.5">
        {RADIUS_CHOICES_M.map((m) => (
          <button
            key={m}
            onClick={() => onSetRadius(m)}
            className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
              radius === m ? 'bg-white text-neutral-900 border-white' : 'border-white/20 text-white/80 hover:border-white/40'
            }`}
          >
            {formatDistance(m)}
          </button>
        ))}
      </div>
      <input
        type="number"
        min={1}
        placeholder="Or type your own (metres)…"
        className="mt-1.5 w-full rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder:text-white/30"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw) onSetRadius(Number(raw));
        }}
      />
    </div>

    {hasSavedZone && (
      <div className="flex gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={onToggleVisible} className="flex-1 h-9 text-xs">
          {isVisible ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
          {isVisible ? 'Hide on map' : 'Show on map'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClear} className="flex-1 h-9 text-xs text-red-300 border-red-500/30 hover:bg-red-500/10">
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Clear saved zone
        </Button>
      </div>
    )}
  </BottomSheet>
);
