/**
 * Three facts from the merge audit (item 18), each read back from the data:
 * Connecticut bills property tax July 1 and January 1; Michigan's municipal
 * filing deadline is the latest a charter city files, so it is an estimate,
 * not SOURCED; and the town business books match the IRS's 2022 corporation
 * returns. A place is drawn from all 56 for the rows every place has; set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import filingDeadlines from "./data/elections/filing-deadlines.json" with { type: "json" };
import { propertyTaxDueDates } from "./housing-property-tax";
import { parameter } from "./parameters";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("the drawn place has property-tax dates and a filing rule, each with a tag and a source", () => {
  const place = drawPlace(seed, "audit-18");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const dates = propertyTaxDueDates(place.state.replace(/^US-/, ""));
  expect(["SOURCED", "ESTIMATED"], where).toContain(dates.tag);
  expect(dates.estimatedFrom.length, where).toBeGreaterThan(0);
  const rule = (
    filingDeadlines.places as Record<string, { tag: string; citation: string }>
  )[place.state];
  expect(rule, where).toBeDefined();
  expect(["SOURCED", "ESTIMATED"], where).toContain(rule!.tag);
  expect(rule!.citation.length, where).toBeGreaterThan(0);
});

it("Connecticut property tax is billed July 1 and January 1", () => {
  const ct = propertyTaxDueDates("CT");
  expect(ct.installments).toBe(2);
  expect(ct.dueDates).toEqual([
    { month: 7, day: 1 },
    { month: 1, day: 1 },
  ]);
  expect(ct.tag).toBe("ESTIMATED");
});

it("Michigan's filing deadline is an estimate, since charter cities that elect at the primary file earlier", () => {
  const mi = (
    filingDeadlines.places as Record<
      string,
      { tag: string; estimatedFrom?: string }
    >
  )["US-MI"]!;
  expect(mi.tag).toBe("ESTIMATED");
  expect(mi.estimatedFrom).toContain("primary");
});

it("the town business books carry the IRS 2022 margin, pay and sales cost for retail and restaurants", () => {
  // IRS Statistics of Income, corporation returns 2022, Table 5.1: net income
  // over receipts, officers' pay plus salaries over receipts, sales cost.
  const cell = (kind: string) =>
    ["Margin", "PayrollShare", "SalesCostShare"].map((part) =>
      parameter(`businessIrs${kind}${part}`),
    );
  expect(cell("Retail")).toEqual([0.0455, 0.098, 0.826]);
  expect(cell("Restaurant")).toEqual([0.0571, 0.219, 0.547]);
  expect(cell("Manufacturing")).toEqual([0.1433, 0.064, 0.841]);
});
