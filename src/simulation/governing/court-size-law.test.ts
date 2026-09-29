import { describe, expect, it } from "vitest";

import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
  type LegislativeScenario,
} from "../legislation-scenarios";
import { addDays } from "../dates";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import {
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
  enrollMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  scheduleCommitteeHearing,
  takeFloorVote,
  transmitMeasure,
} from "../legislation";
import { chamberByKey } from "../legislature-rules";
import { fileRuleChangeProvision } from "../enacted-rule-changes";
import { ensureOpeningJudiciary } from "../judiciary/opening";
import {
  courtById,
  seatHolderAt,
  seatsForCourt,
  vacateJudicialSeat,
} from "../judiciary/courts";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { advanceWorld } from "../world";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this scenario.",
  sourceEntityIds: [] as readonly EntityId[],
};
const KY_SUPREME = "us-ky:highest_court";
const hearingRegistry = createFutureTransitionHandlerRegistry([
  [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
]);

function toFloor(s: LegislativeScenario, world: World, chamberKey: string) {
  const chamber = chamberByKey(s.pack, chamberKey);
  const committeeKey = chamber.committees[0]!.committeeKey;
  const body = bodyForChamber(s, chamberKey);
  const seats = chamber.committees[0]!.appointedMembers;
  let next = referMeasure(world, {
    stableKey: `${chamberKey}:referral`,
    measureId: s.measureId,
    committeeKey,
  });
  const mustHear = chamber.referral.everyMeasureMustBeHeard;
  if (mustHear.kind === "known" && mustHear.value) {
    next = scheduleCommitteeHearing(next, {
      stableKey: `${chamberKey}:hearing`,
      measureId: s.measureId,
      hearingDate: "2026-01-12",
    });
    next = advanceWorld(next, 7, hearingRegistry);
  }
  next = recordCommitteeDisposition(next, {
    stableKey: `${chamberKey}:committee`,
    measureId: s.measureId,
    recommendation: "favorable",
    dispositions: dispositionsFromCounts(committeeMembers(body, seats), {
      yea: seats,
      nay: 0,
    }),
    rationale: "The committee backed the bill.",
    provenance: AUTHORED,
  });
  next = placeMeasureOnCalendar(next, {
    stableKey: `${chamberKey}:calendar`,
    measureId: s.measureId,
  });
  for (const stage of chamber.floorStages) {
    const until = measurePosition(next, s.measureId).earliestNextFloorDate;
    if (until && next.currentDate < until)
      next = advanceWorld(
        next,
        Math.ceil(
          (Date.parse(until) - Date.parse(next.currentDate)) / 86_400_000,
        ),
      );
    next = takeFloorVote(next, {
      stableKey: `${chamberKey}:${stage.stageKey}`,
      measureId: s.measureId,
      dispositions: dispositionsFromCounts(body.members, {
        yea: body.members.length,
        nay: 0,
      }),
      presentMembers: body.members.length,
      electedMembers: body.members.length,
      provenance: AUTHORED,
    });
  }
  return next;
}

/** A Kentucky act setting its supreme court at `seats`, 90 days after enactment. */
function enactCourtSize(seats: number): World {
  const s = createLegislativeScenario("kentucky");
  let world = ensureOpeningJudiciary(s.world);
  world = fileRuleChangeProvision(world, {
    stableKey: "court-size",
    measureId: s.measureId,
    officeKey: KY_SUPREME,
    field: "court.seats",
    value: seats,
  });
  world = toFloor(s, world, "house");
  world = transmitMeasure(world, { stableKey: "t", measureId: s.measureId });
  world = toFloor(s, world, "senate");
  world = enrollMeasure(world, { stableKey: "e", measureId: s.measureId });
  world = presentMeasureToExecutive(world, {
    stableKey: "p",
    measureId: s.measureId,
  });
  world = recordExecutiveAction(world, {
    stableKey: "g",
    measureId: s.measureId,
    action: "signed",
    rationale: "The Governor signed the court bill.",
  });
  return recordEnactment(world, {
    stableKey: "enactment",
    measureId: s.measureId,
    actDesignation: "2026 Ky. Acts ch. 77",
  });
}

function activeSeats(world: World) {
  return seatsForCourt(world, KY_SUPREME).filter((s) => !s.allocationRecordId);
}

describe("Build 27 step 2: a law changes a court's size", () => {
  it("a state act enlarging its supreme court opens new seats on its effective date, not before", () => {
    const enacted = enactCourtSize(9);
    const before = activeSeats(enacted).length;
    expect(before).toBeLessThan(9);
    const resolvedAt =
      enacted.history.legislativeEnactments!.at(-1)!.resolvedAt;
    const dayBefore = Math.max(
      0,
      (Date.parse(addDays(resolvedAt, 89)) - Date.parse(enacted.currentDate)) /
        86_400_000,
    );
    const waiting = advanceWorld(enacted, dayBefore);
    expect(activeSeats(waiting)).toHaveLength(before);
    const operative = advanceWorld(waiting, 2);
    const seats = activeSeats(operative);
    expect(seats).toHaveLength(9);
    expect(
      courtById(operative, KY_SUPREME)!.rules.authorizedSeats,
    ).toMatchObject({ state: "known", value: 9, basis: "enacted-rule" });
    const newSeats = seats.filter(
      (seat) => !seatHolderAt(operative, seat.seatId),
    );
    expect(newSeats).toHaveLength(9 - before);
    const record = operative.history.events.find(
      (event) => event.type === "governing.court-size-changed",
    )!;
    expect(record.summary).toContain(`from ${before} to 9 seats`);
    // Applying again changes nothing.
    expect(activeSeats(advanceWorld(operative, 1))).toHaveLength(9);
    expect(
      activeSeats(deserializeWorld(serializeWorld(operative))),
    ).toHaveLength(9);
  });

  it("a smaller court keeps its sitting judges and retires each seat as it empties", () => {
    const enacted = enactCourtSize(3);
    const before = activeSeats(enacted).length;
    expect(before).toBeGreaterThan(3);
    const operative = advanceWorld(enacted, 91);
    // Nobody is removed: every judge keeps a seat.
    expect(activeSeats(operative)).toHaveLength(before);
    const seat = activeSeats(operative).at(-1)!;
    const left = vacateJudicialSeat(operative, {
      seatId: seat.seatId,
      vacatedAt: operative.currentDate,
      reason: "retirement",
    });
    expect(activeSeats(left)).toHaveLength(before - 1);
    expect(left.judiciary!.seats[seat.seatId]!.retiredAt).toBe(
      left.currentDate,
    );
  });

  it("refuses a Congress-only court for a state bill", () => {
    const s = createLegislativeScenario("kentucky");
    const world = ensureOpeningJudiciary(s.world);
    expect(() =>
      fileRuleChangeProvision(world, {
        stableKey: "scotus",
        measureId: s.measureId,
        officeKey: "us-supreme-court",
        field: "court.seats",
        value: 13,
      }),
    ).toThrow(/only change rules for KY's own offices/);
  });
});
