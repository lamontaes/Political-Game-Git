import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lifePlaceStateIdentities } from "../life-places";
import type { World } from "../types";
import {
  FUEL_TAX_EROSION_PER_YEAR,
  motorFuelShare,
  roadChargeFactor,
} from "./road-usage-charge";
import type { PublicBudgetGovernment } from "./store";

describe("road-charge budget level scope", () => {
  const opened = makeIsoDate("2026-01-01");
  const later = makeIsoDate("2027-01-01");
  const world = {} as World;

  it("preserves recorded state-share erosion across all starting places", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places) {
      const government = {
        level: "state",
        stateKey: place.jurisdictionKey,
        years: [{ adoptedOn: opened }],
      } as unknown as PublicBudgetGovernment;
      const expected =
        1 -
        motorFuelShare(place.jurisdictionKey) *
          (1 - Math.pow(1 - FUEL_TAX_EROSION_PER_YEAR, 365 / 365.25));
      expect(roadChargeFactor(world, government, later)).toBeCloseTo(expected);
    }
  });

  it.each(["county", "city"] as const)(
    "does not turn the state fuel-tax estimate into a %s own-tax effect",
    (level) => {
      // No state share, adoption date, or law packet is needed for an
      // excluded level. A reader crossing that boundary would throw here.
      const government = { level } as PublicBudgetGovernment;
      expect(roadChargeFactor(world, government, later)).toBe(1);
    },
  );
});
