import { describe, expect, it } from "vitest";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import type { EntityId, World } from "../types";
import { legislativeSittingHandler } from "./legislative-sittings";

const measure = (id: string): EntityId => id as EntityId;

type TestWorld = World & { readonly sequence: readonly string[] };

function worldWithSequence(sequence: readonly string[] = []): TestWorld {
  return { sequence } as unknown as TestWorld;
}

describe("the generic legislative sitting loop", () => {
  it("takes eligible measures in calendar order against the changing world", () => {
    const started = worldWithSequence();
    const visited: string[] = [];

    const ended = legislativeSittingHandler<readonly string[]>(started, {
      chambers: US_CONGRESS_RULE_PACK.chambers,
      session: US_CONGRESS_RULE_PACK.session,
      measureIds: [measure("first"), measure("player-held"), measure("second")],
      eligible: (_world, measureId) => measureId !== "player-held",
      takeStep: (current, measureId) => {
        visited.push(measureId);
        return [...(current as TestWorld).sequence, measureId];
      },
      applyResult: (current, _measureId, sequence) =>
        worldWithSequence(sequence),
    });

    expect(visited).toEqual(["first", "second"]);
    expect((ended as TestWorld).sequence).toEqual(["first", "second"]);
  });

  it("refuses to run without admitted body rules", () => {
    const started = worldWithSequence();
    let called = false;

    const ended = legislativeSittingHandler(started, {
      chambers: [],
      session: US_CONGRESS_RULE_PACK.session,
      measureIds: [measure("first")],
      eligible: () => true,
      takeStep: () => {
        called = true;
        return null;
      },
      applyResult: (current) => current,
    });

    expect(called).toBe(false);
    expect(ended).toBe(started);
  });
});
