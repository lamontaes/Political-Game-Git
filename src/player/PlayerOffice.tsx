import { useEffect, useMemo, useReducer, useState } from "react";

import { parseRunAFixtureState } from "../presentation/run-a-fixture";
import {
  loadLearnedConcepts,
  persistLearnedConcepts,
} from "../presentation/run-a-learning";
import {
  projectRunADossier,
  type QuickDossierProjection,
} from "../presentation/run-a-projection";
import {
  createRunAUiState,
  runAUiReducer,
  type RunAPersonPinId,
} from "../presentation/run-a-state";
import {
  commitConversationTurn,
  createConversationSessionDescriptor,
  openingConversationBeat,
  type ConversationIntent,
} from "../presentation/run-b-conversation";
import {
  createRunBConversationState,
  runBConversationReducer,
} from "../presentation/run-b-conversation-state";
import {
  createRunBConversationProgress,
  isRunCLegislativeConversationProgress,
} from "../presentation/run-b-conversation-progress";
import {
  createRunCDocumentUiState,
  runCDocumentUiReducer,
} from "../presentation/run-c-document-state";
import {
  commitRunCWorkingDraftRevision,
  createRunCFixture,
  createRunCLegislativeConversationProgress,
  projectRunCWorkingDocument,
  recordRunCPlayerAnalysisReview,
} from "../presentation/run-c-working-document";
import { ConversationStrip } from "./ConversationStrip";
import { OfficeScene } from "./OfficeScene";
import { PermanentShell } from "./PermanentShell";
import { WorkingDocumentWorkspace } from "./WorkingDocumentWorkspace";

function formatRunADate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function PlayerOffice() {
  const fixture = useMemo(createRunCFixture, []);
  const [world, setWorld] = useState(fixture.world);
  const fixtureState = parseRunAFixtureState(
    new URLSearchParams(window.location.search).get("fixture"),
  );
  const [state, dispatch] = useReducer(runAUiReducer, undefined, () =>
    createRunAUiState({
      simulationDate: fixture.world.currentDate,
      simulationActionSequence: fixture.world.actionSequence,
      scenePersonId: fixture.scenePerson.personId,
      fixtureState,
      learnedConceptIds: loadLearnedConcepts(window.localStorage),
    }),
  );
  const [conversationState, conversationDispatch] = useReducer(
    runBConversationReducer,
    undefined,
    createRunBConversationState,
  );
  const [documentState, documentDispatch] = useReducer(
    runCDocumentUiReducer,
    undefined,
    createRunCDocumentUiState,
  );
  const documentProjection = useMemo(
    () => projectRunCWorkingDocument(world, fixture),
    [fixture, world],
  );
  const activeConversationRoom =
    conversationState.progress &&
    isRunCLegislativeConversationProgress(conversationState.progress)
      ? fixture.legislativeRoomContext
      : fixture.roomContext;
  const dossiers = useMemo(
    () =>
      Object.fromEntries(
        fixture.scenePeople.map((scenePerson) => [
          scenePerson.personId,
          projectRunADossier(world, fixture.playerPersonId, scenePerson),
        ]),
      ) as Readonly<Record<string, QuickDossierProjection>>,
    [fixture, world],
  );
  const primaryDossier = dossiers[fixture.scenePerson.personId];
  if (!primaryDossier) {
    throw new Error("Run B fixture is missing its primary dossier.");
  }

  useEffect(() => {
    persistLearnedConcepts(window.localStorage, state.learnedConceptIds);
  }, [state.learnedConceptIds]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;

    if (conversationState.transcriptOpen) {
      conversationDispatch({ type: "toggle-transcript" });
    } else if (conversationState.mode !== "closed") {
      conversationDispatch({ type: "close" });
    } else if (documentState.panel !== "none") {
      documentDispatch({ type: "close-panel" });
    } else if (documentState.actionMenuOpen) {
      documentDispatch({ type: "dismiss-action-menu" });
    } else if (documentState.mode === "open") {
      documentDispatch({ type: "close" });
    } else if (state.activePinMenuId !== null) {
      dispatch({ type: "close-pin-controls" });
    } else if (state.overlay !== "none") {
      dispatch({ type: "dismiss-overlay" });
    } else if (state.navigation !== "closed") {
      dispatch({ type: "close-navigation" });
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (state.navigation !== "closed" && !target.closest(".nav-cluster")) {
      dispatch({ type: "close-navigation" });
    }
    if (state.activePinMenuId !== null && !target.closest(".pin-slot")) {
      dispatch({ type: "close-pin-controls" });
    }
    if (
      state.overlay === "person-actions" &&
      !target.closest(".person-action-menu") &&
      !target.closest(".scene-person")
    ) {
      dispatch({ type: "dismiss-overlay" });
    }
    if (
      documentState.actionMenuOpen &&
      !target.closest(".provision-action-menu") &&
      !target.closest(".legal-phrase-selection")
    ) {
      documentDispatch({ type: "dismiss-action-menu" });
    }
  }

  function startConversation(
    personId: (typeof fixture.scenePeople)[number]["personId"],
  ) {
    dispatch({ type: "dismiss-overlay" });
    if (
      conversationState.session &&
      conversationState.progress &&
      !isRunCLegislativeConversationProgress(conversationState.progress)
    ) {
      if (!conversationState.progress) return;
      conversationDispatch({
        type: "switch-addressee",
        addressee: personId,
        openingBeat: openingConversationBeat(
          world,
          fixture.roomContext,
          personId,
          conversationState.progress,
        ),
      });
      return;
    }
    const progress = createRunBConversationProgress();
    conversationDispatch({
      type: "open",
      session: createConversationSessionDescriptor(world, fixture.roomContext),
      progress,
      addressee: personId,
      openingBeat: openingConversationBeat(
        world,
        fixture.roomContext,
        personId,
        progress,
      ),
    });
  }

  function openWorkingDocument() {
    dispatch({ type: "dismiss-overlay" });
    dispatch({ type: "close-navigation" });
    dispatch({ type: "close-pin-controls" });
    if (conversationState.mode !== "closed") {
      conversationDispatch({ type: "close" });
    }
    documentDispatch({ type: "open" });
  }

  function reviewStaffAnalysis() {
    const reviewedWorld = recordRunCPlayerAnalysisReview(world, fixture);
    setWorld(reviewedWorld);
    documentDispatch({ type: "open-analysis" });
  }

  function discussSelectedProvision() {
    const progress = createRunCLegislativeConversationProgress(world, fixture);
    const room = fixture.legislativeRoomContext;
    const collinsPersonId = fixture.scenePerson.personId;
    documentDispatch({ type: "dismiss-action-menu" });
    conversationDispatch({
      type: "open",
      session: createConversationSessionDescriptor(world, room),
      progress,
      addressee: collinsPersonId,
      openingBeat: openingConversationBeat(
        world,
        room,
        collinsPersonId,
        progress,
      ),
    });
  }

  function commitWorkingDraftRevision() {
    const revisedWorld = commitRunCWorkingDraftRevision(world, fixture);
    setWorld(revisedWorld);
    documentDispatch({ type: "close-panel" });
    documentDispatch({ type: "dismiss-action-menu" });
  }

  function commitTurn(intent: ConversationIntent) {
    if (
      !conversationState.session ||
      !conversationState.progress ||
      conversationState.addressee === null
    ) {
      return;
    }
    const turnOrdinal = conversationState.committedTurnCount + 1;
    const result = commitConversationTurn(world, {
      session: conversationState.session,
      room: activeConversationRoom,
      progress: conversationState.progress,
      turnOrdinal,
      addressee: conversationState.addressee,
      audibility: conversationState.audibility,
      intent,
    });
    setWorld(result.world);
    conversationDispatch({
      type: "apply-turn",
      turnOrdinal,
      progress: result.progress,
      presentation: result.presentation,
    });
  }

  return (
    <main
      className="player-office"
      data-testid="player-office"
      data-simulation-date={world.currentDate}
      data-action-sequence={world.actionSequence}
      data-history-sequence={world.history.nextSequence}
      data-conversation-event-count={
        world.history.events.filter(
          (event) => event.type === "conversation.office-turn",
        ).length
      }
      data-conversation-claim-count={
        world.history.claims.filter((claim) =>
          claim.stableKey.includes("run-b:conversation:"),
        ).length
      }
      data-conversation-knowledge-count={
        world.history.knowledge.filter((knowledge) =>
          knowledge.stableKey.includes("run-b:conversation:"),
        ).length
      }
      data-working-draft-variant={documentProjection.activeVariantKey}
      data-working-draft-revision-count={
        world.history.events.filter(
          (event) => event.type === "office.working-draft-revised",
        ).length
      }
      data-policy-realization-count={world.history.policyRealizations.length}
      data-effect-activation-count={world.history.effectActivations.length}
      data-metric-state-count={world.history.metricStates.length}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
    >
      <div className="scene-caption">
        <p>Legislative Office</p>
        <span>{fixture.locationDetail}</span>
      </div>

      <OfficeScene
        fixture={fixture}
        dossiers={dossiers}
        state={state}
        dispatch={dispatch}
        conversationAddressee={conversationState.addressee}
        onTalk={startConversation}
        onOpenWorkingDocument={openWorkingDocument}
      />
      <WorkingDocumentWorkspace
        world={world}
        fixture={fixture}
        projection={documentProjection}
        state={documentState}
        dispatch={documentDispatch}
        onReviewAnalysis={reviewStaffAnalysis}
        onDiscussProvision={discussSelectedProvision}
        onCommitRevision={commitWorkingDraftRevision}
      />
      <ConversationStrip
        world={world}
        room={activeConversationRoom}
        scenePeople={fixture.scenePeople}
        state={conversationState}
        dispatch={conversationDispatch}
        onCommit={commitTurn}
      />
      <PermanentShell
        fixture={fixture}
        people={fixture.scenePeople.map((scenePerson) => ({
          pinId: (scenePerson.visualVariant === "primary"
            ? "person"
            : "person-b") as RunAPersonPinId,
          personId: scenePerson.personId,
          dossier: dossiers[scenePerson.personId]!,
        }))}
        formattedDate={formatRunADate(world.currentDate)}
        compactNavigation={documentState.mode === "open"}
        state={state}
        dispatch={dispatch}
      />
      <p className="sr-only" role="status" aria-live="polite">
        Simulation date remains {world.currentDate}.
      </p>
    </main>
  );
}
