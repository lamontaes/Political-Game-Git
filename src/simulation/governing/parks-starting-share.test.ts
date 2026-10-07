import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { stateJurisdictionForKey } from "../life-places";
import { lawInForce } from "./law-in-force";
import { readFinalEnactedLawTerm } from "./final-law-term-query";
import { deserializeWorld, serializeWorld } from "../serialization";

const questionKey =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";

describe("sourced parks revenue shares", () => {
  it.each([
    ["US-MN", 0.1425],
    ["US-MO", 0.5],
  ] as const)(
    "reads %s through the canonical law reader after reload",
    (place, share) => {
      const game = smallWorld({
        place,
        date: "2026-01-01",
        seed: `parks-starting-share:${place}`,
        questions: [questionKey],
      });
      const proposition = game.world.policyCatalog.propositionOrder.find(
        (id) =>
          game.world.policyCatalog.propositions[id]!.stableKey === questionKey,
      )!;
      const jurisdiction = stateJurisdictionForKey(place)!;
      for (const world of [
        game.world,
        deserializeWorld(serializeWorld(game.world)),
      ]) {
        const law = lawInForce(world, jurisdiction.id, proposition)!;
        expect(law.origin).toBe("in-force-at-start");
        const term = readFinalEnactedLawTerm(world, law, {
          questionKey,
          termKey: "share",
          unit: "ratio",
        });
        expect(term?.value).toBe(share);
        expect(term?.sourceRecordIds).toEqual([law.measureId]);
        expect(
          readFinalEnactedLawTerm(world, law, {
            questionKey,
            termKey: "share",
            unit: "minor",
          }),
        ).toBeNull();
      }
    },
  );
});
