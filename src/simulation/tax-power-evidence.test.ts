import { expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { taxPowerEvidenceFor } from "./tax-policy";
const wage = (key: string, date: string) =>
  taxPowerEvidenceFor(key, {
    instrument: "wage-income",
    asOf: makeIsoDate(date),
  });
it("retains the explicit 2026 federal guide interval without a state proxy", () => {
  expect(wage("US", "2026-01-01")).toMatchObject({
    jurisdictionKey: "US",
    level: "FEDERAL",
    instrument: "wage-income",
  });
  expect(wage("US", "2026-12-31")).not.toBeNull();
  expect(wage("US", "2025-12-31")).toBeNull();
  expect(wage("US", "2027-01-01")).toBeNull();
});
it("does not extend an observed state source to earlier or later dates", () => {
  expect(wage("US-AL", "2026-10-01")).toMatchObject({
    jurisdictionKey: "US-AL",
    level: "STATE",
  });
  expect(wage("US-AL", "2026-09-30")).toBeNull();
  expect(wage("US-AL", "2026-10-02")).toBeNull();
});
it("refuses missing or publication-blocked sources and other instruments", () => {
  expect(wage("US-AZ", "2026-10-01")).toBeNull();
  expect(wage("US-IL", "2026-10-01")).toBeNull();
  expect(wage("US-AK", "2026-10-01")).toBeNull();
  expect(
    taxPowerEvidenceFor("US-AL", {
      instrument: "property",
      asOf: makeIsoDate("2026-10-01"),
    }),
  ).toBeNull();
});
