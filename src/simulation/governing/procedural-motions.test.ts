import { describe, expect, it } from "vitest";

import {
  buildLegislativeVoteRecord,
  measurePosition,
  recordProceduralMotion,
} from "../legislation";
import { minorityPartyProcedureRows } from "../minority-party-procedure";
import { billOnTheFloor, CHAMBER, everyone } from "../vote-bundle.fixture";
import { bodyForChamber } from "../legislation-scenarios";

describe("recorded procedural motions", () => {
  it("records a carried postponement and its return date", () => {
    const setup = billOnTheFloor();
    const chamberKey = CHAMBER;
    const rules = minorityPartyProcedureRows(setup.scenario.pack).find(
      (row) => row.chamberKey === chamberKey,
    )!;
    if (rules.motionBar.kind !== "known")
      throw new Error("The fixture motion threshold is unresolved.");

    const vote = buildLegislativeVoteRecord(setup.world, {
      stableKey: "test:procedural-motion:vote",
      measureId: setup.measureId,
      forum: { kind: "chamber", chamberKey },
      purpose: "procedural-motion",
      threshold: rules.motionBar.value,
      eligibleMembers: bodyForChamber(setup.scenario, chamberKey).members
        .length,
      presentMembers: bodyForChamber(setup.scenario, chamberKey).members.length,
      dispositions: everyone(setup, "yea"),
      provenance: {
        method: "authored-fixture",
        note: "All fixture members support the motion.",
        sourceEntityIds: [],
      },
    });
    const resumeAt = "2026-03-02" as typeof setup.world.currentDate;
    const after = recordProceduralMotion(setup.world, {
      measureId: setup.measureId,
      stableKey: "test:procedural-motion:postpone",
      chamberKey,
      motion: "postpone",
      vote,
      actorLabel: "Minority leader",
      rationale: "The members requested time to review the measure.",
      resumeAt,
    });
    const action = after.history.legislativeActions!.at(-1)!;

    expect(action).toMatchObject({
      kind: "postponed",
      proceduralMotion: "postpone",
      resumeAt,
    });
    expect(after.history.legislativeVotes!.at(-1)).toMatchObject({
      purpose: "procedural-motion",
      outcome: "passed",
    });
    expect(measurePosition(after, setup.measureId).earliestNextFloorDate).toBe(
      resumeAt,
    );
  });
});
