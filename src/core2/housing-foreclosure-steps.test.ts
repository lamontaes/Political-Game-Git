/**
 * A state with no published foreclosure timing takes its process's median days
 * from filing to sale, not the national average that mixes the two processes.
 */
import { describe, expect, it } from "vitest";
import foreclosureData from "./data/housing/foreclosure.json" with { type: "json" };
import { foreclosureSteps } from "./housing-foreclosure";

const places = foreclosureData.places as Record<
  string,
  {
    process: string | null;
    noticeOfDefaultDays: number | null;
    saleNoticeDays: number | null;
    typicalDaysToComplete: number | null;
  }
>;
const byProcess = foreclosureData.typicalDaysByProcess as Record<
  string,
  { value: number }
>;

describe("foreclosure days to sale", () => {
  it("every place with no published timing takes its process's median, and a judicial state runs far longer than a nonjudicial one", () => {
    let filled = 0;
    for (const [usps, row] of Object.entries(places)) {
      const steps = foreclosureSteps(usps);
      const statutory =
        (row.noticeOfDefaultDays ?? 0) + (row.saleNoticeDays ?? 0);
      const expected = Math.max(
        1,
        statutory,
        row.typicalDaysToComplete ??
          byProcess[row.process ?? ""]?.value ??
          foreclosureData.nationalTypicalDaysToComplete,
      );
      expect(steps.daysToSale, usps).toBe(expected);
      if (row.typicalDaysToComplete === null && byProcess[row.process ?? ""])
        filled += 1;
    }
    expect(filled).toBeGreaterThan(0);
    expect(byProcess.judicial!.value).toBeGreaterThan(
      byProcess.nonjudicial!.value * 5,
    );
  });
});
