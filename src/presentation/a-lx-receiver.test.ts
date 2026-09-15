import { describe, it, expect } from "vitest";
import { suppliedStaffBargainingReview } from "../../tests/fixtures/a-lx-review-world";
import { endSuppliedSeat } from "../../tests/fixtures/supplied-legislative-seat";
import {
  recordOfficeWorkflowPreference,
  recordOfficeVoteInstruction,
  serializeWorld,
  deserializeWorld,
  recordFiledProvision,
} from "../simulation";
import { takeNegotiatedFloorVote } from "./legislative-bargaining-actions";
import { projectOfficeOnboarding } from "./office-onboarding";

describe("A current S/L bargaining receiver with supplied office checkpoint", () => {
  it("records the explicit current instruction through bargaining and retains it after reload; changed text and ended authority refuse", () => {
    const ready = suppliedStaffBargainingReview();
    const preference = recordOfficeWorkflowPreference(ready.world, {
      personId: ready.personId,
      officeRelationshipId: ready.seat.relationshipId,
      votingMode: "prior-instructions-with-exceptions",
      caseworkMode: "staff-routine-player-exceptions",
    });
    if (preference.kind !== "recorded") throw new Error(preference.reason);
    const instruction = recordOfficeVoteInstruction(preference.world, {
      personId: ready.personId,
      officeRelationshipId: ready.seat.relationshipId,
      chamberKey: ready.seat.chamberKey,
      measureId: ready.measureId,
      disposition: "present-not-voting",
    });
    if (instruction.kind !== "recorded") throw new Error(instruction.reason);
    const world = deserializeWorld(serializeWorld(instruction.world));
    const projection = projectOfficeOnboarding(
      world,
      ready.personId,
      ready.measureId,
    );
    expect(projection.briefing.kind).toBe("staffed");
    expect(projection.instructionStatus?.kind).toBe("armed");
    expect(projection.briefing.executedDelegation).toBe(false);
    const result = takeNegotiatedFloorVote(
      world,
      ready.bargaining.seat,
      ready.bargaining.seat.progress,
    );
    const loaded = deserializeWorld(serializeWorld(result.world));
    expect(
      loaded.history
        .legislativeVotes!.at(-1)!
        .dispositions.find((v) => v.personId === ready.personId)?.disposition,
    ).toBe("present-not-voting");
    const changed = recordFiledProvision(world, {
      stableKey: "a-receiver:changed-text",
      measureId: ready.measureId,
      provisionKey: "receiver-control",
      sectionNumber: 99,
      heading: "Changed text control",
      text: "An explicit later filing for the receiver refusal control.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "the stated recipients",
      },
      applicationScope: {
        jurisdictionId: ready.jurisdictionId,
        segmentKey: null,
      },
    });
    const before = serializeWorld(changed);
    expect(() =>
      takeNegotiatedFloorVote(
        changed,
        ready.bargaining.seat,
        ready.bargaining.seat.progress,
      ),
    ).toThrow(/bill has changed/i);
    expect(serializeWorld(changed)).toBe(before);
    const ended = endSuppliedSeat(world);
    const prior = serializeWorld(ended);
    expect(() =>
      takeNegotiatedFloorVote(
        ended,
        ready.bargaining.seat,
        ready.bargaining.seat.progress,
      ),
    ).toThrow(/seat/i);
    expect(serializeWorld(ended)).toBe(prior);
  });
});
