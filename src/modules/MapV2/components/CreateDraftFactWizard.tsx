import React from 'react';
import { Circle, Thermometer, MapPinned, LocateFixed, MapPin, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ResolvedLatLon } from '../factsV2/factTypes';
import { describeResolvedPoint, formatDistance, WIZARD_KIND, WizardKind } from '../factsV2/buildDraftQuestion';
import { PolygonOverlayItemData, REGION_KIND } from '../factsV2/geometryAssets';
import { BottomSheet } from './BottomSheet';

export { WIZARD_KIND };
export type { WizardKind };

export const WIZARD_STEP = {
  KIND: 'kind',
  DETAILS: 'details',
  REVIEW: 'review',
} as const;

export type WizardStep = (typeof WIZARD_STEP)[keyof typeof WIZARD_STEP];

const RADIUS_CHOICES_M = [250, 500, 1000, 3000, 5000, 10000];

const KIND_INFO: Record<WizardKind, { title: string; blurb: string; icon: React.ReactNode }> = {
  [WIZARD_KIND.CIRCLE]: {
    title: 'Inside a circle',
    blurb: 'Ask if someone is within a certain distance of a point.',
    icon: <Circle className="w-6 h-6" />,
  },
  [WIZARD_KIND.HOTTER_COLDER]: {
    title: 'Hotter or colder',
    blurb: 'Ask if someone got closer to, or farther from, a spot.',
    icon: <Thermometer className="w-6 h-6" />,
  },
  [WIZARD_KIND.ZONE]: {
    title: 'Inside a zone',
    blurb: 'Ask if someone is inside a named area, like a city zone.',
    icon: <MapPinned className="w-6 h-6" />,
  },
};

interface PointFieldProps {
  label: string;
  helpText: string;
  value: ResolvedLatLon | null;
  locating: boolean;
  onPickOnMap: () => void;
  onUseMyLocation: () => void;
}

const PointField: React.FC<PointFieldProps> = ({ label, helpText, value, locating, onPickOnMap, onUseMyLocation }) => (
  <div>
    <div className="text-sm font-semibold text-white">{label}</div>
    <div className="text-xs text-white/50 mb-2">{helpText}</div>
    {value ? (
      <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
        <span>✓ {describeResolvedPoint(value)}</span>
        <button className="text-xs underline text-emerald-300" onClick={onPickOnMap}>change</button>
      </div>
    ) : (
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onUseMyLocation} disabled={locating} className="flex-1 h-11">
          {locating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LocateFixed className="w-4 h-4 mr-1" />}
          Use my location
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onPickOnMap} className="flex-1 h-11">
          <MapPin className="w-4 h-4 mr-1" />
          Tap the map
        </Button>
      </div>
    )}
  </div>
);

const chipStyle = (selected: boolean): string =>
  `px-3 py-2 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
    selected ? 'bg-white text-neutral-900 border-white' : 'border-white/20 text-white/80 hover:border-white/40'
  }`;

interface ZoneChipGroupProps {
  label: string;
  zones: PolygonOverlayItemData[];
  selected: string | null;
  onSelect: (key: string) => void;
}

const ZoneChipGroup: React.FC<ZoneChipGroupProps> = ({ label, zones, selected, onSelect }) => {
  if (zones.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {zones.map((z) => (
          <button key={z.id} onClick={() => onSelect(z.id)} className={chipStyle(selected === z.id)}>
            {z.displayName}
          </button>
        ))}
      </div>
    </div>
  );
};

export interface CreateDraftFactWizardProps {
  isOpen: boolean;
  onClose: () => void;
  step: WizardStep;
  kind: WizardKind | null;
  onSelectKind: (kind: WizardKind) => void;
  onBack: () => void;

  locating: boolean;
  locationError: string | null;

  circleCenter: ResolvedLatLon | null;
  circleRadius: number | null;
  onPickCircleCenterOnMap: () => void;
  onUseMyLocationForCircle: () => void;
  onSetCircleRadius: (metres: number) => void;

  zoneOptions: PolygonOverlayItemData[];
  zoneOptionsLoading: boolean;
  zoneKey: string | null;
  onSelectZone: (key: string) => void;

  pointA: ResolvedLatLon | null;
  pointB: ResolvedLatLon | null;
  onPickPointAOnMap: () => void;
  onUseMyLocationForPointA: () => void;
  onPickPointBOnMap: () => void;
  onUseMyLocationForPointB: () => void;

  renderedQuestionPreview: string | null;
  /** What the review step's live map preview assumes the hider will
   * answer — true assumes the asserted pole holds, false its opposite. */
  assumedValue: boolean;
  onSetAssumedValue: (value: boolean) => void;
  canContinue: boolean;
  onContinue: () => void;
  onSubmit: () => void;
}

/**
 * A plain-language question wizard for creating draft facts — "are you
 * inside a circle", "are you hotter or colder", "are you inside a zone" —
 * instead of the technical map-tool jargon the old app used. All state
 * lives in the parent (MapCanvas) so this component can be safely hidden
 * mid-flow while the user taps the map to place a point, then reopened with
 * nothing lost.
 *
 * Renders as a BottomSheet, not a centered modal: the map stays visible and
 * interactive above it while the question is being composed, only fully
 * stepping aside (isOpen goes false — see useDraftFactWizard's pickOnMap)
 * for the moment a point is actually being tapped in.
 */
export const CreateDraftFactWizard: React.FC<CreateDraftFactWizardProps> = (props) => {
  const {
    isOpen, onClose, step, kind, onSelectKind, onBack,
    locating, locationError,
    circleCenter, circleRadius, onPickCircleCenterOnMap, onUseMyLocationForCircle, onSetCircleRadius,
    zoneOptions, zoneOptionsLoading, zoneKey, onSelectZone,
    pointA, pointB, onPickPointAOnMap, onUseMyLocationForPointA, onPickPointBOnMap, onUseMyLocationForPointB,
    renderedQuestionPreview, assumedValue, onSetAssumedValue, canContinue, onContinue, onSubmit,
  } = props;

  const title = step === WIZARD_STEP.KIND ? 'Ask a question' : step === WIZARD_STEP.REVIEW ? 'Review' : kind ? KIND_INFO[kind].title : 'Ask a question';

  const leftAction = step === WIZARD_STEP.KIND
    ? { label: 'Cancel', onClick: onClose }
    : { label: 'Back', onClick: onBack };

  const rightAction = step === WIZARD_STEP.DETAILS
    ? { label: 'Continue', onClick: onContinue, disabled: !canContinue }
    : step === WIZARD_STEP.REVIEW
      ? { label: 'Add fact', onClick: onSubmit }
      : undefined;

  return (
    <BottomSheet isOpen={isOpen} title={title} leftAction={leftAction} rightAction={rightAction}>
      {locationError && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
          {locationError}
        </div>
      )}

      {step === WIZARD_STEP.KIND && (
        <div className="space-y-2">
          {(Object.keys(KIND_INFO) as WizardKind[]).map((k) => (
            <button
              key={k}
              onClick={() => onSelectKind(k)}
              className="w-full flex items-start gap-3 rounded-lg border border-white/10 p-3.5 text-left hover:border-white/30 hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              <span className="text-white/70 mt-0.5">{KIND_INFO[k].icon}</span>
              <span>
                <span className="block text-sm font-semibold text-white">{KIND_INFO[k].title}</span>
                <span className="block text-xs text-white/50">{KIND_INFO[k].blurb}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === WIZARD_STEP.DETAILS && kind === WIZARD_KIND.CIRCLE && (
        <div className="space-y-4">
          <PointField
            label="Center"
            helpText="Where should the circle be centered?"
            value={circleCenter}
            locating={locating}
            onPickOnMap={onPickCircleCenterOnMap}
            onUseMyLocation={onUseMyLocationForCircle}
          />
          <div>
            <div className="text-sm font-semibold text-white">How big?</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {RADIUS_CHOICES_M.map((m) => (
                <button key={m} onClick={() => onSetCircleRadius(m)} className={chipStyle(circleRadius === m)}>
                  {formatDistance(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === WIZARD_STEP.DETAILS && kind === WIZARD_KIND.ZONE && (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-white">Which zone?</div>
          {zoneOptionsLoading ? (
            <div className="text-xs text-white/50 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading zones…</div>
          ) : (
            <>
              <ZoneChipGroup
                label="City corporations"
                zones={zoneOptions.filter((z) => z.kind === REGION_KIND.CORPORATION)}
                selected={zoneKey}
                onSelect={onSelectZone}
              />
              <ZoneChipGroup
                label="Metro catchments"
                zones={zoneOptions.filter((z) => z.kind === REGION_KIND.METRO_CATCHMENT)}
                selected={zoneKey}
                onSelect={onSelectZone}
              />
            </>
          )}
        </div>
      )}

      {step === WIZARD_STEP.DETAILS && kind === WIZARD_KIND.HOTTER_COLDER && (
        <div className="space-y-4">
          <PointField
            label="Point A — where you started"
            helpText="The reference point to compare against."
            value={pointA}
            locating={locating}
            onPickOnMap={onPickPointAOnMap}
            onUseMyLocation={onUseMyLocationForPointA}
          />
          <PointField
            label="Point B — where you are now"
            helpText="Getting closer to this one is “hotter”."
            value={pointB}
            locating={locating}
            onPickOnMap={onPickPointBOnMap}
            onUseMyLocation={onUseMyLocationForPointB}
          />
        </div>
      )}

      {step === WIZARD_STEP.REVIEW && (
        <div className="space-y-4">
          <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
            {renderedQuestionPreview}
          </div>

          <div>
            <div className="text-sm font-semibold text-white mb-2">If the hider answers this…</div>
            <div className="flex gap-2">
              <button
                onClick={() => onSetAssumedValue(true)}
                className={`flex-1 h-11 rounded-full text-sm font-semibold border transition-colors ${
                  assumedValue ? 'bg-emerald-500 text-white border-emerald-500' : 'border-white/20 text-white/70 hover:border-white/40'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => onSetAssumedValue(false)}
                className={`flex-1 h-11 rounded-full text-sm font-semibold border transition-colors ${
                  !assumedValue ? 'bg-rose-500 text-white border-rose-500' : 'border-white/20 text-white/70 hover:border-white/40'
                }`}
              >
                No
              </button>
            </div>
          </div>

          <p className="text-xs text-white/50">
            The amber shape now on the map is a live preview of what stays possible if the hider answers “{assumedValue ? 'yes' : 'no'}”. It shows up as a draft fact — dashed, purple — once you add it, until the hider actually answers.
          </p>
        </div>
      )}
    </BottomSheet>
  );
};
