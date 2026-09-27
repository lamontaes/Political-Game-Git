import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { recordWorldEvent } from "../world";
import { addJudicialCourt } from "./courts";
import {
  judicialSelectionById,
  judicialSelectionProgress,
  openJudicialSelection,
  recordJudicialSelectionStage,
} from "./selection";
import type { JudicialSelectionPlan } from "./selection";
import { judicialSeatId } from "./types";

const courtId = "fixture:judicial-selection";
const sourceRecordId = "fixture:judicial-selection-source";
const seatId = judicialSeatId(courtId, 1);
const plan: JudicialSelectionPlan = {
  sourceRecordId,
  pathId: "default",
  stages: [
    { order: 1, mechanism: "EXECUTIVE_NOMINATION" },
    { order: 2, mechanism: "LEGISLATIVE_CONFIRMATION" },
  ],
};

function opening() {
  const world = createDemoWorld("judicial-selection-stage-order", {
    peopleCount: 3,
  });
  return addJudicialCourt(world, {
    courtId,
    jurisdictionId: world.jurisdictionOrder[0],
    name: "Fixture Court",
    level: "local-highest",
    parentCourtId: null,
    sourceRecordId,
    identityBasis: "sourced",
    createdAt: world.currentDate,
    rules: {
      authorizedSeats: {
        state: "known",
        value: 1,
        basis: "game-profile",
        referenceId: "fixture:size",
      },
      termYears: { state: "unknown", reason: "fixture" },
      mandatoryRetirementAge: { state: "unknown", reason: "fixture" },
      caseJurisdiction: { state: "unknown", reason: "fixture" },
      selectionRecordId: sourceRecordId,
      amendmentRoute: { state: "unknown", reason: "fixture" },
    },
  });
}

describe("judicial selection lifecycle", () => {
  it("preserves the ordered path and leaves an unconfirmed seat vacant", () => {
    let world = opening();
    const candidateId = world.personOrder[0];
    world = openJudicialSelection(world, {
      seatId,
      kind: "new-seat",
      plan,
      candidatePersonIds: [candidateId],
    });
    const selection = world.judiciary!.selections[0]!;
    expect(judicialSelectionById(world, selection.recordId)).toEqual(selection);
    expect(judicialSelectionProgress(world, selection.recordId, plan)).toEqual({
      status: "pending",
      nextOrder: 1,
    });
    expect(() =>
      openJudicialSelection(world, {
        seatId,
        kind: "new-seat",
        plan,
        candidatePersonIds: [candidateId],
      }),
    ).toThrow("already pending");
    expect(() =>
      recordJudicialSelectionStage(world, {
        selectionRecordId: selection.recordId,
        plan,
        occurredAt: world.currentDate,
        actorPersonId: world.personOrder[1],
        candidatePersonId: candidateId,
        outcome: "completed",
        decisionRecordId: null,
        electionContestId: null,
        outcomeEventId: null,
      }),
    ).toThrow("needs a recorded decision");
    world = recordWorldEvent(world, {
      stableKey: "fixture:judicial-nomination",
      type: "judicial.fixture-nomination",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0],
      involvedEntityIds: [candidateId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "A fixture nomination occurred.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    world = recordJudicialSelectionStage(world, {
      selectionRecordId: selection.recordId,
      plan,
      occurredAt: world.currentDate,
      actorPersonId: world.personOrder[1],
      candidatePersonId: candidateId,
      outcome: "completed",
      decisionRecordId: null,
      electionContestId: null,
      outcomeEventId: world.history.events.at(-1)!.id,
    });
    expect(world.judiciary!.selectionStages[0]!.mechanism).toBe(
      "EXECUTIVE_NOMINATION",
    );
    expect(judicialSelectionProgress(world, selection.recordId, plan)).toEqual({
      status: "pending",
      nextOrder: 2,
    });
    expect(world.judiciary!.seatTenures).toHaveLength(0);
  });
});
