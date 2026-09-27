import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { currentPresidentOf } from "../crisis/offices";
import { addDays } from "../dates";
import { resolveFutureDueItemsThrough } from "../future-transitions";
import { seatedCongressChamber } from "../governing/congress-chambers";
import { LIFE_MIND_IDS } from "../life-mind-content";
import { deserializeWorld, serializeWorld } from "../serialization";
import { addJudicialCourt, seatHolderAt } from "./courts";
import { senateJudiciaryAppointment } from "./committee-organization";
import { recordFederalJudicialCandidateResponse } from "./candidate-interview";
import {
  JUDICIAL_SENATE_BALLOT_EVENT,
  JUDICIAL_CONFIRMATION_HEARING_EVENT,
  recordFederalJudicialSenateBallot,
} from "./federal-confirmation";
import {
  JUDICIAL_SENATE_REFERRAL_TRANSITION,
  openJudicialSelectionFromProfile,
  recordFederalJudicialNomination,
} from "./selection";
import {
  JUDICIAL_COMMITTEE_CONSIDERATION_TRANSITION,
  JUDICIAL_COMMITTEE_SESSION_TRANSITION,
} from "./senate-referral";
import { JUDICIAL_PUBLIC_HEARING_TRANSITION } from "./senate-hearing-process";
import {
  JUDICIAL_EXEC_CALENDAR_EVENT,
  JUDICIAL_FLOOR_TRANSITION,
  JUDICIAL_REPORT_NOTICE_EVENT,
  JUDICIAL_REPORT_PLAYER_CHOICE_EVENT,
  JUDICIAL_REPORT_RESULT_EVENT,
  JUDICIAL_REPORT_SITTING_EVENT,
  JUDICIAL_REPORT_TRANSITION,
  conductJudicialReportBusiness,
  recordControlledJudiciaryReportChoice,
  recordControlledJudiciaryReportNotice,
} from "./senate-committee-report";
import { judicialSeatId } from "./types";

function nominatedWorld() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "judicial-federal-nomination",
      startAge: 40,
    }),
  ).game!;
  let world = game.world;
  const courtId = "fixture:report-business-district";
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
  return { world, seatId, selectionRecordId };
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
  let pending: ReturnType<typeof nominatedWorld>;
  let heardWorld: ReturnType<typeof nominatedWorld>["world"];
  const registry = createCampaignElectionTransitionRegistry();

  beforeAll(() => {
    pending = nominatedWorld();
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
  });
});
