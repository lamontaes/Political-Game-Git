import { useEffect, useMemo, useReducer, useState } from "react";

import type { EntityId } from "../simulation";

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
  createRunCLegislativeConversationProgress,
  projectRunCWorkingDocument,
  recordRunCPlayerAnalysisReview,
} from "../presentation/run-c-working-document";
import {
  createRunDLiteFixture,
  delegateRunDMeetingBrief,
  performRunDBriefing,
  projectRunDLite,
  rescheduleRunDFlexibleBlock,
} from "../presentation/run-d-lite";
import {
  createRunDUiState,
  runDUiReducer,
} from "../presentation/run-d-lite-state";
import { CalendarWorkspace } from "./CalendarWorkspace";
import { ConversationStrip } from "./ConversationStrip";
import { OfficeScene } from "./OfficeScene";
import { PermanentShell } from "./PermanentShell";
import { WorkPendingWorkspace } from "./WorkPendingWorkspace";
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

function formatRunACompactDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatRunAExpandedDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatRunATime(minuteOfDay: number): string {
  const hour24 = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

export function PlayerOffice() {
  const fixture = useMemo(createRunDLiteFixture, []);
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
  const [planningState, planningDispatch] = useReducer(
    runDUiReducer,
    undefined,
    createRunDUiState,
  );
  const documentProjection = useMemo(
    () => projectRunCWorkingDocument(world, fixture),
    [fixture, world],
  );
  const planningProjection = useMemo(
    () => projectRunDLite(world, fixture),
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

    if (planningState.selectedActivityId !== null) {
      planningDispatch({ type: "close-activity-detail" });
    } else if (planningState.mode !== "closed") {
      planningDispatch({ type: "close" });
    } else if (conversationState.transcriptOpen) {
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
    planningDispatch({ type: "close" });
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
    planningDispatch({ type: "close" });
    dispatch({ type: "dismiss-overlay" });
    dispatch({ type: "close-navigation" });
    dispatch({ type: "close-pin-controls" });
    if (conversationState.mode !== "closed") {
      conversationDispatch({ type: "close" });
    }
    documentDispatch({ type: "open" });
  }

  function openPlanningWorkspace(
    mode: "calendar" | "work",
    activityId?: EntityId,
  ) {
    dispatch({ type: "dismiss-overlay" });
    dispatch({ type: "close-navigation" });
    dispatch({ type: "close-pin-controls" });
    documentDispatch({ type: "close" });
    if (conversationState.mode !== "closed") {
      conversationDispatch({ type: "close" });
    }
    planningDispatch({
      type: mode === "calendar" ? "open-calendar" : "open-work",
      ...(mode === "calendar" && activityId ? { activityId } : {}),
    });
  }

  function rescheduleFlexibleBlock(choice: "valid" | "travel-conflict") {
    const result = rescheduleRunDFlexibleBlock(world, fixture, choice);
    if (result.ok) {
      setWorld(result.world);
      planningDispatch({
        type: "set-feedback",
        message: "The flexible block moved to 11:00 AM–12:00 PM.",
      });
      return;
    }
    const conflictNames = result.conflictingActivityIds
      .map(
        (activityId) =>
          world.history.scheduledActivities.find(
            (activity) => activity.id === activityId,
          )?.title,
      )
      .filter((title): title is string => Boolean(title));
    planningDispatch({
      type: "set-feedback",
      message:
        result.reason === "conflict"
          ? `That move is not possible. It conflicts with ${conflictNames.join(
              " and ",
            )}; the required travel time stays in place.`
          : "That move is not available for this commitment.",
    });
  }

  function delegateMeetingBrief() {
    setWorld(delegateRunDMeetingBrief(world, fixture));
    planningDispatch({
      type: "set-feedback",
      message:
        "Collins now owns the meeting brief and can work on it while you handle other commitments.",
    });
  }

  function performBriefing() {
    setWorld(performRunDBriefing(world, fixture));
    planningDispatch({
      type: "set-feedback",
      message:
        "The 20-minute wait and 45-minute briefing are complete: 65 canonical minutes elapsed, the clock is now 10:15 AM, and Collins's parallel work also advanced.",
    });
  }

  function focusWorkPerson(personId: EntityId) {
    planningDispatch({ type: "close" });
    dispatch({ type: "select-person", personId });
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
      data-simulation-minute={world.currentMoment.minuteOfDay}
      data-simulation-time-zone={world.currentMoment.timeZone}
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
      data-scheduled-activity-count={world.history.scheduledActivities.length}
      data-work-item-count={world.history.workItems.length}
      data-planning-workspace-open={
        planningState.mode !== "closed" ? "true" : "false"
      }
      data-document-workspace-open={
        documentState.mode === "open" ? "true" : "false"
      }
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
    >
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
      {planningState.mode === "calendar" ? (
        <CalendarWorkspace
          fixture={fixture}
          projection={planningProjection}
          selectedActivityId={planningState.selectedActivityId}
          feedback={planningState.feedback}
          onSelect={(activityId) =>
            planningDispatch({ type: "select-activity", activityId })
          }
          onCloseDetail={() =>
            planningDispatch({ type: "close-activity-detail" })
          }
          onClose={() => planningDispatch({ type: "close" })}
          onValidReschedule={() => rescheduleFlexibleBlock("valid")}
          onInvalidReschedule={() => rescheduleFlexibleBlock("travel-conflict")}
          onPerformBriefing={performBriefing}
        />
      ) : null}
      {planningState.mode === "work" ? (
        <WorkPendingWorkspace
          world={world}
          fixture={fixture}
          projection={planningProjection}
          feedback={planningState.feedback}
          onClose={() => planningDispatch({ type: "close" })}
          onDelegate={delegateMeetingBrief}
          onOpenDocument={openWorkingDocument}
          onOpenCalendarItem={(activityId) =>
            planningDispatch({ type: "open-calendar", activityId })
          }
          onFocusPerson={focusWorkPerson}
        />
      ) : null}
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
        expandedDate={formatRunAExpandedDate(world.currentDate)}
        compactDate={formatRunACompactDate(world.currentDate)}
        formattedTime={formatRunATime(world.currentMoment.minuteOfDay)}
        compactNavigation={documentState.mode === "open"}
        retreatedNavigation={
          documentState.mode === "open" || planningState.mode !== "closed"
        }
        nextCommitment={planningProjection.nextCommitment}
        onOpenCalendar={() => openPlanningWorkspace("calendar")}
        onOpenCalendarCommitment={(activityId) =>
          openPlanningWorkspace("calendar", activityId)
        }
        onOpenWorkPending={() => openPlanningWorkspace("work")}
        state={state}
        dispatch={dispatch}
      />
      <p className="sr-only" role="status" aria-live="polite">
        Simulation time is {formatRunATime(world.currentMoment.minuteOfDay)} on{" "}
        {world.currentDate}, Lexington local time.
      </p>
    </main>
  );
}
