import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGetFactsQuery } from '../../../apis/api';
import { useLayerTree, useMapLayerModule, EMPTY_ITEMS } from '../layers/hooks';
import { GROUP_ID } from '../layers/groupIds';
import { FactItem, FactsLayerModule } from '../layers/modules/FactsLayerModule';
import { GeometryRegistriesResult } from './registries';
import { AskedQuestionDto } from './factTypes';
import { computeFactsArea } from './resolveClue';
import { draftQuestionToFact } from './mockData';
import { convertLegacyFacts } from './legacyFactConverter';
import { FACTS_MODULE_ID, DRAFT_FACTS_MODULE_ID } from './factsLayerIds';

export interface UseFactsLayersOptions {
  gameId?: string;
  teamId: string | null;
  geometry: GeometryRegistriesResult;
}

export interface UseFactsLayersResult {
  factsModule: FactsLayerModule;
  draftFactsModule: FactsLayerModule;
  draftQuestions: AskedQuestionDto[];
  addDraftQuestion: (q: AskedQuestionDto) => void;
  removeDraftQuestion: (questionId: string) => void;
}

/**
 * Owns the whole "Facts" and "Draft Facts" capability: fetching this
 * team's real facts (through the TEMPORARY legacyFactConverter — see that
 * file), the cumulative-reduction fold each starts from (game zone ->
 * confirmed facts -> drafts), and the two FactsLayerModule instances
 * themselves. Nothing outside this hook needs to know any of that; it just
 * needs the two module instances (for map click hit-testing) and the
 * draft-question list (for the wizard/UI).
 */
export function useFactsLayers({ gameId, teamId, geometry }: UseFactsLayersOptions): UseFactsLayersResult {
  const { data: factsResponse } = useGetFactsQuery(
    { game_id: gameId ?? '', team_id: teamId ?? undefined },
    { skip: !gameId || !teamId },
  );
  const realFacts = useMemo(() => convertLegacyFacts(factsResponse?.results ?? []), [factsResponse]);

  const playAreaRef = useRef(geometry.playArea);
  playAreaRef.current = geometry.playArea;
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
  // shading represents. Recomputed every render (cheap for a handful of
  // facts) rather than memoized on `geometry`, since `geometry.registries`
  // is populated in place and wouldn't be seen as "changed" by a
  // dependency array anyway.
  const confirmedAreaRef = useRef(geometry.playArea);
  if (!geometry.loading) {
    try {
      confirmedAreaRef.current = computeFactsArea(geometry.playArea, visibleConfirmedFacts, geometry.registries);
    } catch (err) {
      console.warn('[MapV2] Failed to fold confirmed facts into an area', err);
    }
  }
  const draftsUniverse = useMemo(() => () => confirmedAreaRef.current, []);

  const [factsModule] = useState(() => new FactsLayerModule(
    { id: FACTS_MODULE_ID, groupId: GROUP_ID.FACTS, label: 'Facts', fillColor: '#d32f2f', fillOpacity: 0.35 },
    geometry.registries,
    universe,
  ));
  const [draftFactsModule] = useState(() => new FactsLayerModule(
    { id: DRAFT_FACTS_MODULE_ID, groupId: GROUP_ID.FACTS, label: 'Draft Facts', fillColor: '#9c27b0', fillOpacity: 0.28, dashed: true },
    geometry.registries,
    draftsUniverse,
  ));

  // Toggling a confirmed fact's visibility changes confirmedAreaRef (via
  // draftsUniverse) without changing draftFactsModule's own item list, so
  // nothing would otherwise tell it to redraw. render() just re-reads
  // toFeatures/extraFeatures against the current universe and calls
  // setData — it doesn't call notifyTreeChange, so this can't feed back
  // into another registry invalidation.
  useEffect(() => {
    draftFactsModule.render();
  }, [visibleConfirmedFacts, draftFactsModule]);

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

  useMapLayerModule(factsModule, geometry.loading ? EMPTY_ITEMS : factItems);
  useMapLayerModule(draftFactsModule, geometry.loading ? EMPTY_ITEMS : draftFactItems);

  return { factsModule, draftFactsModule, draftQuestions, addDraftQuestion, removeDraftQuestion };
}
