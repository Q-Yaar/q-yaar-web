import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import { AskedQuestionDto, FACT_TYPE, FactDto, POINT_SOURCE, ResolvedLatLon } from './factTypes';
import {
  buildAskedQuestion,
  buildRenderedQuestion,
  firstAskerLocationSlot,
  isTemplateComplete,
  PlaceholderValues,
  PointValues,
  pointSlotLabel,
  pointSlotNames,
  resolvePlaceholders,
} from './templateQuestionBuilder';
import { resolveCurrentLocation } from '../utils/geolocation';
import { PolygonOverlayItemData } from './geometryAssets';
import { draftQuestionToFact } from './draftFactConverter';
import { foldFactsAreaInWorker } from './geoWorkerClient';
import { GROUP_ID } from '../layers/groupIds';
import { useMapLayerModule } from '../layers/hooks';
import { FactItem, FactsLayerModule } from '../layers/modules/FactsLayerModule';
import { PointDistanceItem } from '../layers/modules/PointsDistanceModule';
import { WizardPointItem, WizardPointsModule } from '../layers/modules/WizardPointsModule';
import { WizardShapeItem, WizardShapePreviewModule } from '../layers/modules/WizardShapePreviewModule';
import { WIZARD_PREVIEW_MODULE_ID } from './factsLayerIds';
import { useGetNonGeoQuestionTemplatesQuery, useGetQuestionTemplateDetail, useGetQuestionTemplatesQuery } from '../apis/qnaPipelineApi';
import { useAskQuestionMutation } from '../../../apis/qnaApi';
import { useCreateFactMutation } from '../../../apis/api';
import { QuestionTemplateDto } from './questionPipelineTypes';
import { CreateDraftFactWizardProps, WIZARD_STEP, WizardStep } from '../components/CreateDraftFactWizard';

const toMapPoint = (coordinates: [number, number]): ResolvedLatLon => ({
  lon: String(coordinates[0]),
  lat: String(coordinates[1]),
  source: POINT_SOURCE.MAP_POINT,
  picked_at: new Date().toISOString(),
});

const toCoordinates = (p: ResolvedLatLon): [number, number] => [Number(p.lon), Number(p.lat)];

const newQuestionId = (): string => `q-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export interface UseDraftFactWizardOptions {
  /** Threaded through to the real askQuestion call — see handleSubmit. */
  gameId: string | undefined;
  /** The team this question is being asked of — MapCanvas's teamFilter
   * already resolves this (the *opposite* team in Seeking mode); handed
   * straight to the real askQuestion call's target_team_id. */
  targetTeamId: string | undefined | null;
  zoneOptions: PolygonOverlayItemData[];
  zoneOptionsLoading: boolean;
  /** Same starting area a real draft would fold on top of once added (see
   * useFactsLayers's draftsUniverse) — the live review-step preview folds
   * from here too, so it shows the same shape the draft will actually have. */
  previewUniverse: () => Feature<Polygon | MultiPolygon>;
  /** The raw game zone, unreduced by any fact — what the details step's
   * shape preview is bounded to instead of previewUniverse, since at that
   * point the question isn't asking "what stays possible," just "what does
   * this shape look like." */
  playArea: Feature<Polygon | MultiPolygon>;
  /** Owned by MapCanvas (not created here) so useMapInteractions can be
   * wired up — and its Measurement module registered/mounted — *before*
   * this hook runs, without a circular data dependency between the two.
   * MapLibre draws later-mounted layers on top, and the wizard's own
   * preview/points should always be the topmost thing on the map, never
   * obscured by the measurement tool's crosshair/rings/points. */
  pickResolverRef: React.RefObject<((coordinates: [number, number]) => void) | null>;
  onSubmit: (question: AskedQuestionDto) => void;
}

export interface UseDraftFactWizardResult {
  /** Spread directly onto <CreateDraftFactWizard>. */
  props: CreateDraftFactWizardProps;
  /** Opens the wizard, optionally seeded from the Points & Distance tool's
   * currently-placed points — used once a template is picked to seed that
   * template's point slots positionally, so measuring first and asking
   * about the same spot doesn't mean picking it all over again. */
  openWizard: (measurementPoints?: PointDistanceItem[]) => void;
  /** For the pick-prompt banner: the prompt text (null when no pick is
   * pending) and its cancel button. */
  pickPrompt: string | null;
  cancelPick: () => void;
}

/**
 * The whole "Ask a question" wizard as one hook: fetching real question
 * templates (apis/qnaPipelineApi.ts), every piece of the generic slot-filling
 * form state, the map-pick handshake (hide the wizard, wait for a click,
 * refill the field, reopen), a live on-map preview of the shape while
 * composing and reviewing it, and the final submit — which calls the real
 * askQuestion mutation (src/apis/qnaApi.ts) before handing the resulting
 * AskedQuestionDto to onSubmit. MapCanvas only needs to render
 * <CreateDraftFactWizard {...wizard.props}> and wire the pick-prompt
 * banner — pickResolverRef itself is MapCanvas's (see that option's doc)
 * and already shared with useMapInteractions.
 */
export function useDraftFactWizard({ gameId, targetTeamId, zoneOptions, zoneOptionsLoading, previewUniverse, playArea, pickResolverRef, onSubmit }: UseDraftFactWizardOptions): UseDraftFactWizardResult {
  const { data: templates, isLoading: templatesLoading } = useGetQuestionTemplatesQuery();
  const { data: nonGeoTemplates, isLoading: nonGeoTemplatesLoading } = useGetNonGeoQuestionTemplatesQuery();
  const [askQuestion, { isLoading: submitting }] = useAskQuestionMutation();
  const [createFact, { isLoading: addingFact }] = useCreateFactMutation();
  const [getTemplateDetail] = useGetQuestionTemplateDetail();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(WIZARD_STEP.KIND);
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionTemplateDto | null>(null);
  const [points, setPoints] = useState<PointValues>({});
  const [placeholderValues, setPlaceholderValues] = useState<PlaceholderValues>({});
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // What the review step assumes the hider will answer — true (the default)
  // assumes the asserted pole holds, false previews the opposite instead.
  const [assumedValue, setAssumedValue] = useState(true);

  // A map-pick in progress: the prompt shown in the banner. pickResolverRef
  // itself is passed in (see UseDraftFactWizardOptions) — the next map
  // click feeds into it.
  const [pickPrompt, setPickPrompt] = useState<string | null>(null);
  // Whatever Points & Distance had placed when the wizard was opened —
  // read once a template is picked (see selectTemplate), not at open time,
  // since which slots exist isn't known until then.
  const measurementPointsRef = useRef<PointDistanceItem[]>([]);

  const resetForm = useCallback(() => {
    setStep(WIZARD_STEP.KIND);
    setSelectedTemplate(null);
    setPoints({});
    setPlaceholderValues({});
    setLocationError(null);
    setAssumedValue(true);
  }, []);

  const openWizard = useCallback((measurementPoints: PointDistanceItem[] = []) => {
    resetForm();
    measurementPointsRef.current = measurementPoints;
    setIsOpen(true);
  }, [resetForm]);

  const closeWizard = useCallback(() => {
    setIsOpen(false);
    setPickPrompt(null);
    pickResolverRef.current = null;
    resetForm();
  }, [resetForm, pickResolverRef]);

  /** Hides the wizard, arms the next map click to resolve `onResolved`, and
   * reopens the wizard once it fires. Cancelling (via the banner) just
   * reopens the wizard with nothing changed. */
  const pickOnMap = useCallback((prompt: string, onResolved: (p: ResolvedLatLon) => void) => {
    setIsOpen(false);
    setPickPrompt(prompt);
    pickResolverRef.current = (coordinates) => {
      setPickPrompt(null);
      pickResolverRef.current = null;
      onResolved(toMapPoint(coordinates));
      setIsOpen(true);
    };
  }, [pickResolverRef]);

  const cancelPick = useCallback(() => {
    setPickPrompt(null);
    pickResolverRef.current = null;
    setIsOpen(true);
  }, [pickResolverRef]);

  const locateMeFor = useCallback((onResolved: (p: ResolvedLatLon) => void) => {
    setLocating(true);
    setLocationError(null);
    resolveCurrentLocation()
      .then(onResolved)
      .catch((err: Error) => setLocationError(err.message || 'Could not get your location.'))
      .finally(() => setLocating(false));
  }, []);

  const setPointForSlot = useCallback((slotName: string, point: ResolvedLatLon) => {
    setPoints((prev) => ({ ...prev, [slotName]: point }));
  }, []);

  /** Picking a template moves straight to details, seeded from whatever
   * the Points & Distance tool already had placed (positionally, one point
   * per point-slot) — or, failing that, an automatic device fix for the
   * first ASKER_LOCATION-bound slot, since "device GPS, automatically" is
   * exactly what that binding means. Also fetches the template's detail —
   * the list endpoint's own allowed_values may be less complete than the
   * per-template detail endpoint's — so a polygon picker starts against
   * the list-sourced template (all slots except the zone list itself
   * already usable) and swaps to the enriched one the moment the detail
   * call resolves, scoping the zone picker to exactly what this template
   * allows instead of every zone that exists. */
  const selectTemplate = useCallback((template: QuestionTemplateDto) => {
    setSelectedTemplate(template);
    setPlaceholderValues({});
    setLocationError(null);

    const slotNames = pointSlotNames(template);
    const measured = measurementPointsRef.current;
    if (measured.length > 0 && slotNames.length > 0) {
      const seeded: PointValues = {};
      slotNames.forEach((slotName, i) => {
        if (measured[i]) seeded[slotName] = toMapPoint(measured[i].coordinates);
      });
      setPoints(seeded);
    } else {
      setPoints({});
      const autoSlot = firstAskerLocationSlot(template);
      if (autoSlot) locateMeFor((p) => setPointForSlot(autoSlot, p));
    }

    getTemplateDetail(template.category.category_id, template.question_template_id).then((detail) => {
      if (detail) setSelectedTemplate((current) => (current?.question_template_id === detail.question_template_id ? detail : current));
    });

    setStep(WIZARD_STEP.DETAILS);
  }, [locateMeFor, setPointForSlot, getTemplateDetail]);

  const canContinue = selectedTemplate ? isTemplateComplete(selectedTemplate, points, placeholderValues) : false;

  const renderedQuestionPreview = useMemo(() => {
    if (!selectedTemplate || !canContinue) return null;
    return buildRenderedQuestion(selectedTemplate, points, placeholderValues);
  }, [selectedTemplate, points, placeholderValues, canContinue]);

  const handleSubmit = useCallback(() => {
    if (!selectedTemplate || !gameId || !targetTeamId) return;
    const question = buildAskedQuestion(selectedTemplate, points, placeholderValues, assumedValue, newQuestionId());
    if (!question) return;

    askQuestion({
      gameId,
      questionId: selectedTemplate.question_template_id,
      body: {
        target_team_id: targetTeamId,
        question_meta: {
          answer_instruction_type: question.answer_instruction_type,
          asserted_answer: question.question_meta.asserted_answer,
          resolved_slots: question.question_meta.resolved_slots,
          resolved_placeholders: resolvePlaceholders(selectedTemplate, placeholderValues),
        },
      },
    })
      .unwrap()
      .then((asked) => {
        // Prefer the server-minted question_id over the locally-generated
        // placeholder so this draft's ID matches what the answer flow will
        // later see from fetchAskedQuestions.
        onSubmit(asked.question_id ? { ...question, question_id: asked.question_id } : question);
        closeWizard();
      })
      .catch((err) => {
        console.warn('[MapV2] Ask-question call failed', err);
      });
  }, [selectedTemplate, points, placeholderValues, assumedValue, gameId, targetTeamId, askQuestion, onSubmit, closeWizard]);

  // Secondary review-step action — skips asking the hider entirely and
  // records the asserted pole (at whatever Yes/No the preview toggle is
  // set to) straight into a real, confirmed fact via the same createFact
  // call useAcceptAnswersFlow.ts's Accept step uses. Belongs to the same
  // team the question would otherwise have been asked of, so it shows up
  // through useFactsLayers's own real refetch exactly like an accepted
  // answer would — no local fact-state juggling needed here either.
  const handleAddAsFact = useCallback(() => {
    if (!selectedTemplate || !gameId || !targetTeamId) return;
    const question = buildAskedQuestion(selectedTemplate, points, placeholderValues, assumedValue, newQuestionId());
    if (!question) return;

    createFact({
      game_id: gameId,
      team_id: targetTeamId,
      fact_type: FACT_TYPE.GEO,
      fact_info: {
        op_type: question.answer_instruction_type,
        op_meta: { ...question.question_meta.resolved_slots, assertedAnswer: question.question_meta.asserted_answer, value: assumedValue },
      },
    })
      .unwrap()
      .then(() => {
        closeWizard();
      })
      .catch((err) => {
        console.warn('[MapV2] Add-as-fact call failed', err);
      });
  }, [selectedTemplate, points, placeholderValues, assumedValue, gameId, targetTeamId, createFact, closeWizard]);

  // Live "what would this look like" preview — only while reviewing, so the
  // shape the user is about to commit to shows on the map before they add
  // it, reacting instantly to the Yes/No toggle.
  const previewFact = useMemo<FactDto | null>(() => {
    if (step !== WIZARD_STEP.REVIEW || !selectedTemplate) return null;
    const question = buildAskedQuestion(selectedTemplate, points, placeholderValues, assumedValue, 'wizard-review-preview');
    return question ? draftQuestionToFact(question) : null;
  }, [step, selectedTemplate, points, placeholderValues, assumedValue]);

  const [previewModule] = useState(() => new FactsLayerModule(
    { id: WIZARD_PREVIEW_MODULE_ID, groupId: GROUP_ID.FACTS, label: 'Question preview', fillColor: '#FFC043', fillOpacity: 0.3, dashed: true },
    previewUniverse,
  ));
  const previewItems = useMemo<FactItem[]>(
    () => (previewFact ? [{ id: previewFact.fact_id, fact: previewFact }] : []),
    [previewFact],
  );
  useMapLayerModule(previewModule, previewItems);

  // Details-step shape preview — the raw region a fact would describe
  // (assuming its asserted pole holds; there's no yes/no toggle yet at this
  // step), bounded only by the play area, not by other facts. Shows the
  // instant enough fields exist to compute it (canContinue), e.g. a full
  // circle the moment a distance chip is tapped, or a zone's own boundary
  // the moment it's picked — distinct from the review step's amber
  // possible-area preview above, which folds against previewUniverse
  // instead.
  const detailsShapeFact = useMemo<FactDto | null>(() => {
    if (step !== WIZARD_STEP.DETAILS || !selectedTemplate || !canContinue) return null;
    const question = buildAskedQuestion(selectedTemplate, points, placeholderValues, true, 'wizard-shape-preview');
    return question ? draftQuestionToFact(question) : null;
  }, [step, selectedTemplate, canContinue, points, placeholderValues]);

  const [shapeModule] = useState(() => new WizardShapePreviewModule({ id: 'wizard-shape-preview', label: 'Question shape preview', color: '#22D3EE' }));
  const [detailsShapeArea, setDetailsShapeArea] = useState<Feature<Polygon | MultiPolygon> | null>(null);
  const shapeGenerationRef = useRef(0);
  useEffect(() => {
    if (!detailsShapeFact) {
      setDetailsShapeArea(null);
      return;
    }
    const generation = ++shapeGenerationRef.current;
    foldFactsAreaInWorker(playArea, [detailsShapeFact])
      .then((area) => {
        if (generation !== shapeGenerationRef.current) return;
        setDetailsShapeArea(area);
      })
      .catch((err) => {
        console.warn('[MapV2] Failed to compute wizard shape preview', err);
      });
  }, [detailsShapeFact, playArea]);
  const shapeItems = useMemo<WizardShapeItem[]>(
    () => (detailsShapeArea ? [{ id: 'shape', geometry: detailsShapeArea.geometry }] : []),
    [detailsShapeArea],
  );
  useMapLayerModule(shapeModule, shapeItems);

  // Marks every point slot the current template uses, live as soon as
  // each is resolved (not only once the shaded preview exists on review) —
  // "where is the point I just captured" is useful feedback while still
  // composing, not just at the end.
  const [pointsModule] = useState(() => new WizardPointsModule());
  const wizardPointItems = useMemo<WizardPointItem[]>(() => {
    if (!selectedTemplate) return [];
    return pointSlotNames(selectedTemplate)
      .filter((slotName) => points[slotName])
      .map((slotName) => ({
        id: slotName,
        coordinates: toCoordinates(points[slotName]),
        label: pointSlotLabel(slotName, selectedTemplate.slot_bindings[slotName]),
      }));
  }, [selectedTemplate, points]);
  useMapLayerModule(pointsModule, wizardPointItems);

  const props: CreateDraftFactWizardProps = {
    isOpen,
    onClose: closeWizard,
    step,
    templates: templates ?? [],
    templatesLoading,
    nonGeoTemplates: nonGeoTemplates ?? [],
    nonGeoTemplatesLoading,
    selectedTemplate,
    onSelectTemplate: selectTemplate,
    onBack: () => setStep(step === WIZARD_STEP.REVIEW ? WIZARD_STEP.DETAILS : WIZARD_STEP.KIND),
    locating,
    locationError,
    points,
    onPickPointOnMap: (slotName, label) => pickOnMap(`Tap the map for ${label}`, (p) => setPointForSlot(slotName, p)),
    onUseMyLocationForSlot: (slotName) => locateMeFor((p) => setPointForSlot(slotName, p)),
    placeholderValues,
    onSetPlaceholderValue: (key, value) => setPlaceholderValues((prev) => ({ ...prev, [key]: value })),
    zoneOptions,
    zoneOptionsLoading,
    renderedQuestionPreview,
    assumedValue,
    onSetAssumedValue: setAssumedValue,
    canContinue,
    onContinue: () => setStep(WIZARD_STEP.REVIEW),
    onSubmit: handleSubmit,
    submitting,
    onAddAsFact: handleAddAsFact,
    addingFact,
  };

  return { props, openWizard, pickPrompt, cancelPick };
}
