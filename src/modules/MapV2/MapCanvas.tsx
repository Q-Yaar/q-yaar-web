import React, { useEffect, useRef, useState } from 'react';
import { MapLayerRegistry } from './layers/MapLayerRegistry';
import { MapLayerRegistryProvider, useMapLayerModule, EMPTY_ITEMS } from './layers/hooks';
import { GROUP_ID } from './layers/groupIds';
import { PolygonOverlayModule } from './layers/modules/PolygonOverlayModule';
import { useMapInstance } from './hooks/useMapInstance';
import { useTeamFilter } from './hooks/useTeamFilter';
import { useGameMode, GAME_MODE } from './hooks/useGameMode';
import { useMapInteractions } from './hooks/useMapInteractions';
import { usePlayArea, usePolygonCatalog } from './factsV2/geometryAssets';
import { useFactsLayers } from './factsV2/useFactsLayers';
import { useDraftFactWizard } from './factsV2/useDraftFactWizard';
import { useAnswerQuestionsFlow } from './factsV2/useAnswerQuestionsFlow';
import { useAcceptAnswersFlow } from './factsV2/useAcceptAnswersFlow';
import { FactDto } from './factsV2/factTypes';
import { CARD_SHEET, DETAIL_CONTEXT, useCardModule } from './cards/useCardModule';
import { useCurseModule } from './curse/useCurseModule';
import { TopBar } from './components/TopBar';
import { LayersSheet } from './components/LayersSheet';
import { ModeActionButtons } from './components/ModeActionButtons';
import { CardModule } from './components/CardModule';
import { CardsSheet } from './components/CardsSheet';
import { DrawCardModal } from './components/DrawCardModal';
import { CardDetailModal } from './components/CardDetailModal';
import { CurseStatusSheet } from './components/CurseStatusSheet';
import { DraftQuestionsList } from './components/DraftQuestionsList';
import { FactsChip } from './components/FactsChip';
import { MapStatusBanner } from './components/MapStatusBanner';
import { FactPopup } from './components/FactPopup';
import { CreateDraftFactWizard } from './components/CreateDraftFactWizard';
import { AnswerQuestionsSheet } from './components/AnswerQuestionsSheet';
import { AcceptAnswersSheet } from './components/AcceptAnswersSheet';

interface MapCanvasInnerProps {
  registry: MapLayerRegistry;
  gameId?: string;
  onBack?: () => void;
}

/**
 * Orchestrator only. Each capability lives in its own hook or module — this
 * component's whole job is creating them in the right order, wiring their
 * outputs together, and laying out the chrome around the map itself:
 *   playArea         -> the eagerly-loaded game zone (factsV2/geometryAssets.ts)
 *   polygonCatalog   -> corporation/metro-catchment zones, loaded lazily
 *                        (factsV2/geometryAssets.ts)
 *   gameMode         -> Hiding/Seeking toggle, manual (hooks/useGameMode.ts —
 *                        there's no real hider/seeker field anywhere in the
 *                        data model yet)
 *   teamFilter       -> the Seeking-mode team dropdown (hooks/useTeamFilter.ts)
 *   facts            -> Facts/Draft Facts data + modules (factsV2/useFactsLayers.ts).
 *                        Which team's facts load is mode-dependent: Hiding
 *                        shows the player's own team (teamFilter.myTeamId —
 *                        a hider always sees their own team's facts, the
 *                        dropdown isn't shown), Seeking shows whichever team
 *                        the dropdown has selected.
 *   interactions     -> map clicks/hover, Points & Distance
 *                        (hooks/useMapInteractions.ts)
 *   wizard           -> Seeking's "Ask a question" form (factsV2/useDraftFactWizard.ts)
 *   answerFlow       -> Hiding's "Answer questions" form (factsV2/useAnswerQuestionsFlow.ts)
 *   acceptFlow       -> Seeking's "Accept answers" list (factsV2/useAcceptAnswersFlow.ts) —
 *                        the mirror image of answerFlow: once the hider answers a
 *                        question this team asked, it sits here until the seeker
 *                        accepts it, which is what actually turns it into a real
 *                        fact (and clears the matching draft) rather than staying
 *                        a dashed, assumed-value guess forever
 *   cardModule       -> Hiding's Draw/Hand/Discard cards (cards/useCardModule.ts) — wired
 *                        to the real deck API (src/apis/deckApi.ts, the same endpoints
 *                        DeckPage.tsx uses), not mock data. No map layer of its own,
 *                        purely a floating button group, two sheets, and a draw modal
 *   curseModule      -> mock curse status (curse/useCurseModule.ts) — there's no real
 *                        backend field for this yet. A CURSE-type card's detail view
 *                        (Hiding mode) casts a curse on the other team; Seeking mode's
 *                        "Cursed" button (ModeActionButtons) shows *every* active curse
 *                        for now (a demo simplification — see that file's TODO) rather
 *                        than just the viewer's own team's
 * `pickResolverRef` is created here (not inside either hook) and shared with
 * `wizard`: `interactions`'s click handler resolves a pending pick through
 * it, `wizard` arms/clears it. That's also why `interactions` is constructed
 * *before* `wizard`/`answerFlow` — MapLibre draws later-registered modules'
 * layers on top, and each flow's own live preview/points should always be
 * the topmost thing on the map, never obscured by Measurement's
 * crosshair/rings/points or by the Registry Polygons overlay. `interactions`
 * also feeds back the Points & Distance tool's current points so opening
 * the wizard can start from whatever's already been measured instead of
 * picking it all over again.
 *
 * `answeredFacts` is plain state owned here (not inside useAnswerQuestionsFlow
 * itself) so it can be threaded into `facts` *before* `answerFlow` exists —
 * `facts` needs it as soon as it's constructed, but `answerFlow` needs to be
 * constructed *after* `interactions` for the z-order reason above, and
 * `interactions` itself needs `facts`'s modules. Same "lift state out to
 * break a hook-ordering cycle" move as pickResolverRef. `acceptFlow` doesn't
 * need a slot in this array — accepting calls the real createFact API
 * (factsV2/useAcceptAnswersFlow.ts), so the new fact arrives through
 * useFactsLayers's own real refetch instead of being faked in locally.
 *
 * The map is full-bleed — TopBar is a floating translucent strip over its
 * top edge (see TopBar.tsx), not a separate flex row pushing it down, so
 * the basemap is visible (blurred) underneath it rather than hidden behind
 * a solid bar. The wizard/layers/fact-detail sheets overlay the map too
 * (they're full-viewport portals, by design — see BottomSheet), but nothing
 * about them blocks it: no backdrop, and the sheet's own header never
 * covers more than the bottom portion of the screen, so there's always map
 * visible above it for orientation while a question is being composed.
 */
const MapCanvasInner: React.FC<MapCanvasInnerProps> = ({ registry, gameId, onBack }) => {
  useEffect(() => {
    // Measurement has no *manual* visibility toggle anywhere in the UI, so
    // it stays on by default — registering it is still required so
    // PointsDistanceModule has a group to mount into. It's still hidden
    // automatically while a wizard/sheet is composing a question (see the
    // effect below), so its crosshair/rings/points never compete with a
    // flow's own live preview for attention.
    registry.registerGroup(GROUP_ID.MEASUREMENT, 'Measurement');
    // Registry Polygons' only visibility control is now the per-zone flat
    // list in LayersSheet (no group-level toggle exposed), so the group
    // itself must default visible — otherwise every zone checkbox would be
    // fighting a group that's permanently hidden.
    registry.registerGroup(GROUP_ID.OVERLAYS, 'Overlays');
    registry.registerGroup(GROUP_ID.FACTS, 'Facts');
    // No manual toggle either, same as Measurement — see WizardPointsModule.
    registry.registerGroup(GROUP_ID.WIZARD_AIDS, 'Wizard aids');
  }, [registry]);

  const { containerRef, mapRef, isMapReady } = useMapInstance({ registry });
  const playAreaState = usePlayArea();
  const polygonCatalog = usePolygonCatalog();
  const gameMode = useGameMode(gameId);
  const teamFilter = useTeamFilter(gameId);

  // Hiding always shows the player's own team's facts; Seeking shows
  // whichever team the dropdown has selected (see TopBar — the dropdown
  // itself is hidden in Hiding mode).
  const factsTeamId = gameMode.mode === GAME_MODE.HIDING ? teamFilter.myTeamId : teamFilter.selectedTeamId;

  // See the class doc comment for why this is lifted out here rather than
  // owned inside useAnswerQuestionsFlow.
  const [answeredFacts, setAnsweredFacts] = useState<FactDto[]>([]);

  const facts = useFactsLayers({ gameId, teamId: factsTeamId, playAreaState, extraFacts: answeredFacts });

  // Capability #2 — Registry Polygons. Simple enough (no data pipeline of
  // its own, just polygonCatalog.items) to wire directly here rather than
  // through a dedicated hook. Loads independently of the map/facts —
  // usePolygonCatalog() fetches every known zone's geometry in the
  // background, never gating on it. Registered before Measurement/the
  // wizard so a zone overlay never draws over either of them.
  const [polygonModule] = useState(() => new PolygonOverlayModule());
  useMapLayerModule(polygonModule, polygonCatalog.loading ? EMPTY_ITEMS : polygonCatalog.items);

  // See the module-order note above for why this lives here rather than
  // inside useDraftFactWizard.
  const pickResolverRef = useRef<((coordinates: [number, number]) => void) | null>(null);

  const interactions = useMapInteractions({
    mapRef,
    isMapReady,
    factsModule: facts.factsModule,
    draftFactsModule: facts.draftFactsModule,
    pickResolverRef,
  });
  const wizard = useDraftFactWizard({
    gameId,
    targetTeamId: teamFilter.selectedTeamId,
    zoneOptions: polygonCatalog.items,
    zoneOptionsLoading: polygonCatalog.loading,
    previewUniverse: facts.draftsUniverse,
    playArea: playAreaState.playArea,
    pickResolverRef,
    onSubmit: facts.addDraftQuestion,
  });
  const answerFlow = useAnswerQuestionsFlow({
    gameId,
    teamId: teamFilter.myTeamId,
    previewUniverse: facts.draftsUniverse,
    playArea: playAreaState.playArea,
    onAnswered: (fact) => setAnsweredFacts((prev) => [...prev, fact]),
  });
  const acceptFlow = useAcceptAnswersFlow({
    gameId,
    teamId: teamFilter.selectedTeamId,
    onRemoveDraft: facts.removeDraftQuestion,
  });
  const cardModule = useCardModule(teamFilter.myTeamId);
  const curseModule = useCurseModule();
  // The hider's curse target — the other player team, so a CURSE card's
  // detail action ("Curse <team>") has somewhere to point without asking
  // the hider to pick one every time; see the CardDetailModal wiring below.
  const curseTargetTeam = teamFilter.playerTeams.find((t) => t.team_id !== teamFilter.myTeamId) ?? null;

  const [layersOpen, setLayersOpen] = useState(false);

  // Measurement's crosshair/rings/points would otherwise sit underneath
  // (and visually compete with) whichever flow is actively composing a
  // question right now — hide the whole group while either is open,
  // including the brief moment the wizard hides itself to await a map-pick
  // (pickPrompt), since that's still part of the same composing flow.
  // Placing a measurement point is exactly how a seeker seeds the wizard in
  // the first place (see openWizard below), so this only ever hides layers
  // already placed before the flow started, never blocks placing new ones.
  const wizardActive = wizard.props.isOpen || wizard.pickPrompt !== null;
  const answerFlowActive = answerFlow.props.isOpen;
  const acceptFlowActive = acceptFlow.props.isOpen;
  useEffect(() => {
    registry.setGroupVisible(GROUP_ID.MEASUREMENT, !(wizardActive || answerFlowActive || acceptFlowActive));
  }, [registry, wizardActive, answerFlowActive, acceptFlowActive]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      <TopBar
        onBack={onBack}
        mode={gameMode.mode}
        onSetMode={gameMode.setMode}
        teamFilter={teamFilter}
        onOpenLayers={() => setLayersOpen(true)}
      />

      <FactsChip count={facts.factsCount} />
      <MapStatusBanner pickPrompt={wizard.pickPrompt} onCancelPick={wizard.cancelPick} />

      {gameMode.mode === GAME_MODE.SEEKING && (
        <DraftQuestionsList questions={facts.draftQuestions} onRemove={facts.removeDraftQuestion} />
      )}

      <ModeActionButtons
        mode={gameMode.mode}
        onAnswerQuestions={answerFlow.openSheet}
        pendingAnswerCount={answerFlow.pendingCount}
        onAskQuestion={() => wizard.openWizard(interactions.measurementPoints)}
        onAcceptAnswers={acceptFlow.openSheet}
        pendingAcceptCount={acceptFlow.pendingCount}
        curseCount={curseModule.curses.length}
        onOpenCurseStatus={curseModule.openSheet}
      />

      {gameMode.mode === GAME_MODE.HIDING && (
        <CardModule
          handCount={cardModule.handCount}
          discardCount={cardModule.discardCount}
          onOpenDraw={cardModule.openDrawModal}
          onOpenHand={cardModule.openHand}
          onOpenDiscard={cardModule.openDiscard}
        />
      )}

      <LayersSheet isOpen={layersOpen} onClose={() => setLayersOpen(false)} />

      <FactPopup
        fact={interactions.selectedFact?.fact ?? null}
        isDraft={interactions.selectedFact?.isDraft ?? false}
        onClose={interactions.clearSelectedFact}
      />

      {gameMode.mode === GAME_MODE.SEEKING && (
        <>
          <CreateDraftFactWizard {...wizard.props} />
          <AcceptAnswersSheet {...acceptFlow.props} />
          <CurseStatusSheet
            isOpen={curseModule.isSheetOpen}
            onClose={curseModule.closeSheet}
            curses={curseModule.curses}
            // Stays open after completing one — a team can be under
            // several curses at once, cleared in any order, so closing
            // here would force reopening the sheet after every single one.
            onComplete={(curseId) => curseModule.completeCurse(curseId)}
            onCardClick={(card) => cardModule.openDetail(card, DETAIL_CONTEXT.CURSE)}
          />
        </>
      )}
      {gameMode.mode === GAME_MODE.HIDING && (
        <>
          <AnswerQuestionsSheet {...answerFlow.props} />
          <CardsSheet
            isOpen={cardModule.activeSheet === CARD_SHEET.HAND}
            onClose={cardModule.closeSheet}
            title="Your hand"
            cards={cardModule.hand}
            isLoading={cardModule.handLoading}
            emptyText="No cards yet — draw one to get started."
            onCardClick={(card) => cardModule.openDetail(card, DETAIL_CONTEXT.HAND)}
            onDiscard={cardModule.discardCard}
          />
          <CardsSheet
            isOpen={cardModule.activeSheet === CARD_SHEET.DISCARD}
            onClose={cardModule.closeSheet}
            title="Discard pile"
            cards={cardModule.discardPile}
            isLoading={cardModule.discardLoading}
            emptyText="Nothing discarded yet."
            onCardClick={(card) => cardModule.openDetail(card, DETAIL_CONTEXT.DISCARD)}
          />
          <DrawCardModal
            isOpen={cardModule.isDrawModalOpen}
            peeking={cardModule.peeking}
            peekedCards={cardModule.peekedCards}
            canPeekMore={cardModule.canPeekMore}
            onPeekMore={cardModule.peekMore}
            selectedIds={cardModule.selectedIds}
            onToggleSelect={cardModule.toggleSelect}
            onCardClick={(card) => cardModule.openDetail(card, DETAIL_CONTEXT.DRAW)}
            drawing={cardModule.drawing}
            onDrawSelected={cardModule.drawSelected}
            onDrawAll={cardModule.drawAll}
            onClose={cardModule.closeDrawModal}
          />
        </>
      )}
      {/* Not gated by mode — reused from Seeking's Cursed sheet too (see
          DETAIL_CONTEXT.CURSE), not just Hiding's hand/discard/peek grids. */}
      <CardDetailModal
        isOpen={cardModule.detailCard !== null}
        card={cardModule.detailCard}
        onClose={cardModule.closeDetail}
        primaryAction={
          cardModule.detailContext === DETAIL_CONTEXT.DRAW && cardModule.detailCard
            ? { label: 'Draw this card', onClick: () => cardModule.drawOneAndClose(cardModule.detailCard!.card_id), loading: cardModule.drawing }
            : cardModule.detailContext === DETAIL_CONTEXT.HAND && cardModule.detailCard?.card_type === 'CURSE' && curseTargetTeam
              ? {
                  label: `Curse ${curseTargetTeam.team_name}`,
                  onClick: () => {
                    curseModule.castCurse(curseTargetTeam.team_id, cardModule.detailCard!, teamFilter.myTeamId ?? '');
                    cardModule.discardCard(cardModule.detailCard!.card_id);
                    cardModule.closeDetail();
                  },
                }
              : cardModule.detailContext === DETAIL_CONTEXT.HAND && cardModule.detailCard
                ? { label: 'Discard', onClick: () => { cardModule.discardCard(cardModule.detailCard!.card_id); cardModule.closeDetail(); } }
                : undefined
        }
      />
    </div>
  );
};

export const MapCanvas: React.FC<{ gameId?: string; onBack?: () => void }> = ({ gameId, onBack }) => {
  const [registry] = useState(() => new MapLayerRegistry());

  return (
    <MapLayerRegistryProvider value={registry}>
      <MapCanvasInner registry={registry} gameId={gameId} onBack={onBack} />
    </MapLayerRegistryProvider>
  );
};
