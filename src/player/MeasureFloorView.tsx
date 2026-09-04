import { useMemo, useReducer, useState } from "react";

import type { EntityId } from "../simulation";
import { projectRunADossier } from "../presentation/run-a-projection";
import type { QuickDossierProjection } from "../presentation/run-a-projection";
import { createRunAUiState, runAUiReducer } from "../presentation/run-a-state";
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
import { isLegislativeBargainingProgress } from "../presentation/run-b-conversation-progress";
import type { LegislativeBargainingProgress } from "../presentation/run-b-conversation-progress";
import {
  createLegislativeBargainingFixture,
  reviewFiscalNote,
} from "../presentation/legislative-bargaining-fixture";
import {
  offerNegotiatedAmendment,
  takeNegotiatedFloorVote,
  type MemberAccount,
} from "../presentation/legislative-bargaining-actions";
import { withAnalysisSeen } from "../presentation/legislative-bargaining";
import { ConversationStrip } from "./ConversationStrip";
import { OfficeScene } from "./OfficeScene";
import {
  MeasurePaperWorkspace,
  type PaperPanel,
} from "./MeasurePaperWorkspace";
import type { RunBFixture } from "../presentation/run-b-fixture";

/**
 * The members' room, with a live bill in it.
 *
 * Same room, same people, same conversation strip as the rest of the game. The
 * only new thing on screen is the bill itself, and the only way anything in it
 * changes is by putting an amendment to the chamber.
 */
export function MeasureFloorView() {
  const seed =
    new URLSearchParams(window.location.search).get("seed") ?? undefined;
  const fixture = useMemo(
    () => createLegislativeBargainingFixture(seed),
    [seed],
  );
  const [world, setWorld] = useState(fixture.world);
  const [progress, setProgress] = useState<LegislativeBargainingProgress>(
    fixture.progress,
  );
  const [paperOpen, setPaperOpen] = useState(false);
  const [panel, setPanel] = useState<PaperPanel>("none");
  const [variant, setVariant] = useState<"as-asked" | "capped">("as-asked");
  const [message, setMessage] = useState<string | null>(null);
  const [memberAccounts, setMemberAccounts] = useState<
    readonly MemberAccount[]
  >([]);
  const [alone, setAlone] = useState(false);

  const room = alone ? fixture.privateRoomContext : fixture.roomContext;
  const [state, dispatch] = useReducer(runAUiReducer, undefined, () =>
    createRunAUiState({
      simulationDate: fixture.world.currentDate,
      simulationActionSequence: fixture.world.actionSequence,
      scenePersonId: fixture.advocatePersonId,
      fixtureState: "normal",
      learnedConceptIds: [],
    }),
  );
  const [conversationState, conversationDispatch] = useReducer(
    runBConversationReducer,
    undefined,
    createRunBConversationState,
  );

  const scenePeople = alone
    ? ([fixture.scenePeople[0]] as const)
    : fixture.scenePeople;
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

  // OfficeScene draws the room from a Run B-shaped fixture. This is the same
  // room, with two colleagues in it instead of two staff.
  const sceneFixture = {
    ...fixture,
    scenePeople: fixture.scenePeople,
    world,
    officeEventId: "" as EntityId,
  } as unknown as RunBFixture;

  function startConversation(personId: EntityId) {
    setPaperOpen(false);
    dispatch({ type: "dismiss-overlay" });
    if (conversationState.session) {
      conversationDispatch({
        type: "switch-addressee",
        addressee: personId,
        openingBeat: openingConversationBeat(world, room, personId, progress),
      });
      return;
    }
    conversationDispatch({
      type: "open",
      session: createConversationSessionDescriptor(world, room),
      progress,
      addressee: personId,
      openingBeat: openingConversationBeat(world, room, personId, progress),
    });
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
      room,
      progress: conversationState.progress,
      turnOrdinal,
      addressee: conversationState.addressee,
      audibility: conversationState.audibility,
      intent,
    });
    setWorld(result.world);
    if (isLegislativeBargainingProgress(result.progress)) {
      setProgress(result.progress);
    }
    conversationDispatch({
      type: "apply-turn",
      turnOrdinal,
      progress: result.progress,
      presentation: result.presentation,
    });
  }

  function openPaper() {
    conversationDispatch({ type: "close" });
    dispatch({ type: "dismiss-overlay" });
    setPaperOpen(true);
  }

  function readFiscalNote() {
    const next = reviewFiscalNote(world, fixture);
    setWorld(next);
    setProgress(withAnalysisSeen(progress));
  }

  function offerAmendment() {
    const result = offerNegotiatedAmendment(world, fixture, progress, variant);
    setWorld(result.world);
    setMessage(result.message);
    setPanel("none");
  }

  function callTheVote() {
    const result = takeNegotiatedFloorVote(world, fixture, progress);
    setWorld(result.world);
    setMessage(result.message);
    setMemberAccounts(result.memberAccounts);
    setPanel("none");
  }

  function toggleAlone() {
    conversationDispatch({ type: "close" });
    setAlone((current) => !current);
  }

  return (
    <main
      className="player-office measure-floor"
      data-testid="measure-floor-view"
      data-simulation-seed={world.seed}
      data-simulation-date={world.currentDate}
      data-history-sequence={world.history.nextSequence}
      data-provision-count={
        (world.history.legislativeProvisions ?? []).filter(
          (provision) => provision.measureId === fixture.measureId,
        ).length
      }
      data-commitment-count={
        (world.history.legislativeCommitments ?? []).length
      }
      data-negotiation-count={
        (world.history.legislativeNegotiations ?? []).length
      }
      data-amendment-count={(world.history.legislativeAmendments ?? []).length}
      data-room={alone ? "advocate-only" : "both-present"}
      data-paper-open={paperOpen ? "true" : "false"}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (panel !== "none") setPanel("none");
        else if (conversationState.mode !== "closed") {
          conversationDispatch({ type: "close" });
        } else if (paperOpen) setPaperOpen(false);
        else if (state.overlay !== "none")
          dispatch({ type: "dismiss-overlay" });
      }}
    >
      <OfficeScene
        fixture={sceneFixture}
        dossiers={dossiers}
        state={state}
        dispatch={dispatch}
        conversationAddressee={conversationState.addressee}
        onTalk={startConversation}
        onOpenWorkingDocument={openPaper}
        onOpenBriefing={openPaper}
        documentEntry={{
          label: `${fixture.progress.subjectFacts.designation} · on the floor`,
          ariaLabel: `Open ${fixture.progress.subjectFacts.designation}, the bill as it now reads`,
        }}
        briefingEntry={{
          label: "Fiscal note",
          ariaLabel: "Open the bill and its fiscal note",
        }}
        showCivicMarker={false}
        sceneLabel={`The members' room off the ${fixture.progress.subjectFacts.chamberName} floor`}
      />

      <div className="measure-room-controls">
        <button
          type="button"
          data-testid="toggle-room-privacy"
          onClick={toggleAlone}
        >
          {alone
            ? `Ask ${world.people[fixture.guardianPersonId]!.familyName} back in`
            : `Wait until ${world.people[fixture.guardianPersonId]!.familyName} steps out`}
        </button>
        <p data-testid="room-note">
          {alone
            ? "The two of you are alone. What is said here stays between you until one of you repeats it."
            : `${world.people[fixture.guardianPersonId]!.familyName} is four feet away and can hear everything.`}
        </p>
      </div>

      {paperOpen ? (
        <MeasurePaperWorkspace
          world={world}
          fixture={fixture}
          progress={progress}
          panel={panel}
          proposalVariant={variant}
          memberAccounts={memberAccounts}
          message={message}
          onOpenPanel={setPanel}
          onChooseVariant={setVariant}
          onReadFiscalNote={readFiscalNote}
          onOfferAmendment={offerAmendment}
          onTakeFloorVote={callTheVote}
          onClose={() => {
            setPaperOpen(false);
            setPanel("none");
          }}
        />
      ) : null}

      <ConversationStrip
        world={world}
        room={room}
        scenePeople={scenePeople}
        state={conversationState}
        dispatch={conversationDispatch}
        onCommit={commitTurn}
      />
    </main>
  );
}
