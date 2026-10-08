import { describe, expect, it } from "vitest";
import intervals from "../../../data/research/local-government/council-meeting-intervals.json" with { type: "json" };
import { councilMeetingInterval } from "./council-meeting-interval";
import type { CouncilBodyType } from "./council-meeting-interval";

describe("council meeting interval table", () => {
  it("has a positive interval for every body type and band", () => {
    for (const type of Object.keys(
      intervals.medianIntervalDays,
    ) as CouncilBodyType[]) {
      for (const band of intervals.bands) {
        const days = (
          intervals.medianIntervalDays[type] as Record<string, number>
        )[band.id];
        expect(days).toBeGreaterThan(0);
      }
    }
  });

  it("never meets less often as a place of the same type grows", () => {
    for (const type of Object.keys(
      intervals.medianIntervalDays,
    ) as CouncilBodyType[]) {
      let previous = Infinity;
      for (const population of [100, 5_000, 20_000, 100_000, 500_000]) {
        const { days } = councilMeetingInterval(type, population);
        expect(days).toBeLessThanOrEqual(previous);
        previous = days;
      }
    }
  });

  it("marks every answer as estimated and picks the band by population", () => {
    expect(councilMeetingInterval("city-council", 1_000)).toMatchObject({
      bandId: "under-2500",
      basis: "ESTIMATED FROM AVERAGE",
    });
    expect(councilMeetingInterval("city-council", 2_500).bandId).toBe(
      "2500-9999",
    );
    expect(councilMeetingInterval("city-council", 300_000).days).toBe(7);
  });
});
