import { describe, expect, it } from "vitest";

import {
  buildLegislativeVoteRecord,
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  recordCommitteeDisposition,
  recordProceduralMotion,
  referMeasure,
} from "../legislation";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { minorityPartyProcedureRows } from "../minority-party-procedure";
import { billOnTheFloor, CHAMBER, everyone } from "../vote-bundle.fixture";
import { bodyForChamber } from "../legislation-scenarios";
import { decideProceduralMotion, seatedChamberForPack } from "./chamber-votes";

describe("recorded procedural motions", () => {
  it("records sine-die as the actual chamber's procedural roll call", () => {
    const opened = smallWorld({
      place: "US-NE",
      seed: "b12-sine-die-vote",
      date: "2026-01-05",
      offices: ["state-legislature"],
    });
    const pack = legislativePackForJurisdiction(opened.stateJurisdictionId);
    if (!pack) throw new Error("The Nebraska legislature has no rule pack.");
    const chamber = pack.chambers[0]!;
    const seated = seatedChamberForPack(
      opened.world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    );
    if (!seated?.body.members[0]?.personId)
      throw new Error("The Nebraska chamber has no recorded members.");
    let world = introduceMeasure(opened.world, {
      stableKey: "b12:sine-die:measure",
      jurisdictionId: opened.stateJurisdictionId,
      rulePackId: pack.packId,
      designation: "LB 35",
      shortTitle: "Sine-die vote fixture",
      summary: "A measure used to hold the actual procedural roll call.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: chamber.chamberKey,
      sponsorPersonId: seated.body.members[0].personId,
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    const committee = chamber.committees[0]!;
    world = referMeasure(world, {
      stableKey: "b12:sine-die:referral",
      measureId,
      committeeKey: committee.committeeKey,
    });
    world = recordCommitteeDisposition(world, {
      stableKey: "b12:sine-die:committee",
      measureId,
      recommendation: "favorable",
      dispositions: seated.body.members
        .slice(0, committee.appointedMembers)
        .map((member) => ({
          memberKey: member.memberKey,
          personId: member.personId,
          disposition: "yea" as const,
        })),
      rationale: "The committee reported the fixture bill.",
      provenance: {
        method: "authored-fixture",
        note: "The committee result is fixture context for this floor motion.",
        sourceEntityIds: [],
      },
    });
    world = placeMeasureOnCalendar(world, {
      stableKey: "b12:sine-die:calendar",
      measureId,
    });
    expect(measurePosition(world, measureId).phase).toBe("on-floor");
    const after = decideProceduralMotion(world, {
      measureId,
      chamberKey: chamber.chamberKey,
      stableKey: "test:procedural-motion:sine-die",
      motion: "sine-die",
      actorLabel: "Chamber leadership",
      rationale: "The leadership has decided the agenda is complete.",
    });
    const action = after.history.legislativeActions!.at(-1)!;
    const vote = after.history.legislativeVotes!.find(
      (record) => record.id === action.voteId,
    );

    expect(action).toMatchObject({ proceduralMotion: "sine-die" });
    expect(action.kind).toBe(
      vote?.outcome === "passed"
        ? "sine-die-vote-carried"
        : "procedural-motion-failed",
    );
    expect(vote).toMatchObject({
      purpose: "procedural-motion",
      forum: { kind: "chamber", chamberKey: chamber.chamberKey },
      provenance: { method: "member-decisions" },
    });
    expect(vote?.id).toBe(action.voteId);
    // Session completion remains the dated-queue writer's separate record.
    expect(after.history.sessionAdjournments ?? []).toHaveLength(0);
  });

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
