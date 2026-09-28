import { describe, expect, it } from "vitest";
import { isColdMonth, placeRule, placeWear } from "./dress-code";
import { SCENE_REGISTRY } from "./scene-registry";

describe("what people wear where", () => {
  it("has a dress code for every registered place", () => {
    const untagged = [...SCENE_REGISTRY.scenes.keys()].filter(
      (sceneId) => placeRule(sceneId) === null,
    );
    expect(untagged).toEqual([]);
  });

  it("dresses people for the place and the season", () => {
    expect(placeWear("legislative-chamber-production", "2026-07-01")).toBe(
      "formal",
    );
    expect(placeWear("courtroom-empty-production", "2026-07-01")).toBe(
      "formal",
    );
    expect(placeWear("executive-office-candidate", "2026-07-01")).toBe(
      "formal",
    );
    expect(placeWear("shared-workroom-office-production", "2026-07-01")).toBe(
      "business",
    );
    expect(placeWear("campaign-storefront-production", "2026-07-01")).toBe(
      "business",
    );
    expect(
      placeWear("residence-suburban-house-midday-wave2", "2026-01-15"),
    ).toBe("casual");
    // Outdoors: everyday clothes in summer, a coat in winter.
    expect(placeWear("park-community-pavilion-candidate", "2026-07-01")).toBe(
      "casual",
    );
    expect(placeWear("park-community-pavilion-candidate", "2026-01-15")).toBe(
      "cold",
    );
    expect(isColdMonth("2026-11-02")).toBe(true);
    expect(isColdMonth("2026-04-02")).toBe(false);
  });
});
