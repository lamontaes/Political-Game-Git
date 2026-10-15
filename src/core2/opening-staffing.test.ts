import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import type { StaffingReceipt } from "./opening-staffing";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";
import { daysAfterStart } from "./tooling/test-days";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-staffing");

const total = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  ) +
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

describe(`staffing to customers in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("trims under-covered businesses, keeps full people's jobs, and every dollar balances", () => {
    const input = generatedOpening(place, {
      twoLevel: true,
      settings: { population: 1500 },
      staffToCustomers: true,
    });
    const receipts = JSON.parse(
      input.placeMetadata!.openingStaffing!,
    ) as StaffingReceipt[];
    for (const row of receipts) {
      expect(row.coverage).toBeLessThan(1);
      expect(row.jobsAfter).toBeGreaterThanOrEqual(1);
      expect(row.jobsAfter).toBeLessThanOrEqual(row.jobsBefore);
    }
    // Full people still hold the jobs their records name.
    const jobs = new Set(input.jobs.map((row) => row.id));
    for (const person of input.people)
      if (person.jobId) expect(jobs.has(person.jobId)).toBe(true);
    const core = createLifeCore(input);
    const start = total(core);
    advanceCore(core, daysAfterStart(31));
    expect(total(core)).toBe(start);
  }, 300_000);
});
