import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { commissionPoll } from "./polls";
import {
  decideRecordedVoterBallot,
  type RecordedVoterCountInput,
} from "./election-contests";
import type { EntityId } from "./types";
import { selectedPollRespondents, worstCasePollMarginOfError95 } from "./polls";

describe("poll sampling and reported uncertainty", () => {
  it("selects the same registered respondents for the same poll key", () => {
    const world = createDemoWorld("poll-selection-test");
    const jurisdictionId = world.jurisdictionOrder[0]!;
    const input = [
      world,
      jurisdictionId,
      world.currentDate,
      12,
      "poll:governor:2026",
    ] as const;
    const first = selectedPollRespondents(...input);
    const second = selectedPollRespondents(...input);

    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
    expect(first.every((id) => world.personOrder.includes(id))).toBe(true);
    expect(first.length).toBeLessThanOrEqual(12);
  });

  it("uses the worst-case 95% margin for completed interviews only", () => {
    expect(worstCasePollMarginOfError95(0)).toBeNull();
    expect(worstCasePollMarginOfError95(100)).toBeCloseTo(0.098, 10);
    expect(worstCasePollMarginOfError95(400)).toBeCloseTo(0.049, 10);
    expect(() => worstCasePollMarginOfError95(-1)).toThrow();
  });

  it("exposes the election count's saved-reasons decision without outcome noise", () => {
    const world = createDemoWorld("poll-shared-ballot-test");
    const input: RecordedVoterCountInput = {
      stableKey: "poll-shared-ballot:contest",
      jurisdictionId: world.jurisdictionOrder[0]!,
      electionDate: world.currentDate,
      candidatePersonIds: world.personOrder.slice(1, 3),
    };
    const evaluation = decideRecordedVoterBallot(
      world,
      input,
      world.personOrder[0]!,
    );

    expect(evaluation).not.toBeNull();
    expect(evaluation?.context.decisionType).toBe("election.vote");
    expect(evaluation?.context.randomness).toBe("none");
    expect(evaluation?.rngVersion).toBe("decision-rng-v1");
  });

  it("keeps commissioning blocked until a real payee and place-price basis exist", () => {
    const world = createDemoWorld("poll-commission-blocker-test");

    expect(() =>
      commissionPoll(world, {
        sponsorId: world.personOrder[0]!,
        contestId: "contest:not-present" as EntityId,
        sampleSize: 100,
        fieldedAt: world.currentDate,
      }),
    ).toThrow(
      "Cannot commission a paid poll yet: no modeled polling vendor/resource endpoint or researched place-wage price adjustment exists.",
    );
  });
});
