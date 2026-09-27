import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { currentPresidentOf } from "../crisis/offices";
import { addDays } from "../dates";
import { currentFederalTenure } from "../federal-tenures";
import { resolveFutureDueItemsThrough } from "../future-transitions";
import { seatedCongressChamber } from "../governing/congress-chambers";
import { LIFE_MIND_IDS } from "../life-mind-content";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { seatHolderAt, seatsForCourt, vacateJudicialSeat } from "./courts";
import { FEDERAL_COURTS_PROJECTION } from "./generated/federal-courts";
import {
  organizeSenateJudiciary,
  senateJudiciaryAppointment,
} from "./committee-organization";
import { recordFederalJudicialCandidateResponse } from "./candidate-interview";
import {
  JUDICIAL_SENATE_BALLOT_EVENT,
  JUDICIAL_SENATE_RESULT_EVENT,
  JUDICIAL_CONFIRMATION_HEARING_EVENT,
  recordFederalJudicialSenateBallot,
} from "./federal-confirmation";
import {
  JUDICIAL_SENATE_REFERRAL_TRANSITION,
  judicialSelectionStages,
  openJudicialSelectionFromProfile,
  recordFederalJudicialNomination,
} from "./selection";
import {
  JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
  JUDICIAL_COMMITTEE_SESSION_TRANSITION,
} from "./senate-referral";
import {
  JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT,
  JUDICIAL_PUBLIC_HEARING_TRANSITION,
  recordControlledJudicialHearingParticipation,
  recordControlledJudiciaryChairHearingChoice,
} from "./senate-hearing-process";
import {
  JUDICIAL_EXEC_CALENDAR_EVENT,
  JUDICIAL_FLOOR_TRANSITION,
  JUDICIAL_FLOOR_SITTING_EVENT,
  JUDICIAL_FLOOR_PLAYER_CHOICE_EVENT,
  JUDICIAL_REPORT_NOTICE_EVENT,
  JUDICIAL_REPORT_PLAYER_CHOICE_EVENT,
  JUDICIAL_REPORT_RESULT_EVENT,
  JUDICIAL_REPORT_SITTING_EVENT,
  JUDICIAL_REPORT_TRANSITION,
  conductJudicialNominationFloor,
  conductJudicialReportBusiness,
  recordControlledJudicialNominationFloorChoice,
  recordControlledJudiciaryReportChoice,
  recordControlledJudiciaryReportNotice,
} from "./senate-committee-report";

function nominatedWorld(
  opening: World,
  playerPersonId: EntityId,
  requestedCourtId?: string,
) {
  let world = opening;
  const court = Object.values(world.judiciary!.courts).find(
    (item) =>
      item.level ===
        (requestedCourtId ? "federal-appellate" : "federal-district") &&
      (!requestedCourtId || item.courtId === requestedCourtId) &&
      item.identityBasis === "sourced" &&
      seatsForCourt(world, item.courtId).some((seat) =>
        seatHolderAt(world, seat.seatId),
      ),
  )!;
  const seatId = seatsForCourt(world, court.courtId).find((seat) =>
    seatHolderAt(world, seat.seatId),
  )!.seatId;
  world = vacateJudicialSeat(world, {
    seatId,
    vacatedAt: world.currentDate,
    reason: "retirement",
  });
  const presidentId = currentPresidentOf(world)!.personId;
  const senatorIds = new Set(
    seatedCongressChamber(world, "senate")!.body.members.map(
      (member) => member.personId,
    ),
  );
  const executiveIds = new Set([
    currentFederalTenure(world, "us-vice-president")?.personId,
    ...currentStateExecutiveHolders(world).map((holder) => holder.personId),
  ]);
  const nomineeId = world.personOrder.find(
    (personId) =>
      personId !== presidentId &&
      personId !== playerPersonId &&
      (!requestedCourtId || !senatorIds.has(personId)) &&
      (!requestedCourtId || !executiveIds.has(personId)) &&
      world.history.personalValues.some(
        (value) =>
          value.personId === personId &&
          value.valueId === LIFE_MIND_IDS.privacy &&
          value.orientation === "embraces",
      ),
  )!;
  world = openJudicialSelectionFromProfile(world, {
    seatId,
    kind: "vacancy",
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
    courtId: court.courtId,
    nomineeId,
    seatId,
    selectionRecordId,
  };
}

function dueFor(
  world: ReturnType<typeof nominatedWorld>["world"],
  key: string,
) {
  return world.history.futureDueItems.find(
    (item) => item.transitionKey === key,
  )!;
}

describe("judicial nomination report business", () => {
  let openingWorld: World;
  let playerPersonId: EntityId;
  let pending: ReturnType<typeof nominatedWorld>;
  let heardWorld: ReturnType<typeof nominatedWorld>["world"];
  const registry = createCampaignElectionTransitionRegistry();

  beforeAll(() => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "judicial-federal-nomination",
        startAge: 40,
      }),
    ).game!;
    openingWorld = game.world;
    playerPersonId = game.playerPersonId;
    pending = nominatedWorld(openingWorld, playerPersonId);
    let world = pending.world;
    for (const key of [
      JUDICIAL_SENATE_REFERRAL_TRANSITION,
      JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
      JUDICIAL_COMMITTEE_SESSION_TRANSITION,
      JUDICIAL_PUBLIC_HEARING_TRANSITION,
    ]) {
      world = resolveFutureDueItemsThrough(
        world,
        dueFor(world, key).dueAt,
        registry,
      );
    }
    heardWorld = world;
  });

  it("keeps the hearing separate from report business and a Senate ballot", () => {
    const hearing = heardWorld.history.events.findLast(
      (event) => event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT,
    )!;
    expect(hearing).toBeDefined();
    expect(seatHolderAt(heardWorld, pending.seatId)).toBeNull();
    const senatorId = seatedCongressChamber(heardWorld, "senate")!.body
      .members[0]!.personId!;
    expect(() =>
      recordFederalJudicialSenateBallot(heardWorld, {
        selectionRecordId: pending.selectionRecordId,
        senatorPersonId: senatorId,
        ballot: "yea",
        reason: "Fixture ballot before report",
      }),
    ).toThrow("committee report, Executive Calendar admission");
  });

  it("records report business and calendar admission without a floor vote", () => {
    let world = heardWorld;
    const appointment = senateJudiciaryAppointment(world)!;
    expect(appointment.minorityMemberPersonIds.length).toBeGreaterThanOrEqual(
      2,
    );
    world = {
      ...world,
      control: { kind: "person", personId: appointment.chairPersonId },
    };
    if (
      !world.history.events.some(
        (event) => event.type === JUDICIAL_REPORT_NOTICE_EVENT,
      )
    )
      world = recordControlledJudiciaryReportNotice(
        world,
        pending.selectionRecordId,
      );
    const notice = world.history.events.findLast(
      (event) => event.type === JUDICIAL_REPORT_NOTICE_EVENT,
    )!;
    expect(
      world.history.knowledge.some(
        (row) =>
          row.personId === appointment.chairPersonId &&
          row.eventId === notice.id,
      ),
    ).toBe(true);
    const reportDue = dueFor(world, JUDICIAL_REPORT_TRANSITION);
    expect(reportDue.dueAt >= addDays(notice.occurredAt, 3)).toBe(true);
    expect(() =>
      conductJudicialReportBusiness(world, pending.selectionRecordId),
    ).toThrow("on this date");
    world = resolveFutureDueItemsThrough(world, reportDue.dueAt, registry);
    expect(
      world.history.futureDueItemStates.findLast(
        (state) => state.dueItemId === reportDue.id,
      )?.reasonKey,
    ).toBe("judiciary:player-report-choice-needed");
    expect(
      world.history.events.some(
        (event) => event.type === JUDICIAL_REPORT_SITTING_EVENT,
      ),
    ).toBe(false);
    expect(() =>
      conductJudicialReportBusiness(world, pending.selectionRecordId, {
        attendance: "attend",
        ballot: "report-favorably",
        completionEventId: null,
      }),
    ).toThrow("no performed business attendance basis");
    world = recordControlledJudiciaryReportChoice(
      world,
      pending.selectionRecordId,
      {
        attendance: "attend",
        ballot: "report-favorably",
      },
    );
    const sitting = world.history.events.findLast(
      (event) => event.type === JUDICIAL_REPORT_SITTING_EVENT,
    )!;
    expect(sitting).toBeDefined();
    expect(sitting.tags).toContain(`notice:${notice.id}`);
    expect(
      sitting.tags.some((tag) => tag.startsWith("player-completion:")),
    ).toBe(true);
    expect(
      world.history.events.some(
        (event) =>
          event.type === JUDICIAL_REPORT_PLAYER_CHOICE_EVENT &&
          sitting.tags.includes(`player-choice:${event.id}`),
      ),
    ).toBe(true);
    const report = world.history.events.findLast(
      (event) => event.type === JUDICIAL_REPORT_RESULT_EVENT,
    )!;
    expect(report).toBeDefined();
    expect(report.tags).toContain("result:reported");
    const calendar = world.history.events.findLast(
      (event) => event.type === JUDICIAL_EXEC_CALENDAR_EVENT,
    )!;
    expect(calendar.tags).toContain(`report:${report.id}`);
    expect(dueFor(world, JUDICIAL_FLOOR_TRANSITION)).toBeDefined();
    expect(() =>
      recordFederalJudicialSenateBallot(world, {
        selectionRecordId: pending.selectionRecordId,
        senatorPersonId: appointment.chairPersonId,
        ballot: "yea",
        reason: "The committee reported, but the floor has not sat.",
      }),
    ).toThrow("actual floor sitting");
    expect(
      world.history.events.some(
        (event) => event.type === JUDICIAL_SENATE_BALLOT_EVENT,
      ),
    ).toBe(false);
    expect(seatHolderAt(world, pending.seatId)).toBeNull();
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(
      reloaded.history.events.some((event) => event.id === calendar.id),
    ).toBe(true);
    const floorDue = dueFor(reloaded, JUDICIAL_FLOOR_TRANSITION);
    const floor = resolveFutureDueItemsThrough(
      reloaded,
      floorDue.dueAt,
      registry,
    );
    expect(
      floor.history.futureDueItemStates.findLast(
        (state) => state.dueItemId === floorDue.id,
      )?.reasonKey,
    ).toBe("judiciary:floor-consideration-choice-needed");
    expect(seatHolderAt(floor, pending.seatId)).toBeNull();
    expect(() =>
      conductJudicialReportBusiness(floor, pending.selectionRecordId),
    ).toThrow("on this date");
    expect(() =>
      recordControlledJudicialNominationFloorChoice(
        floor,
        pending.selectionRecordId,
        { attendance: "attend", ballot: "yea", reason: "" },
      ),
    ).toThrow("reason");
    const voted = recordControlledJudicialNominationFloorChoice(
      floor,
      pending.selectionRecordId,
      {
        attendance: "attend",
        ballot: "yea",
        reason: "I heard the public nominee record and support confirmation.",
      },
    );
    const floorSitting = voted.history.events.findLast(
      (event) => event.type === JUDICIAL_FLOOR_SITTING_EVENT,
    )!;
    const playerChoice = voted.history.events.findLast(
      (event) => event.type === JUDICIAL_FLOOR_PLAYER_CHOICE_EVENT,
    )!;
    expect(playerChoice.context.motivation).toBe(
      "I heard the public nominee record and support confirmation.",
    );
    expect(floorSitting.tags).toContain(`calendar:${calendar.id}`);
    expect(floorSitting.tags).toContain(
      `attendee:${appointment.chairPersonId}`,
    );
    expect(
      floorSitting.tags.some((tag) => tag.startsWith("player-completion:")),
    ).toBe(true);
    const ballots = voted.history.events.filter(
      (event) =>
        event.type === JUDICIAL_SENATE_BALLOT_EVENT &&
        event.tags.includes(`selection:${pending.selectionRecordId}`),
    );
    expect(ballots).toHaveLength(
      seatedCongressChamber(voted, "senate")!.body.members.length,
    );
    expect(
      ballots.every((event) =>
        event.tags.includes(`sitting:${floorSitting.id}`),
      ),
    ).toBe(true);
    expect(ballots.every((event) => Boolean(event.context.motivation))).toBe(
      true,
    );
    const result = voted.history.events.findLast(
      (event) => event.type === JUDICIAL_SENATE_RESULT_EVENT,
    )!;
    expect(result).toBeDefined();
    expect(result.tags).toContain(`selection:${pending.selectionRecordId}`);
    expect(
      conductJudicialNominationFloor(voted, pending.selectionRecordId),
    ).toBe(voted);
    for (const type of [
      "judicial.nomination",
      JUDICIAL_CONFIRMATION_HEARING_EVENT,
      JUDICIAL_REPORT_RESULT_EVENT,
      JUDICIAL_SENATE_RESULT_EVENT,
    ]) {
      const milestone = voted.history.events.find(
        (event) =>
          event.type === type &&
          event.tags.includes(`selection:${pending.selectionRecordId}`),
      )!;
      expect(
        voted.history.publications?.some(
          (publication) => publication.sourceEventId === milestone.id,
        ) ?? false,
      ).toBe(true);
    }
    const reopenedFloor = deserializeWorld(serializeWorld(voted));
    expect(reopenedFloor.history.publications).toHaveLength(
      voted.history.publications?.length ?? 0,
    );
    expect(
      reopenedFloor.history.events.filter(
        (event) => event.type === JUDICIAL_SENATE_BALLOT_EVENT,
      ),
    ).toHaveLength(ballots.length);
  });

  it.each(
    FEDERAL_COURTS_PROJECTION.filter(
      (court) => court.courtKind === "court-of-appeals",
    ).map((court) => [court.courtId]),
  )("runs the full saved vacancy chain for circuit %s", (courtId) => {
    const nomination = nominatedWorld(openingWorld, playerPersonId, courtId);
    let world = nomination.world;
    expect(world.judiciary!.courts[courtId]?.sourceRecordId).toBe(courtId);
    expect(seatHolderAt(world, nomination.seatId)).toBeNull();
    // Organize the seated Senate before advancing to the referral date: a
    // same-day consideration due can otherwise let the NPC chair defer first.
    world = organizeSenateJudiciary(world);
    const appointment = senateJudiciaryAppointment(world)!;
    expect(appointment).toBeDefined();
    world = {
      ...world,
      control: { kind: "person", personId: appointment.chairPersonId },
    };
    world = resolveFutureDueItemsThrough(
      world,
      dueFor(world, JUDICIAL_SENATE_REFERRAL_TRANSITION).dueAt,
      registry,
    );
    expect(
      world.history.events.some(
        (event) =>
          event.type === "judicial.senate-referral" &&
          event.tags.includes(`selection:${nomination.selectionRecordId}`),
      ),
    ).toBe(true);
    const considerationDue = dueFor(
      world,
      JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
    );
    world = resolveFutureDueItemsThrough(
      world,
      considerationDue.dueAt,
      registry,
    );
    // No controlled-chair consideration-notice writer exists. The due blocks;
    // the chair's separate public-hearing action is admitted by referral and
    // appointment, without claiming a committee business session occurred.
    expect(
      world.history.futureDueItemStates.findLast(
        (state) => state.dueItemId === considerationDue.id,
      )?.reasonKey,
    ).toBe("judiciary:player-chair-scheduling-choice-needed");
    world = recordControlledJudiciaryChairHearingChoice(
      world,
      nomination.selectionRecordId,
      "announce",
    );
    expect(
      world.history.events.some(
        (event) =>
          event.type === JUDICIAL_PUBLIC_HEARING_NOTICE_EVENT &&
          event.tags.includes(`selection:${nomination.selectionRecordId}`),
      ),
    ).toBe(true);
    const hearingDue = dueFor(world, JUDICIAL_PUBLIC_HEARING_TRANSITION);
    world = resolveFutureDueItemsThrough(world, hearingDue.dueAt, registry);
    expect(
      world.history.futureDueItemStates.findLast(
        (state) => state.dueItemId === hearingDue.id,
      )?.reasonKey,
    ).toBe("judiciary:player-hearing-choice-needed");
    world = recordControlledJudicialHearingParticipation(
      world,
      nomination.selectionRecordId,
      "attend",
    );
    expect(
      world.history.events.some(
        (event) =>
          event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT &&
          event.tags.includes(`selection:${nomination.selectionRecordId}`),
      ),
    ).toBe(true);
    if (
      !world.history.events.some(
        (event) =>
          event.type === JUDICIAL_REPORT_NOTICE_EVENT &&
          event.tags.includes(`selection:${nomination.selectionRecordId}`),
      )
    )
      world = recordControlledJudiciaryReportNotice(
        world,
        nomination.selectionRecordId,
      );
    world = resolveFutureDueItemsThrough(
      world,
      dueFor(world, JUDICIAL_REPORT_TRANSITION).dueAt,
      registry,
    );
    world = recordControlledJudiciaryReportChoice(
      world,
      nomination.selectionRecordId,
      { attendance: "attend", ballot: "report-favorably" },
    );
    const report = world.history.events.find(
      (event) =>
        event.type === JUDICIAL_REPORT_RESULT_EVENT &&
        event.tags.includes(`selection:${nomination.selectionRecordId}`),
    );
    expect(report?.tags, `${courtId}: committee report`).toContain(
      "result:reported",
    );
    const calendar = world.history.events.find(
      (event) =>
        event.type === JUDICIAL_EXEC_CALENDAR_EVENT &&
        event.tags.includes(`selection:${nomination.selectionRecordId}`),
    );
    expect(calendar, `${courtId}: committee report and calendar`).toBeDefined();
    expect(calendar?.tags).toContain(`report:${report?.id}`);
    world = resolveFutureDueItemsThrough(
      world,
      dueFor(world, JUDICIAL_FLOOR_TRANSITION).dueAt,
      registry,
    );
    world = recordControlledJudicialNominationFloorChoice(
      world,
      nomination.selectionRecordId,
      {
        attendance: "attend",
        ballot: "yea",
        reason: `I support the recorded nominee for ${courtId}.`,
      },
    );
    const result = world.history.events.find(
      (event) =>
        event.type === JUDICIAL_SENATE_RESULT_EVENT &&
        event.tags.includes(`selection:${nomination.selectionRecordId}`),
    );
    expect(result?.tags, `${courtId}: Senate result`).toContain(
      "outcome:confirmed",
    );
    expect(
      judicialSelectionStages(world, nomination.selectionRecordId).at(-1),
    ).toMatchObject({ outcome: "completed", outcomeEventId: result?.id });
    const commission = world.history.events.find(
      (event) =>
        event.type === "judicial.commission-issued" &&
        event.tags.includes(`selection:${nomination.selectionRecordId}`),
    );
    expect(commission?.tags, `${courtId}: commission`).toContain(
      `result:${result?.id}`,
    );
    expect(seatHolderAt(world, nomination.seatId)?.personId).toBe(
      nomination.nomineeId,
    );
    const reopened = deserializeWorld(serializeWorld(world));
    expect(seatHolderAt(reopened, nomination.seatId)?.personId).toBe(
      nomination.nomineeId,
    );
    expect(
      judicialSelectionStages(reopened, nomination.selectionRecordId).at(-1),
    ).toMatchObject({ outcome: "completed", outcomeEventId: result?.id });
  });
});
