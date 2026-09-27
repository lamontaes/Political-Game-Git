import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { projectJudicialSelection } from "../../presentation/judicial-selection";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { currentPresidentOf } from "../crisis/offices";
import { addDays } from "../dates";
import { resolveFutureDueItemsThrough } from "../future-transitions";
import { seatedCongressChamber } from "../governing/congress-chambers";
import { committeeRoster } from "../governing/committee-assignment";
import { LIFE_MIND_IDS } from "../life-mind-content";
import { deserializeWorld, serializeWorld } from "../serialization";
import { addJudicialCourt, seatHolderAt } from "./courts";
import {
  SENATE_JUDICIARY_PLAYER_CHOICE_EVENT,
  organizeSenateJudiciary,
  senateJudiciaryAppointment,
} from "./committee-organization";
import { recordFederalJudicialCandidateResponse } from "./candidate-interview";
import { JUDICIAL_CONFIRMATION_HEARING_EVENT } from "./federal-confirmation";
import {
  JUDICIAL_SENATE_REFERRAL_TRANSITION,
  openJudicialSelectionFromProfile,
  recordFederalJudicialNomination,
} from "./selection";
import {
  JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
  JUDICIAL_COMMITTEE_SESSION_TRANSITION,
} from "./senate-referral";
import {
  JUDICIAL_PUBLIC_HEARING_ATTENDANCE_EVENT,
  JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT,
  JUDICIAL_PUBLIC_HEARING_TRANSITION,
  conductPublicJudicialHearing,
  recordControlledJudicialHearingParticipation,
  recordControlledJudiciaryChairHearingChoice,
  recordControlledOrganizationAndHearingNotice,
} from "./senate-hearing-process";
import { judicialSeatId } from "./types";

function pendingNomination(controlCommitteeSenator = false) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "judicial-federal-nomination",
      startAge: 40,
    }),
  ).game!;
  const senate = seatedCongressChamber(game.world, "senate")!;
  const committees = US_CONGRESS_RULE_PACK.chambers.find(
    (chamber) => chamber.chamberKey === "senate",
  )!.committees;
  const committeeSenatorId = committeeRoster(
    senate.body,
    committees,
    "judiciary",
    "us-congress-v1:senate",
  )[0]!.personId!;
  const controlledSenatorId = controlCommitteeSenator
    ? senateJudiciaryAppointment(
        organizeSenateJudiciary(
          openOrdinaryLife(game.world, game.playerPersonId),
        ),
      )!.chairPersonId
    : committeeSenatorId;
  const initial = controlCommitteeSenator
    ? {
        ...game.world,
        control: { kind: "person" as const, personId: controlledSenatorId },
      }
    : game.world;
  let world = openOrdinaryLife(
    initial,
    controlCommitteeSenator ? controlledSenatorId : game.playerPersonId,
  );
  const courtId = "fixture:hearing-process-district";
  const seatId = judicialSeatId(courtId, 1);
  world = addJudicialCourt(world, {
    courtId,
    jurisdictionId: null,
    name: "Fixture United States District Court",
    level: "federal-district",
    parentCourtId: null,
    sourceRecordId: "us-fed:general_trial",
    identityBasis: "sourced",
    createdAt: world.currentDate,
    rules: {
      authorizedSeats: {
        state: "known",
        value: 1,
        basis: "game-profile",
        referenceId: "fixture:size",
      },
      termYears: {
        state: "known",
        value: null,
        basis: "sourced",
        referenceId: "us-fed:general_trial",
      },
      mandatoryRetirementAge: { state: "unknown", reason: "fixture" },
      caseJurisdiction: { state: "unknown", reason: "fixture" },
      selectionRecordId: "us-fed:general_trial",
      amendmentRoute: { state: "unknown", reason: "fixture" },
    },
  });
  const presidentId = currentPresidentOf(world)!.personId;
  const nomineeId = world.personOrder.find(
    (personId) =>
      personId !== presidentId &&
      personId !== game.playerPersonId &&
      world.history.personalValues.some(
        (value) =>
          value.personId === personId &&
          value.valueId === LIFE_MIND_IDS.privacy &&
          value.orientation === "embraces",
      ),
  )!;
  world = openJudicialSelectionFromProfile(world, {
    seatId,
    kind: "new-seat",
    candidatePersonIds: [nomineeId],
  });
  const selectionRecordId = world.judiciary!.selections.at(-1)!.recordId;
  world = recordFederalJudicialCandidateResponse(world, {
    selectionRecordId,
    candidatePersonId: nomineeId,
  });
  world = recordFederalJudicialNomination(world, {
    selectionRecordId,
    presidentPersonId: presidentId,
    nomineePersonId: nomineeId,
  });
  return {
    world,
    selectionRecordId,
    seatId,
    nomineeId,
    committeeSenatorId: controlledSenatorId,
  };
}

function dueFor(
  world: ReturnType<typeof pendingNomination>["world"],
  key: string,
) {
  return world.history.futureDueItems.find(
    (item) => item.transitionKey === key,
  )!;
}

describe("public Senate Judiciary hearing route", () => {
  it("requires a seven-day public notice, records actual attendees and a new nominee response, then reloads", () => {
    const pending = pendingNomination();
    const registry = createCampaignElectionTransitionRegistry();
    let world = resolveFutureDueItemsThrough(
      pending.world,
      dueFor(pending.world, JUDICIAL_SENATE_REFERRAL_TRANSITION).dueAt,
      registry,
    );
    world = resolveFutureDueItemsThrough(
      world,
      dueFor(world, JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION).dueAt,
      registry,
    );
    const businessDue = dueFor(world, JUDICIAL_COMMITTEE_SESSION_TRANSITION);
    world = resolveFutureDueItemsThrough(world, businessDue.dueAt, registry);
    const businessState = world.history.futureDueItemStates.findLast(
      (state) => state.dueItemId === businessDue.id,
    );
    expect(businessState?.status).toBe("resolved");
    const notice = world.history.events.findLast(
      (event) => event.type === JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT,
    )!;
    const hearingDue = dueFor(world, JUDICIAL_PUBLIC_HEARING_TRANSITION);
    expect(hearingDue.dueAt >= addDays(notice.occurredAt, 7)).toBe(true);
    expect(
      world.history.events.some(
        (event) => event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT,
      ),
    ).toBe(false);
    world = resolveFutureDueItemsThrough(world, hearingDue.dueAt, registry);
    const attendance = world.history.events.findLast(
      (event) => event.type === JUDICIAL_PUBLIC_HEARING_ATTENDANCE_EVENT,
    )!;
    const hearing = world.history.events.findLast(
      (event) => event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT,
    )!;
    expect(attendance.tags).toContain(`notice:${notice.id}`);
    expect(hearing.tags).toContain(`attendance:${attendance.id}`);
    expect(
      world.history.decisionTraces.some(
        (trace) =>
          trace.context.decisionType === "judicial.hearing-answer" &&
          trace.context.actorPersonId === pending.nomineeId,
      ),
    ).toBe(true);
    const attendees = attendance.participants
      .filter((participant) => participant.role === "presence:participant")
      .map((participant) => participant.personId);
    expect(attendees.length).toBeGreaterThan(0);
    expect(attendees.length).toBeLessThan(
      seatedCongressChamber(world, "senate")!.body.members.length,
    );
    expect(
      world.history.knowledge
        .filter((row) => row.eventId === hearing.id)
        .map((row) => row.personId)
        .sort(),
    ).toEqual([...attendees].sort());
    expect(seatHolderAt(world, pending.seatId)).toBeNull();
    expect(
      deserializeWorld(serializeWorld(world)).history.events.some(
        (event) => event.id === hearing.id,
      ),
    ).toBe(true);
  }, 30_000);

  // This route rendered both panel states and took 28.86 s on the shared host.
  it("requires a controlled Senator's organization ballot and actual hearing attendance", () => {
    const pending = pendingNomination(true);
    const registry = createCampaignElectionTransitionRegistry();
    let world = resolveFutureDueItemsThrough(
      pending.world,
      dueFor(pending.world, JUDICIAL_SENATE_REFERRAL_TRANSITION).dueAt,
      registry,
    );
    const organizationDue = dueFor(
      world,
      JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
    );
    expect(
      projectJudicialSelection(world, pending.seatId)?.playerSenateAction,
    ).toBeNull();
    expect(() =>
      recordControlledOrganizationAndHearingNotice(
        world,
        pending.selectionRecordId,
        { attendance: "attend", ballot: "approve" },
      ),
    ).toThrow("organization sitting is not due");
    world = resolveFutureDueItemsThrough(
      world,
      organizationDue.dueAt,
      registry,
    );
    expect(senateJudiciaryAppointment(world)).toBeNull();
    expect(() =>
      organizeSenateJudiciary(world, {
        attendance: "attend",
        ballot: "approve",
      }),
    ).toThrow("no performed organization attendance basis");
    world = recordControlledOrganizationAndHearingNotice(
      world,
      pending.selectionRecordId,
      { attendance: "attend", ballot: "approve" },
    );
    const appointment = senateJudiciaryAppointment(world)!;
    expect(appointment.memberPersonIds).toContain(pending.committeeSenatorId);
    expect(
      world.history.events
        .findLast(
          (event) => event.type === SENATE_JUDICIARY_PLAYER_CHOICE_EVENT,
        )
        ?.tags.some((tag) => tag.startsWith("completion:")),
    ).toBe(true);
    expect(appointment.chairPersonId).toBe(pending.committeeSenatorId);
    expect(
      projectJudicialSelection(world, pending.seatId)?.playerSenateAction,
    ).toBe("announce-hearing");
    world = recordControlledJudiciaryChairHearingChoice(
      world,
      pending.selectionRecordId,
      "announce",
    );
    const hearingDue = dueFor(world, JUDICIAL_PUBLIC_HEARING_TRANSITION);
    world = resolveFutureDueItemsThrough(world, hearingDue.dueAt, registry);
    expect(
      projectJudicialSelection(world, pending.seatId)?.playerSenateAction,
    ).toBe("hearing-attendance");
    expect(
      world.history.futureDueItemStates.findLast(
        (state) => state.dueItemId === hearingDue.id,
      )?.reasonKey,
    ).toBe("judiciary:player-hearing-choice-needed");
    expect(
      world.history.events.some(
        (event) => event.type === JUDICIAL_PUBLIC_HEARING_ATTENDANCE_EVENT,
      ),
    ).toBe(false);
    expect(() =>
      conductPublicJudicialHearing(world, pending.selectionRecordId, {
        attended: true,
        completionEventId: null,
      }),
    ).toThrow("no performed hearing attendance basis");
    world = recordControlledJudicialHearingParticipation(
      world,
      pending.selectionRecordId,
      "attend",
    );
    const hearing = world.history.events.findLast(
      (event) => event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT,
    )!;
    expect(hearing).toBeDefined();
    expect(
      world.history.knowledge.some(
        (row) =>
          row.eventId === hearing.id &&
          row.personId === pending.committeeSenatorId,
      ),
    ).toBe(true);
    expect(seatHolderAt(world, pending.seatId)).toBeNull();
    expect(
      projectJudicialSelection(world, pending.seatId)?.playerSenateAction,
    ).toBe("report-notice");
  }, 45_000);
});
