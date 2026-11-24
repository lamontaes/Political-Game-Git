import { describe, expect, it } from "vitest";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import { realLocalities } from "../core2/places";
import { backdropFor } from "./scene";
import type { CoreState } from "../core2/types";

const regions = Object.entries(
  scenePlaces.regionalVariants as unknown as Record<string, string[]>,
).filter(([variant]) => variant !== "about");
const town = (placeKey: string) =>
  ({ placeMetadata: { placeKey } }) as unknown as CoreState;
/** A real town in the state, drawn at random each run. */
function townIn(usps: string): string {
  const keys = realLocalities()
    .filter((row) => row.stateJurisdictionKey === `US-${usps}`)
    .map((row) => row.key);
  return keys[Math.floor(Math.random() * keys.length)]!;
}

describe("a place is drawn in its region's own character", () => {
  it("has a painting for every region it names, over its own midday painting", () => {
    for (const [variant] of regions)
      expect(
        manifest.backdrops.some((row) => row.variant === variant),
        variant,
      ).toBe(true);
  });

  it("draws the region's rebuild by day in every state of the region, and the plain place elsewhere", () => {
    for (const [variant, states] of regions) {
      const places = manifest.backdrops
        .filter((row) => row.variant === variant)
        .map((row) => row.place);
      for (const usps of states) {
        const key = townIn(usps);
        for (const place of places) {
          expect(backdropFor(town(key), place, 12 * 60).variant, key).toBe(
            variant,
          );
          // By night a place painted at night is shown at night.
          const night = manifest.backdrops.some(
            (row) => row.place === place && row.variant === "night",
          );
          if (night)
            expect(backdropFor(town(key), place, 0).variant).toBe("night");
        }
      }
    }
    // A state no region names: the place as painted.
    const named = new Set(regions.flatMap(([, states]) => states));
    const plain = ["OH", "VA", "MI", "IN"].find((usps) => !named.has(usps))!;
    for (const [variant] of regions)
      for (const row of manifest.backdrops.filter((r) => r.variant === variant))
        expect(
          backdropFor(town(townIn(plain)), row.place, 12 * 60).variant,
        ).toBe("midday");
  });
});
