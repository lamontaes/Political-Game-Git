import { describe, expect, it } from "vitest";
import { readFinalEnactedLawTerm } from "./automatic-legislation";
import type { LawInForce } from "./law-in-force";
import type { World } from "../types";
import { makeIsoDate } from "../dates";
const questionKey = "us-policy-positions:labor-workforce.raise-minimum-wage";
const law = (operativeAt: string): LawInForce => ({
  origin: "in-force-at-start",
  measureId: `starting-law:US-CT:${questionKey}`,
  answer: "yes",
  operativeAt: makeIsoDate(operativeAt),
  operativeBasis: "enacted-date",
  level: "state-statute",
});
const world = { currentDate: makeIsoDate("2027-01-08") } as World;
describe("Connecticut starting wage terms retain their legal date", () => {
  it("reads December payroll at the 2026 rate even when observed in 2027", () => {
    expect(
      readFinalEnactedLawTerm(world, law("2026-01-01"), {
        questionKey,
        termKey: "target",
        unit: "minor/hour",
        onDate: makeIsoDate("2026-12-26"),
      }),
    ).toMatchObject({
      value: 1694,
      unit: "minor/hour",
      provisionId: null,
      sourceRecordIds: [`starting-law:US-CT:${questionKey}`],
    });
  });
  it("reads the separately announced 2027 phase only after it takes effect", () => {
    expect(
      readFinalEnactedLawTerm(world, law("2027-01-01"), {
        questionKey,
        termKey: "target",
        unit: "minor/hour",
        onDate: makeIsoDate("2027-01-01"),
      })?.value,
    ).toBe(1748);
  });
  it("does not supply an unsourced earlier numeric rate", () => {
    expect(
      readFinalEnactedLawTerm(world, law("2000-01-01"), {
        questionKey,
        termKey: "target",
        unit: "minor/hour",
        onDate: makeIsoDate("2025-12-31"),
      }),
    ).toBeNull();
  });
  it("does not attach the later phase to an earlier payroll activity", () => {
    expect(
      readFinalEnactedLawTerm(world, law("2027-01-01"), {
        questionKey,
        termKey: "target",
        unit: "minor/hour",
        onDate: makeIsoDate("2026-12-26"),
      }),
    ).toBeNull();
  });
});
