import { useMemo, useReducer, useState } from "react";

import type { EntityId, World } from "../simulation";
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
  reviewFiscalNoteFor,
  type LegislativeBargainingSeat,
} from "../presentation/legislative-bargaining-brief";
import {
  offerNegotiatedAmendment,
  takeNegotiatedFloorVote,
  type MemberAccount,
} from "../presentation/legislative-bargaining-actions";
import { withAnalysisSeen } from "../presentation/legislative-bargaining";
import { ConversationStrip } from "./ConversationStrip";
import { projectDynamicSurfaces } from "../presentation/surface-projection";
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
 *
 * This surface reads one bargaining seat and one world, and reports every
 * world change upward. It does not know whether the seat came from the
 * developer fixture (`?view=floor`) or from the production adapter that
 * derives it from the player's own save — and it must not: the seat is the
 * whole contract.
 */
export interface MeasureFloorSurfaceProps {
  readonly world: World;
  readonly seat: LegislativeBargainingSeat;
  readonly onWorldChange: (world: World) => void;
}

export function MeasureFloorSurface({
  world,
  seat,
  onWorldChange,
}: MeasureFloorSurfaceProps) {
  const [progress, setProgress] = useState<LegislativeBargainingProgress>(
    seat.progress,
  );
  const [paperOpen, setPaperOpen] = useState(false);
  const [panel, setPanel] = useState<PaperPanel>("none");
  const [variant, setVariant] = useState<"as-asked" | "capped">("as-asked");
  const [message, setMessage] = useState<string | null>(null);
  const [memberAccounts, setMemberAccounts] = useState<
    readonly MemberAccount[]
  >([]);
  const [alone, setAlone] = useState(false);

  const room = alone ? seat.privateRoomContext : seat.roomContext;
  const [state, dispatch] = useReducer(runAUiReducer, undefined, () =>
    createRunAUiState({
      simulationDate: world.currentDate,
      simulationActionSequence: world.actionSequence,
      scenePersonId: seat.advocatePersonId,
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
    ? ([seat.scenePeople[0]] as const)
    : seat.scenePeople;
  const dossiers = useMemo(
    () =>
      Object.fromEntries(
        seat.scenePeople.map((scenePerson) => [
          scenePerson.personId,
          projectRunADossier(world, seat.playerPersonId, scenePerson),
        ]),
      ) as Readonly<Record<string, QuickDossierProjection>>,
    [seat, world],
  );

  // OfficeScene draws the room from a Run B-shaped fixture. This is the same
  // room, with two colleagues in it instead of two staff.
  const sceneFixture = {
    ...seat,
    scenePeople: seat.scenePeople,
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
    onWorldChange(result.world);
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
    onWorldChange(reviewFiscalNoteFor(world, seat));
    setProgress(withAnalysisSeen(progress));
  }

  function offerAmendment() {
    const result = offerNegotiatedAmendment(world, seat, progress, variant);
    onWorldChange(result.world);
    setMessage(result.message);
    setPanel("none");
  }

  function callTheVote() {
    const result = takeNegotiatedFloorVote(world, seat, progress);
    onWorldChange(result.world);
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
          (provision) => provision.measureId === seat.measureId,
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
        surfaces={projectDynamicSurfaces(world, {
          jurisdictionId: seat.roomContext.jurisdictionId,
          measureId: progress.subjectFacts.measureId,
        })}
        dossiers={dossiers}
        state={state}
        dispatch={dispatch}
        conversationAddressee={conversationState.addressee}
        onTalk={startConversation}
        onOpenWorkingDocument={openPaper}
        onOpenBriefing={openPaper}
        documentEntry={{
          label: `${seat.progress.subjectFacts.designation} · on the floor`,
          ariaLabel: `Open ${seat.progress.subjectFacts.designation}, the bill as it now reads`,
        }}
        briefingEntry={{
          label: "Fiscal note",
          ariaLabel: "Open the bill and its fiscal note",
        }}
        showCivicMarker={false}
        sceneLabel={`The members' room off the ${seat.progress.subjectFacts.chamberName} floor`}
      />

      <div className="measure-room-controls">
        <button
          type="button"
          data-testid="toggle-room-privacy"
          onClick={toggleAlone}
        >
          {alone
            ? `Ask ${world.people[seat.guardianPersonId]!.familyName} back in`
            : `Wait until ${world.people[seat.guardianPersonId]!.familyName} steps out`}
        </button>
        <p data-testid="room-note">
          {alone
            ? "The two of you are alone. What is said here stays between you until one of you repeats it."
            : `${world.people[seat.guardianPersonId]!.familyName} is four feet away and can hear everything.`}
        </p>
      </div>

      {paperOpen ? (
        <MeasurePaperWorkspace
          world={world}
          seat={seat}
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
