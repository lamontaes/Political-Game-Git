import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  recordedGovernorVetoPreview,
  recordedOverridePreview,
} from "../../tests/fixtures/session23-executive-veto";
import { decideGoverningMatter } from "../simulation/governing/state-governing";
import { BILL_RETURN } from "../simulation/governing/governor-bill-decision";
import { itemVetoPower } from "../simulation/governing/item-veto";
import { projectExecutiveBillResults } from "./executive-bill-results";

describe("the actual governor override result", () => {
  it.each(["NE", "IN"])(
    "uses canonical steps and recorded votes in %s",
    (state) => {
      const seed = `session23-part5-veto-fixture-${state}`;
      const start = smallWorld({
        place: state,
        people: 4,
        seed,
        offices: ["governor", "state-legislature"],
      });
      const world = recordedGovernorVetoPreview(start.world, seed);
      const before = projectExecutiveBillResults(world, start.personId)[0]!;
      expect(before.overrideVotes).toEqual([]);
      const returned = decideGoverningMatter(
        world,
        before.matterId,
        BILL_RETURN,
      );
      if (!returned.ok) throw new Error(returned.reason);
      const overridden = recordedOverridePreview(returned.world, seed);
      const actual = projectExecutiveBillResults(
        overridden,
        start.personId,
      )[0]!;
      expect(actual.overrideActions.at(-1)!.kind).toBe("override-succeeded");
      expect(actual.overrideVotes.length).toBeGreaterThan(0);
      expect(
        actual.overrideVotes.every(
          (vote) =>
            vote.provenance.method === "authored-fixture" &&
            vote.outcome === "passed",
        ),
      ).toBe(true);
      expect(
        itemVetoPower(
          overridden.history.legislativeMeasures!.find(
            (measure) => measure.id === actual.measureId,
          )!.rulePackId,
        ) !== null,
      ).toBe(state === "NE");
    },
  );
});
