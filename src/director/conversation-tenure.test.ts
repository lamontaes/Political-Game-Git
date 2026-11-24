import { describe, expect, it } from "vitest";
import { tenureYears } from "./conversation";

// A tenure is said in completed years, counted to the anniversary of the day
// the job began, from the start record it cites; under two years nothing is
// said, and never a date.
describe("a job's tenure in completed years", () => {
  const started = (date: string) => ({ date, factId: "hire:fixture" });
  it("says nothing before the second anniversary", () => {
    expect(tenureYears(started("2023-12-31"), "2025-01-01")).toBeUndefined();
    expect(tenureYears(started("2023-01-01"), "2024-12-31")).toBeUndefined();
  });
  it("counts the second year on its anniversary, citing the start record", () => {
    expect(tenureYears(started("2023-01-01"), "2025-01-01")).toEqual({
      text: "2",
      sourceRecordIds: ["hire:fixture"],
    });
  });
  it("counts a year only once its anniversary has come", () => {
    expect(tenureYears(started("2018-03-15"), "2025-03-14")?.text).toBe("6");
    expect(tenureYears(started("2018-03-15"), "2025-03-15")?.text).toBe("7");
  });
  it("says nothing without a start on record", () => {
    expect(tenureYears(null, "2025-03-15")).toBeUndefined();
  });
});
