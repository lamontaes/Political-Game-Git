import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { deserializeWorld, serializeWorld } from "../serialization";
import { juvenileCourtAgeRuleAt } from "./juvenile-court";

describe("sourced territorial ordinary juvenile jurisdiction", () => {
  it("reads the recorded ordinary ceiling without granting adult-transfer authority", () => {
    const opened = smallWorld({ place: "US-AS", seed: "o8:juvenile:source" });
    const rule = juvenileCourtAgeRuleAt(opened.world, opened.jurisdictionId);
    expect(rule?.juvenileCeiling).toBe(17);
    expect(rule?.adultAge).toBe(18);
    expect(rule?.estimated).toBe(false);
    const restored = deserializeWorld(serializeWorld(opened.world));
    expect(juvenileCourtAgeRuleAt(restored, opened.jurisdictionId)).toEqual(
      rule,
    );
  });

  it("preserves the ordinary age result after a sampled opening and reload", () => {
    const seed = "o8:juvenile:ordinary:20261002";
    const place = drawRandomPlace(seed);
    const opened = smallWorld({ place: place.key, seed, people: 3 });
    const rule = juvenileCourtAgeRuleAt(opened.world, opened.jurisdictionId);
    expect(rule).not.toBeNull();
    const restored = deserializeWorld(serializeWorld(opened.world));
    expect(juvenileCourtAgeRuleAt(restored, opened.jurisdictionId)).toEqual(
      rule,
    );
    console.info(
      `Opening ${place.key}; seed ${seed}; adult age ${rule?.adultAge}`,
    );
  });
});
