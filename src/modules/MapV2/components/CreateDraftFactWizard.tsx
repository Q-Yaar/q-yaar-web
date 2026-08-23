import React from 'react';
import { Circle, Thermometer, MapPinned, LocateFixed, MapPin, ArrowLeft, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { ResolvedLatLon } from '../factsV2/factTypes';
import { describeResolvedPoint, formatDistance, WIZARD_KIND, WizardKind } from '../factsV2/buildDraftQuestion';
import { PolygonOverlayItemData, REGION_KIND } from '../factsV2/geometryAssets';

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
      <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
        <span>✓ {describeResolvedPoint(value)}</span>
        <button className="text-xs underline text-emerald-300" onClick={onPickOnMap}>change</button>
      </div>
    ) : (
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onUseMyLocation} disabled={locating} className="flex-1">
          {locating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LocateFixed className="w-4 h-4 mr-1" />}
          Use my location
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onPickOnMap} className="flex-1">
          <MapPin className="w-4 h-4 mr-1" />
          Tap the map
        </Button>
      </div>
    )}
  </div>
);

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
 */
export const CreateDraftFactWizard: React.FC<CreateDraftFactWizardProps> = (props) => {
  const {
    isOpen, onClose, step, kind, onSelectKind, onBack,
    locating, locationError,
    circleCenter, circleRadius, onPickCircleCenterOnMap, onUseMyLocationForCircle, onSetCircleRadius,
    zoneOptions, zoneOptionsLoading, zoneKey, onSelectZone,
    pointA, pointB, onPickPointAOnMap, onUseMyLocationForPointA, onPickPointBOnMap, onUseMyLocationForPointB,
    renderedQuestionPreview, canContinue, onContinue, onSubmit,
  } = props;

  const title = step === WIZARD_STEP.KIND ? 'Ask a question' : step === WIZARD_STEP.REVIEW ? 'Review your question' : kind ? KIND_INFO[kind].title : 'Ask a question';

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="dark max-w-md bg-neutral-900 border border-white/10 text-white">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>

      {step !== WIZARD_STEP.KIND && (
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 mb-3 -mt-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      )}

      {locationError && (
        <div className="mb-3 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
          {locationError}
        </div>
      )}

      {step === WIZARD_STEP.KIND && (
        <div className="space-y-2">
          {(Object.keys(KIND_INFO) as WizardKind[]).map((k) => (
            <button
              key={k}
              onClick={() => onSelectKind(k)}
              className="w-full flex items-start gap-3 rounded-lg border border-white/10 p-3 text-left hover:border-white/30 hover:bg-white/5 transition-colors"
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
                <button
                  key={m}
                  onClick={() => onSetCircleRadius(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    circleRadius === m ? 'bg-white text-neutral-900 border-white' : 'border-white/20 text-white/80 hover:border-white/40'
                  }`}
                >
                  {formatDistance(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === WIZARD_STEP.DETAILS && kind === WIZARD_KIND.ZONE && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-white">Which zone?</div>
          {zoneOptionsLoading ? (
            <div className="text-xs text-white/50 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading zones…</div>
          ) : (
            <select
              value={zoneKey ?? ''}
              onChange={(e) => onSelectZone(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              <option value="" disabled>Choose a zone…</option>
              <optgroup label="City corporations">
                {zoneOptions.filter((z) => z.kind === REGION_KIND.CORPORATION).map((z) => (
                  <option key={z.id} value={z.id}>{z.displayName}</option>
                ))}
              </optgroup>
              <optgroup label="Metro catchments">
                {zoneOptions.filter((z) => z.kind === REGION_KIND.METRO_CATCHMENT).map((z) => (
                  <option key={z.id} value={z.id}>{z.displayName}</option>
                ))}
              </optgroup>
            </select>
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

      {step === WIZARD_STEP.DETAILS && (
        <Button className="w-full mt-5" disabled={!canContinue} onClick={onContinue}>
          Continue
        </Button>
      )}

      {step === WIZARD_STEP.REVIEW && (
        <div className="space-y-4">
          <div className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
            {renderedQuestionPreview}
          </div>
          <p className="text-xs text-white/50">
            This will show up as a draft fact on the map — dashed, until the hider actually answers it.
          </p>
          <Button className="w-full" onClick={onSubmit}>Add as draft fact</Button>
        </div>
      )}
    </Modal>
  );
};
