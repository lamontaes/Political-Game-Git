import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import { juvenileCourtAgeRuleAt } from "./juvenile-court";

describe("sourced territorial ordinary juvenile jurisdiction", () => {
  const places = lifePlaceStateIdentities();

  it("covers all 56 jurisdiction keys", () => {
    expect(places).toHaveLength(56);
    expect(new Set(places.map((place) => place.jurisdictionKey)).size).toBe(56);
  });

  it.each(places)(
    "preserves the ordinary age result after opening and reload in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const seed = `o8:juvenile:ordinary:20261002:${jurisdictionKey}`;
      const opened = smallWorld({ place: jurisdictionKey, seed, people: 3 });
      const rule = juvenileCourtAgeRuleAt(opened.world, opened.jurisdictionId);
      expect(rule).not.toBeNull();
      if (jurisdictionKey === "US-AS") {
        expect(rule?.juvenileCeiling).toBe(17);
        expect(rule?.adultAge).toBe(18);
        expect(rule?.estimated).toBe(false);
      }
      const restored = deserializeWorld(serializeWorld(opened.world));
      expect(juvenileCourtAgeRuleAt(restored, opened.jurisdictionId)).toEqual(
        rule,
      );
    },
  );
});
