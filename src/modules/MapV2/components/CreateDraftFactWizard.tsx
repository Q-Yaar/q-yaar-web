import React from 'react';
import { Camera, Circle, Compass, LocateFixed, Loader2, MapPin, MapPinned, MessageSquare, Route, Ruler, Thermometer } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Answer, OP_TYPE, OpType, ResolvedLatLon } from '../factsV2/factTypes';
import { ANSWER_WORD, describeResolvedPoint, formatDistance, isTemplateSupported, pointSlotLabel, PlaceholderValues, PointValues } from '../factsV2/templateQuestionBuilder';
import { PolygonOverlayItemData, REGION_KIND } from '../factsV2/geometryAssets';
import { NonGeoQuestionTemplateDto, PlaceholderAllowedValue, PlaceholderSpec, QuestionTemplateDto, SlotBinding, SUBOP_CONTRACT } from '../factsV2/questionPipelineTypes';
import { BottomSheet } from './BottomSheet';

export const WIZARD_STEP = {
  KIND: 'kind',
  DETAILS: 'details',
  REVIEW: 'review',
} as const;

export type WizardStep = (typeof WIZARD_STEP)[keyof typeof WIZARD_STEP];

const RADIUS_CHOICES_M = [250, 500, 1000, 3000, 5000, 10000];

const OP_TYPE_ICON: Partial<Record<OpType, React.ReactNode>> = {
  [OP_TYPE.POINT_BUFFER_INSIDE]: <Circle className="w-5 h-5" />,
  [OP_TYPE.POLYGON_INSIDE]: <MapPinned className="w-5 h-5" />,
  [OP_TYPE.TWO_POINT_BISECTOR]: <Thermometer className="w-5 h-5" />,
  [OP_TYPE.POINT_POINT_BUFFER_INSIDE]: <Ruler className="w-5 h-5" />,
  [OP_TYPE.POINT_SPLIT]: <Compass className="w-5 h-5" />,
  [OP_TYPE.LINE_BUFFER_INSIDE]: <Route className="w-5 h-5" />,
  [OP_TYPE.LINE_POINT_BUFFER_INSIDE]: <Route className="w-5 h-5" />,
};

/** Per legacy category name, for the non-map section below — falls back to
 * a generic icon for a category this list hasn't seen yet. */
const NON_GEO_CATEGORY_ICON: Record<string, React.ReactNode> = {
  Photos: <Camera className="w-5 h-5" />,
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
    <div className="text-xs font-semibold text-white">{label}</div>
    <div className="text-[11px] text-white/40 mb-1.5">{helpText}</div>
    {value ? (
      <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-300">
        <span>✓ {describeResolvedPoint(value, 'Location set')}</span>
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
);

const chipStyle = (selected: boolean): string =>
  `px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
    selected ? 'bg-white text-neutral-900 border-white' : 'border-white/20 text-white/80 hover:border-white/40'
  }`;

interface ZoneChipGroupProps {
  label: string;
  zones: PolygonOverlayItemData[];
  selected: string | number | undefined;
  onSelect: (key: string) => void;
}

const ZoneChipGroup: React.FC<ZoneChipGroupProps> = ({ label, zones, selected, onSelect }) => {
  if (zones.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {zones.map((z) => (
          <button key={z.id} onClick={() => onSelect(z.id)} className={chipStyle(selected === z.id)}>
            {z.displayName}
          </button>
        ))}
      </div>
    </div>
  );
};

/** One block per PLACEHOLDER-bound slot — a zone picker for a POLYGON slot,
 * a distance picker for a LENGTH slot. The slot's own placeholder name is
 * the key into placeholderValues, same key resolveTemplateSlots reads. */
interface PlaceholderSlotFieldProps {
  slotName: string;
  binding: Extract<SlotBinding, { source: 'PLACEHOLDER' }>;
  slotKind: 'POINT' | 'LINE' | 'POLYGON' | 'LENGTH';
  /** This placeholder's own spec from the template — undefined only in the
   * brief window before the template detail call resolves (see
   * useDraftFactWizard's selectTemplate). */
  spec: PlaceholderSpec | undefined;
  placeholderValues: PlaceholderValues;
  onSetPlaceholderValue: (key: string, value: string | number) => void;
  zoneOptions: PolygonOverlayItemData[];
  zoneOptionsLoading: boolean;
}

const PlaceholderSlotField: React.FC<PlaceholderSlotFieldProps> = ({
  slotName, binding, slotKind, spec, placeholderValues, onSetPlaceholderValue, zoneOptions, zoneOptionsLoading,
}) => {
  const selected = placeholderValues[binding.placeholder];
  const allowedValues = spec?.allowed_values;

  if (slotKind === 'POLYGON') {
    // Only ever the zones this specific template allows — never the whole
    // catalog. allowedValues is undefined only until the template detail
    // call resolves (the list endpoint never carries it), in which case
    // every zone is shown briefly rather than none.
    const allowedKeys = allowedValues
      ?.filter((v): v is Extract<PlaceholderAllowedValue, { type: 'geometry' }> => v.type === 'geometry')
      .map((v) => v.value.key);
    const allowedZones = allowedKeys ? zoneOptions.filter((z) => allowedKeys.includes(z.id)) : zoneOptions;
    return (
      <div>
        <div className="text-xs font-semibold text-white mb-1.5">Which zone?</div>
        {zoneOptionsLoading || !allowedValues ? (
          <div className="text-[11px] text-white/40 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading zones…</div>
        ) : (
          <div className="space-y-2">
            <ZoneChipGroup
              label="City corporations"
              zones={allowedZones.filter((z) => z.kind === REGION_KIND.CORPORATION)}
              selected={selected}
              onSelect={(key) => onSetPlaceholderValue(binding.placeholder, key)}
            />
            <ZoneChipGroup
              label="Metro catchments"
              zones={allowedZones.filter((z) => z.kind === REGION_KIND.METRO_CATCHMENT)}
              selected={selected}
              onSelect={(key) => onSetPlaceholderValue(binding.placeholder, key)}
            />
          </div>
        )}
      </div>
    );
  }

  if (slotKind === 'LINE') {
    // Unlike POLYGON, a LINE placeholder's allowed_values are the only
    // source of options at all — there's no separate line catalog fetched
    // up front the way zoneOptions is for polygons, since each geometry
    // entry already carries everything needed to render it (key +
    // display_name) without a cross-reference.
    const lineOptions = allowedValues?.filter((v): v is Extract<PlaceholderAllowedValue, { type: 'geometry' }> => v.type === 'geometry');
    return (
      <div>
        <div className="text-xs font-semibold text-white mb-1.5">Which line?</div>
        {!allowedValues ? (
          <div className="text-[11px] text-white/40 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading lines…</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {lineOptions?.map((option) => (
              <button
                key={option.value.key}
                onClick={() => onSetPlaceholderValue(binding.placeholder, option.value.key ?? option.value.geometry_id)}
                className={chipStyle(selected === option.value.key)}
              >
                {option.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (slotKind === 'LENGTH') {
    // A template can curate its own distance options (allowed_values of
    // type 'number', e.g. the worked "100/200 metres" example) — fall back
    // to the fixed choice set only when it hasn't (every mock-converted
    // legacy template, which has no such curation of its own).
    const numberChoices = allowedValues?.filter((v): v is Extract<PlaceholderAllowedValue, { type: 'number' }> => v.type === 'number');
    const choices = numberChoices && numberChoices.length > 0
      ? numberChoices.map((v) => ({ value: v.value, label: v.display_name }))
      : RADIUS_CHOICES_M.map((m) => ({ value: m, label: formatDistance(m) }));
    return (
      <div>
        <div className="text-xs font-semibold text-white mb-1.5">How far?</div>
        <div className="flex flex-wrap gap-1.5">
          {choices.map((choice) => (
            <button key={choice.value} onClick={() => onSetPlaceholderValue(binding.placeholder, choice.value)} className={chipStyle(selected === choice.value)}>
              {choice.label}
            </button>
          ))}
        </div>
        {spec?.allow_free_text && (
          <input
            type="number"
            placeholder="Or type your own (metres)…"
            className="mt-1.5 w-full rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder:text-white/30"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw) onSetPlaceholderValue(binding.placeholder, Number(raw));
            }}
          />
        )}
      </div>
    );
  }

  // Every PLACEHOLDER-bound kind the wizard supports is handled above —
  // templates needing anything else are filtered out of the selectable
  // group in step 1 (see isTemplateSupported), so this shouldn't normally
  // render; kept as an honest fallback rather than silently blank.
  return <div key={slotName} className="text-[11px] text-amber-300">This question type isn’t supported yet.</div>;
};

interface AnswerChipsProps {
  answers: readonly Answer[];
  selected: string | number | undefined;
  onSelect: (value: string) => void;
}

const AnswerChips: React.FC<AnswerChipsProps> = ({ answers, selected, onSelect }) => (
  <div>
    <div className="text-xs font-semibold text-white mb-1.5">Which way?</div>
    <div className="flex flex-wrap gap-1.5">
      {answers.map((answer) => (
        <button key={answer} onClick={() => onSelect(answer)} className={chipStyle(selected === answer)}>
          {ANSWER_WORD[answer]}
        </button>
      ))}
    </div>
  </div>
);

export interface CreateDraftFactWizardProps {
  isOpen: boolean;
  onClose: () => void;
  step: WizardStep;

  templates: QuestionTemplateDto[];
  templatesLoading: boolean;
  /** Question types with no geo mechanism at all (Photos, ...) — listed
   * below the real (map-answerable) templates purely so askers can see
   * they exist too; always rendered disabled, same as an unsupported geo
   * template, since there's no flow behind them yet. */
  nonGeoTemplates: NonGeoQuestionTemplateDto[];
  nonGeoTemplatesLoading: boolean;
  selectedTemplate: QuestionTemplateDto | null;
  onSelectTemplate: (template: QuestionTemplateDto) => void;
  onBack: () => void;

  locating: boolean;
  locationError: string | null;

  points: PointValues;
  onPickPointOnMap: (slotName: string, label: string) => void;
  onUseMyLocationForSlot: (slotName: string) => void;

  placeholderValues: PlaceholderValues;
  onSetPlaceholderValue: (placeholderKey: string, value: string | number) => void;

  zoneOptions: PolygonOverlayItemData[];
  zoneOptionsLoading: boolean;

  renderedQuestionPreview: string | null;
  /** What the review step's live map preview assumes the hider will
   * answer — true assumes the asserted pole holds, false its opposite. */
  assumedValue: boolean;
  onSetAssumedValue: (value: boolean) => void;
  canContinue: boolean;
  onContinue: () => void;
  onSubmit: () => void;
  /** True while the ask-question API call from the last submit is
   * in flight. */
  submitting: boolean;
}

/**
 * The "Ask a question" wizard — step 1 lists every real question template
 * from apis/mockQnaApi.ts (map-answerable ones first), step 2 is a generic
 * form built entirely from the selected template's slot_bindings (one
 * block per slot, driven by each binding's source/kind — no per-category
 * branch), step 3 reviews the rendered question with a live map preview
 * and a Yes/No toggle for what the hider is assumed to answer. All state
 * lives in the parent (MapCanvas) so this component can be safely hidden
 * mid-flow while the user taps the map to place a point, then reopened
 * with nothing lost.
 *
 * Renders as a BottomSheet, not a centered modal: the map stays visible and
 * interactive above it while the question is being composed, only fully
 * stepping aside (isOpen goes false — see useDraftFactWizard's pickOnMap)
 * for the moment a point is actually being tapped in.
 */
export const CreateDraftFactWizard: React.FC<CreateDraftFactWizardProps> = (props) => {
  const {
    isOpen, onClose, step,
    templates, templatesLoading, nonGeoTemplates, nonGeoTemplatesLoading, selectedTemplate, onSelectTemplate, onBack,
    locating, locationError,
    points, onPickPointOnMap, onUseMyLocationForSlot,
    placeholderValues, onSetPlaceholderValue,
    zoneOptions, zoneOptionsLoading,
    renderedQuestionPreview, assumedValue, onSetAssumedValue, canContinue, onContinue, onSubmit, submitting,
  } = props;

  const title = step === WIZARD_STEP.KIND
    ? 'Ask a question'
    : step === WIZARD_STEP.REVIEW
      ? 'Review'
      : selectedTemplate?.category.category_name ?? 'Ask a question';

  const leftAction = step === WIZARD_STEP.KIND
    ? { label: 'Cancel', onClick: onClose }
    : { label: 'Back', onClick: onBack, disabled: submitting };

  const rightAction = step === WIZARD_STEP.DETAILS
    ? { label: 'Continue', onClick: onContinue, disabled: !canContinue }
    : step === WIZARD_STEP.REVIEW
      ? { label: submitting ? 'Asking…' : 'Ask question', onClick: onSubmit, disabled: submitting }
      : undefined;

  const supportedTemplates = templates.filter((t) => isTemplateSupported(t));
  const otherTemplates = templates.filter((t) => !isTemplateSupported(t));

  return (
    <BottomSheet isOpen={isOpen} title={title} leftAction={leftAction} rightAction={rightAction}>
      {locationError && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-[11px] text-red-300">
          {locationError}
        </div>
      )}

      {step === WIZARD_STEP.KIND && (
        <div className="space-y-3">
          {templatesLoading ? (
            <div className="text-[11px] text-white/40 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading questions…</div>
          ) : (
            <>
              <TemplateList templates={supportedTemplates} onSelect={onSelectTemplate} />
              {otherTemplates.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-1.5">Other</div>
                  <TemplateList templates={otherTemplates} onSelect={onSelectTemplate} disabled />
                </div>
              )}
              {!nonGeoTemplatesLoading && nonGeoTemplates.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                  <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-1.5">Non-map questions</div>
                  <NonGeoTemplateList templates={nonGeoTemplates} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === WIZARD_STEP.DETAILS && selectedTemplate && (
        <div className="space-y-3">
          {Object.entries(selectedTemplate.slot_bindings).map(([slotName, binding]) => {
            if (binding.source === 'TEMPLATE_CONSTANT') return null;

            if (binding.source === 'ASKER_LOCATION' || binding.source === 'MAP_POINT') {
              const label = pointSlotLabel(slotName, binding);
              return (
                <PointField
                  key={slotName}
                  label={label}
                  helpText={binding.source === 'ASKER_LOCATION' ? 'Resolved from your device automatically.' : `Where is ${label.toLowerCase()}?`}
                  value={points[slotName] ?? null}
                  locating={locating}
                  onPickOnMap={() => onPickPointOnMap(slotName, label)}
                  onUseMyLocation={() => onUseMyLocationForSlot(slotName)}
                />
              );
            }

            const slotKind = SUBOP_CONTRACT[selectedTemplate.answer_instruction_type].slots[slotName];
            return (
              <PlaceholderSlotField
                key={slotName}
                slotName={slotName}
                binding={binding}
                slotKind={slotKind}
                spec={selectedTemplate.placeholders[binding.placeholder]}
                placeholderValues={placeholderValues}
                onSetPlaceholderValue={onSetPlaceholderValue}
                zoneOptions={zoneOptions}
                zoneOptionsLoading={zoneOptionsLoading}
              />
            );
          })}

          {(() => {
            const { asserted_answer: assertedAnswer } = selectedTemplate;
            if (assertedAnswer.source !== 'PLACEHOLDER') return null;
            // A template can curate which of the op_type's legal answers it
            // actually offers (e.g. only N/S, not the full compass) via the
            // same placeholder's allowed_values — fall back to every legal
            // answer for the op_type when it hasn't.
            const curated = selectedTemplate.placeholders[assertedAnswer.placeholder]?.allowed_values
              ?.filter((v): v is Extract<PlaceholderAllowedValue, { type: 'text' }> => v.type === 'text')
              .map((v) => v.value as Answer);
            return (
              <AnswerChips
                answers={curated && curated.length > 0 ? curated : SUBOP_CONTRACT[selectedTemplate.answer_instruction_type].answers}
                selected={placeholderValues[assertedAnswer.placeholder]}
                onSelect={(value) => onSetPlaceholderValue(assertedAnswer.placeholder, value)}
              />
            );
          })()}
        </div>
      )}

      {step === WIZARD_STEP.REVIEW && (
        <div className="space-y-3">
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
            {renderedQuestionPreview}
          </div>

          <div>
            <div className="text-xs font-semibold text-white mb-1.5">If the hider answers this…</div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onSetAssumedValue(true)}
                className={`flex-1 h-9 rounded-full text-xs font-semibold border transition-colors ${
                  assumedValue ? 'bg-emerald-500 text-white border-emerald-500' : 'border-white/20 text-white/70 hover:border-white/40'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => onSetAssumedValue(false)}
                className={`flex-1 h-9 rounded-full text-xs font-semibold border transition-colors ${
                  !assumedValue ? 'bg-rose-500 text-white border-rose-500' : 'border-white/20 text-white/70 hover:border-white/40'
                }`}
              >
                No
              </button>
            </div>
          </div>

          <p className="text-[11px] text-white/40">
            The amber shape on the map previews what stays possible if the hider answers “{assumedValue ? 'yes' : 'no'}”. Asking sends this to the hider now and saves it as a dashed draft fact until they actually answer.
          </p>
        </div>
      )}
    </BottomSheet>
  );
};

interface TemplateListProps {
  templates: QuestionTemplateDto[];
  onSelect: (template: QuestionTemplateDto) => void;
  disabled?: boolean;
}

const TemplateList: React.FC<TemplateListProps> = ({ templates, onSelect, disabled }) => {
  if (templates.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {templates.map((template) => (
        <button
          key={template.question_template_id}
          onClick={() => !disabled && onSelect(template)}
          disabled={disabled}
          className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
            disabled
              ? 'border-white/5 opacity-40 cursor-not-allowed'
              : 'border-white/10 hover:border-white/30 hover:bg-white/5 active:bg-white/10'
          }`}
        >
          <span className="text-white/60">{OP_TYPE_ICON[template.answer_instruction_type] ?? <MapPinned className="w-5 h-5" />}</span>
          <span>
            <span className="block text-xs font-semibold text-white">{template.template}</span>
            <span className="block text-[11px] text-white/40">{template.category.category_name}{disabled ? ' — not yet supported' : ''}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

interface NonGeoTemplateListProps {
  templates: NonGeoQuestionTemplateDto[];
}

/** The "Non-map questions" section — question types with no geo mechanism
 * at all (Photos, ...), always disabled since there's no flow behind them
 * yet. A separate component from TemplateList because
 * NonGeoQuestionTemplateDto has no answer_instruction_type to pick an icon
 * from. */
const NonGeoTemplateList: React.FC<NonGeoTemplateListProps> = ({ templates }) => (
  <div className="space-y-1.5">
    {templates.map((template) => (
      <button
        key={template.question_template_id}
        disabled
        className="w-full flex items-center gap-2.5 rounded-lg border border-white/5 px-3 py-2.5 text-left opacity-40 cursor-not-allowed"
      >
        <span className="text-white/60">{NON_GEO_CATEGORY_ICON[template.category.category_name] ?? <MessageSquare className="w-5 h-5" />}</span>
        <span>
          <span className="block text-xs font-semibold text-white">{template.template}</span>
          <span className="block text-[11px] text-white/40">{template.category.category_name} — not yet supported</span>
        </span>
      </button>
    ))}
  </div>
);
