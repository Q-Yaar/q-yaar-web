import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import { useGetFactsQuery } from '../../../apis/api';
import { useLayerTree, useMapLayerModule, EMPTY_ITEMS } from '../layers/hooks';
import { GROUP_ID } from '../layers/groupIds';
import { FactItem, FactsLayerModule } from '../layers/modules/FactsLayerModule';
import { PlayAreaResult } from './geometryAssets';
import { AskedQuestionDto, FactDto } from './factTypes';
import { foldFactsAreaInWorker } from './geoWorkerClient';
import { draftQuestionToFact } from './mockData';
import { convertLegacyFact } from './legacyFactConverter';
import { fromFactV2 } from './factV2Converter';
import { FACTS_MODULE_ID, DRAFT_FACTS_MODULE_ID } from './factsLayerIds';

export interface UseFactsLayersOptions {
  gameId?: string;
  teamId: string | null;
  playAreaState: PlayAreaResult;
  /** Facts resolved locally this session that the real /facts/ endpoint
   * doesn't know about yet — currently just the Hider's Answer Questions
   * flow (useAnswerQuestionsFlow.ts), so a just-answered question shows up
   * as a real (non-dashed) fact immediately instead of waiting on a refetch
   * the mock backend will never actually push. Folded in alongside
   * realFacts, same as any other confirmed fact. */
  extraFacts?: FactDto[];
}

export interface UseFactsLayersResult {
  factsModule: FactsLayerModule;
  draftFactsModule: FactsLayerModule;
  /** Confirmed facts loaded for the selected team — for the map's FactsChip. */
  factsCount: number;
  draftQuestions: AskedQuestionDto[];
  addDraftQuestion: (q: AskedQuestionDto) => void;
  removeDraftQuestion: (questionId: string) => void;
  /** Wherever Draft Facts currently fold on top of — i.e. the confirmed
   * area, minus visible confirmed facts. Exposed so the wizard's own live
   * preview module folds from the exact same starting point a real draft
   * would once added, instead of drifting from the raw play area. */
  draftsUniverse: () => Feature<Polygon | MultiPolygon>;
}

/**
 * Owns the whole "Facts" and "Draft Facts" capability: fetching this
 * team's real facts (through the TEMPORARY legacyFactConverter — see that
 * file), the cumulative-reduction fold each starts from (game zone ->
 * confirmed facts -> drafts, run in geoWorker.ts off the main thread), and
 * the two FactsLayerModule instances themselves. Nothing outside this hook
 * needs to know any of that; it just needs the two module instances (for
 * map click hit-testing) and the draft-question list (for the wizard/UI).
 */
export function useFactsLayers({ gameId, teamId, playAreaState, extraFacts = [] }: UseFactsLayersOptions): UseFactsLayersResult {
  const { data: factsResponse } = useGetFactsQuery(
    { game_id: gameId ?? '', team_id: teamId ?? undefined },
    { skip: !gameId || !teamId },
  );
  const realFacts = useMemo(
    () => [
      ...(factsResponse?.results ?? [])
        .map((raw) => fromFactV2(raw) ?? convertLegacyFact(raw))
        .filter((f): f is FactDto => f !== null),
      ...extraFacts,
    ],
    [factsResponse, extraFacts],
  );

  const playAreaRef = useRef(playAreaState.playArea);
  playAreaRef.current = playAreaState.playArea;
  const universe = useMemo(() => () => playAreaRef.current, []);

  // Draft Facts fold on top of whatever the Facts layer currently leaves
  // possible — but only whatever it's *effectively showing*: a fact hidden
  // via the Facts group toggle, the Facts module toggle, or that one fact's
  // own item checkbox must not still shrink the drafts' starting area.
  const { tree } = useLayerTree();
  const visibleConfirmedFacts = useMemo(() => {
    const factsGroup = tree.groups.find((g) => g.id === GROUP_ID.FACTS);
    const factsModuleNode = factsGroup?.modules.find((m) => m.id === FACTS_MODULE_ID);
    if (!factsGroup?.visible || !factsModuleNode?.visible) return [];
    const visibleIds = new Set(factsModuleNode.items.filter((i) => i.visible).map((i) => i.id));
    return realFacts.filter((fact) => visibleIds.has(fact.fact_id));
  }, [tree, realFacts]);

  // Facts start from the game zone and fold each confirmed fact in,
  // shrinking the "possible" area; Draft Facts start from wherever that
  // leaves off and shrink it further — the cumulative-reduction chain the
  // shading represents. Populated by the fold effect below (run in
  // geoWorker.ts, since folding real registry polygons can be expensive);
  // draftsUniverse just reads whatever it currently holds.
  const confirmedAreaRef = useRef(playAreaState.playArea);
  const draftsUniverse = useMemo(() => () => confirmedAreaRef.current, []);

  const [factsModule] = useState(() => new FactsLayerModule(
    { id: FACTS_MODULE_ID, groupId: GROUP_ID.FACTS, label: 'Facts', fillColor: '#d32f2f', fillOpacity: 0.35 },
    universe,
  ));
  const [draftFactsModule] = useState(() => new FactsLayerModule(
    { id: DRAFT_FACTS_MODULE_ID, groupId: GROUP_ID.FACTS, label: 'Draft Facts', fillColor: '#9c27b0', fillOpacity: 0.28, dashed: true },
    draftsUniverse,
  ));

  // Runs the confirmed-facts fold in the worker whenever what's visible
  // actually changes. foldFactsAreaInWorker lazily resolves+hydrates
  // whatever registry keys these facts reference before folding (see
  // geoWorkerClient.ts) — there's no separate "registries loaded" gate any
  // more. A generation counter discards a stale result if
  // `visibleConfirmedFacts` changes again before a slower fold finishes;
  // draftFactsModule.render() re-reads draftsUniverse (this same ref)
  // itself, since nothing else would tell it the fold moved.
  const foldGenerationRef = useRef(0);
  useEffect(() => {
    if (playAreaState.loading) return;
    const generation = ++foldGenerationRef.current;
    foldFactsAreaInWorker(playAreaState.playArea, visibleConfirmedFacts)
      .then((area) => {
        if (generation !== foldGenerationRef.current) return;
        confirmedAreaRef.current = area;
        draftFactsModule.render();
      })
      .catch((err) => {
        console.warn('[MapV2] Failed to fold confirmed facts into an area', err);
      });
  }, [playAreaState.loading, playAreaState.playArea, visibleConfirmedFacts, draftFactsModule]);

  // Draft questions created via the wizard — the legacy API has no concept
  // of an unanswered draft, so these only ever come from this session's own
  // wizard use and start empty.
  const [draftQuestions, setDraftQuestions] = useState<AskedQuestionDto[]>([]);
  const addDraftQuestion = useCallback((q: AskedQuestionDto) => setDraftQuestions((prev) => [...prev, q]), []);
  const removeDraftQuestion = useCallback(
    (questionId: string) => setDraftQuestions((prev) => prev.filter((q) => q.question_id !== questionId)),
    [],
  );

  const factItems = useMemo<FactItem[]>(
    () => realFacts.map((fact) => ({ id: fact.fact_id, fact })),
    [realFacts],
  );
  const draftFactItems = useMemo<FactItem[]>(
    () => draftQuestions.map((q) => {
      const fact = draftQuestionToFact(q);
      return { id: fact.fact_id, fact };
    }),
    [draftQuestions],
  );

  useMapLayerModule(factsModule, playAreaState.loading ? EMPTY_ITEMS : factItems);
  useMapLayerModule(draftFactsModule, playAreaState.loading ? EMPTY_ITEMS : draftFactItems);

  return {
    factsModule, draftFactsModule, factsCount: realFacts.length,
    draftQuestions, addDraftQuestion, removeDraftQuestion, draftsUniverse,
  };
}
