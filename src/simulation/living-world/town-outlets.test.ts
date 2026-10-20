import { describe, expect, it } from "vitest";
import { lifePlaces } from "../life-places";
import { placeReferencePopulation } from "../nationwide-world/place-population";
import { localBusinessSupplyFor } from "../local-business-counts";
import { TOWN_WORKPLACES, workplaceOutlets } from "./town-employment";

const KINDS: Record<string, readonly string[]> = {
  construction: ["construction"],
  retail: ["grocery", "hardware"],
  professional: ["law-office", "accounting"],
  restaurant: ["diner"],
  repair: ["auto-repair"],
  "personal-care": ["salon"],
};

describe("a town's outlets follow its county's establishment rates", () => {
  it("equal the rounded rate at the Census size for towns of every size, and never fall under one", () => {
    const places = lifePlaces().filter((place) => {
      if (place.scope !== "locality") return false;
      const reference = placeReferencePopulation(place.sourceGeoid ?? "");
      return reference !== null && reference.value > 0;
    });
    // A spread of sizes, drawn by position so the test names no place.
    const step = Math.floor(places.length / 12);
    const picked = Array.from({ length: 12 }, (_, i) => places[i * step]!);
    let bigger = 0;
    for (const place of picked) {
      const town = place.context.jurisdiction.id;
      const supply = localBusinessSupplyFor(town);
      if (!supply) continue;
      for (const workplace of TOWN_WORKPLACES) {
        const kinds = KINDS[workplace.key];
        const outlets = workplaceOutlets(town, workplace);
        if (!kinds) {
          expect(outlets).toBe(workplace.outlets);
          continue;
        }
        const expected = supply
          .filter((row) => kinds.includes(row.kind))
          .reduce((sum, row) => sum + row.expected, 0);
        expect(outlets).toBe(Math.max(1, Math.round(expected)));
        if (outlets > workplace.outlets) bigger += 1;
      }
    }
    expect(bigger).toBeGreaterThan(0);
  });
});
