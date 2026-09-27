import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createDemoWorld } from "../demo";
import type { EntityId } from "../types";
import {
  addJudicialCourt,
  changeJudicialCourtRules,
  effectiveCourtRulesAt,
  seatHolderAt,
  seatJudge,
  vacateJudicialSeat,
  vacantSeatsAt,
} from "./courts";
import { judicialSeatId, type JudicialCourtRules } from "./types";

const date = makeIsoDate("2026-01-01");
const courtId = "test:highest-court";
const provisionId = "test:enacted-rule" as EntityId;
const rules = (count: number): JudicialCourtRules => ({
  authorizedSeats: {
    state: "known",
    value: count,
    basis: "game-profile",
    referenceId: "test-profile",
  },
  termYears: { state: "unknown", reason: "not established in fixture" },
  mandatoryRetirementAge: {
    state: "unknown",
    reason: "not established in fixture",
  },
  caseJurisdiction: { state: "unknown", reason: "not established in fixture" },
  selectionRecordId: null,
  amendmentRoute: { state: "unknown", reason: "not established in fixture" },
});

function opening() {
  const world = createDemoWorld("judiciary-seat-contract", { peopleCount: 3 });
  return addJudicialCourt(world, {
    courtId,
    jurisdictionId: world.jurisdictionOrder[0],
    name: "Fixture Highest Court",
    level: "local-highest",
    parentCourtId: null,
    sourceRecordId: null,
    identityBasis: "game-profile",
    createdAt: world.currentDate,
    rules: rules(3),
  });
}

describe("judicial seat contract", () => {
  it("keeps seat IDs and tenure history through a vacancy and replacement", () => {
    let world = opening();
    const seatId = judicialSeatId(courtId, 1);
    const first = world.personOrder[0];
    const second = world.personOrder[1];
    expect(vacantSeatsAt(world, courtId)).toHaveLength(3);
    world = seatJudge(world, {
      seatId,
      personId: first,
      startedAt: world.currentDate,
      selection: {
        path: "initial-world",
        selectionRecordId: null,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: "fixture opening",
      },
      termEndsAt: null,
      retentionDueAt: null,
    });
    expect(seatHolderAt(world, seatId)?.personId).toBe(first);
    expect(() =>
      seatJudge(world, {
        seatId,
        personId: second,
        startedAt: world.currentDate,
        selection: {
          path: "appointment",
          selectionRecordId: null,
          decisionRecordId: null,
          selectingPersonId: null,
          contestId: null,
          note: null,
        },
        termEndsAt: null,
        retentionDueAt: null,
      }),
    ).toThrow("already held");
    world = vacateJudicialSeat(world, {
      seatId,
      vacatedAt: world.currentDate,
      reason: "retirement",
    });
    expect(seatHolderAt(world, seatId)).toBeNull();
    world = seatJudge(world, {
      seatId,
      personId: second,
      startedAt: world.currentDate,
      selection: {
        path: "appointment",
        selectionRecordId: "selection:replacement",
        decisionRecordId: null,
        selectingPersonId: first,
        contestId: null,
        note: null,
      },
      termEndsAt: null,
      retentionDueAt: null,
    });
    expect(seatHolderAt(world, seatId)?.personId).toBe(second);
    expect(
      world.judiciary?.seatTenures.map((tenure) => tenure.personId),
    ).toEqual([first, second]);
  });

  it("retires vacant seats first and preserves an occupied seat", () => {
    let world = opening();
    const occupiedId = judicialSeatId(courtId, 3);
    world = seatJudge(world, {
      seatId: occupiedId,
      personId: world.personOrder[0],
      startedAt: world.currentDate,
      selection: {
        path: "initial-world",
        selectionRecordId: null,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: null,
      },
      termEndsAt: null,
      retentionDueAt: null,
    });
    world = changeJudicialCourtRules(world, {
      courtId,
      effectiveAt: world.currentDate,
      provisionId,
      rules: rules(1),
    });
    expect(world.judiciary?.seats[occupiedId].retiredAt).toBeNull();
    expect(world.judiciary?.seats[judicialSeatId(courtId, 2)].retiredAt).toBe(
      world.currentDate,
    );
    world = vacateJudicialSeat(world, {
      seatId: occupiedId,
      vacatedAt: world.currentDate,
      reason: "retirement",
    });
    expect(world.judiciary?.seats[occupiedId].retiredAt).toBeNull();
    expect(vacantSeatsAt(world, courtId).map((seat) => seat.seatId)).toEqual([
      occupiedId,
    ]);
    expect(world.judiciary?.seatTenures[0].endReason).toBe("retirement");
    expect(effectiveCourtRulesAt(world, courtId)?.recordId).toContain(
      "enacted-rule",
    );
  });

  it("retires the next low-ordinal vacancy during occupied-seat attrition", () => {
    let world = opening();
    for (let ordinal = 1; ordinal <= 3; ordinal += 1) {
      world = seatJudge(world, {
        seatId: judicialSeatId(courtId, ordinal),
        personId: world.personOrder[ordinal - 1],
        startedAt: world.currentDate,
        selection: {
          path: "initial-world",
          selectionRecordId: null,
          decisionRecordId: null,
          selectingPersonId: null,
          contestId: null,
          note: null,
        },
        termEndsAt: null,
        retentionDueAt: null,
      });
    }
    world = changeJudicialCourtRules(world, {
      courtId,
      effectiveAt: world.currentDate,
      provisionId,
      rules: rules(1),
    });
    expect(vacantSeatsAt(world, courtId)).toHaveLength(0);
    world = vacateJudicialSeat(world, {
      seatId: judicialSeatId(courtId, 1),
      vacatedAt: world.currentDate,
      reason: "retirement",
    });
    expect(world.judiciary?.seats[judicialSeatId(courtId, 1)].retiredAt).toBe(
      world.currentDate,
    );
    expect(vacantSeatsAt(world, courtId)).toHaveLength(0);
    world = vacateJudicialSeat(world, {
      seatId: judicialSeatId(courtId, 2),
      vacatedAt: world.currentDate,
      reason: "retirement",
    });
    expect(world.judiciary?.seats[judicialSeatId(courtId, 2)].retiredAt).toBe(
      world.currentDate,
    );
    expect(seatHolderAt(world, judicialSeatId(courtId, 3))?.personId).toBe(
      world.personOrder[2],
    );
  });

  it("uses the canonical Chief Justice tenure, never a parallel seat writer", () => {
    const original = createDemoWorld("judiciary-chief-link");
    const world = addJudicialCourt(original, {
      courtId: "us-supreme-court",
      jurisdictionId: null,
      name: "Supreme Court of the United States",
      level: "federal-supreme",
      parentCourtId: null,
      sourceRecordId: null,
      identityBasis: "game-profile",
      createdAt: original.currentDate,
      rules: rules(9),
    });
    const seatId = judicialSeatId("us-supreme-court", 1);
    expect(world.judiciary?.seats[seatId].linkedOfficeId).toBe(
      "us-chief-justice",
    );
    expect(() =>
      seatJudge(world, {
        seatId,
        personId: world.personOrder[0],
        startedAt: date,
        selection: {
          path: "appointment",
          selectionRecordId: null,
          decisionRecordId: null,
          selectingPersonId: null,
          contestId: null,
          note: null,
        },
        termEndsAt: null,
        retentionDueAt: null,
      }),
    ).toThrow("canonical federal office tenure");
  });
});
