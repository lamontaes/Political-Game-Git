import { describe, expect, it } from "vitest";
import foreclosureData from "./data/housing/foreclosure.json" with { type: "json" };
import { foreclosureSteps } from "./housing-foreclosure";

type Place = { process: string; typicalDaysToComplete: number | null };
const places = foreclosureData.places as unknown as Record<string, Place>;

// A place with no published average takes its process's median, not the
// nation's: every one of the 56 places, drawn from the data, never named here.
describe("days from first filing to sale", () => {
  it("keeps a place's own average and fills the rest from its process's median", () => {
    const median = (process: string) => {
      const days = Object.values(places)
        .filter(
          (p) => p.process === process && p.typicalDaysToComplete !== null,
        )
        .map((p) => p.typicalDaysToComplete!)
        .sort((a, b) => a - b);
      const mid = days.length >> 1;
      return days.length % 2 ? days[mid]! : (days[mid - 1]! + days[mid]!) / 2;
    };
    let filled = 0;
    for (const [usps, place] of Object.entries(places)) {
      const steps = foreclosureSteps(usps);
      if (place.typicalDaysToComplete !== null) {
        expect(steps.daysToSale, usps).toBeGreaterThanOrEqual(
          place.typicalDaysToComplete,
        );
        continue;
      }
      const own = Object.values(places).some(
        (p) => p.process === place.process && p.typicalDaysToComplete !== null,
      );
      if (!own) continue;
      filled += 1;
      expect(steps.daysToSale, usps).toBeGreaterThanOrEqual(
        Math.round(median(place.process)),
      );
      // Not the nation's all-process average unless the process median is that.
      if (
        median(place.process) !== foreclosureData.nationalTypicalDaysToComplete
      )
        expect(steps.daysToSale, usps).not.toBe(
          foreclosureData.nationalTypicalDaysToComplete,
        );
    }
    expect(filled).toBeGreaterThan(0);
  });
});
