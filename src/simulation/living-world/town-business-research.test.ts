import { describe, expect, it } from "vitest";
import research from "../../../data/research/money/town-business-a71-2026.json" with { type: "json" };
import creditRequest from "../../../docs/research/requests/small-business-credit-line-size.json" with { type: "json" };
import salesRequest from "../../../docs/research/requests/local-sales-response-to-town-pay.json" with { type: "json" };
import { TOWN_FINANCE_POLICY } from "./town-finances";

const SOURCED = "SOURCED";
const ESTIMATED = "ESTIMATED FROM AVERAGE";

interface KindRow {
  readonly basis: string;
  readonly industry: string;
  readonly firms: number;
  readonly p25Days: number;
  readonly medianDays: number;
  readonly p75Days: number;
  readonly method?: string;
}

/** A lookup that must exist: fails the test, and narrows the type, when it does not. */
function defined<T>(value: T | undefined, label: string): T {
  expect(value, label).toBeDefined();
  if (value === undefined) throw new Error(`${label} is missing`);
  return value;
}

function cited(row: {
  readonly source: string;
  readonly citation: string;
  readonly quote: string;
}): void {
  expect(row.source).toMatch(/^https:\/\//);
  expect(row.citation.length).toBeGreaterThan(20);
  expect(row.quote.length).toBeGreaterThan(20);
  expect(row.quote.length).toBeLessThan(1200);
}

const credit = research.answers["small-business-credit-line-size"];
const sales = research.answers["local-sales-response-to-town-pay"];

describe("town business research (A71)", () => {
  it("answers each filed A71 question and leaves the game's placeholders as they stand", () => {
    expect(Object.keys(research.answers).sort()).toEqual(
      [creditRequest.questionId, salesRequest.questionId].sort(),
    );
    expect(credit.placeholderInGame).toBe(
      TOWN_FINANCE_POLICY.business.creditLineDaysOfRevenue,
    );
    expect(sales.placeholderInGame).toBe(
      TOWN_FINANCE_POLICY.business.localDemandElasticity,
    );
  });

  it("sizes a credit line in days of revenue from a cited source, for every business kind the game opens", () => {
    expect(credit.basis).toBe(SOURCED);
    cited(credit);
    cited(credit.shareCheck);
    cited(credit.recentCheck);
    expect(credit.method.length).toBeGreaterThan(40);
    expect(credit.p25).toBeLessThanOrEqual(credit.value);
    expect(credit.value).toBeLessThanOrEqual(credit.p75);
    expect(credit.shareOfFirmsHoldingALine).toBeGreaterThan(0);
    expect(credit.shareOfFirmsHoldingALine).toBeLessThanOrEqual(1);

    const kinds = credit.byGameKind as Readonly<Record<string, KindRow>>;
    expect(Object.keys(kinds).sort()).toEqual(
      Object.keys(TOWN_FINANCE_POLICY.business.cashBufferDays).sort(),
    );
    const all = defined(kinds["*"], "all-industry row");
    expect(all.basis).toBe(SOURCED);
    expect(all.medianDays).toBe(credit.value);
    for (const [kind, row] of Object.entries(kinds)) {
      expect([SOURCED, ESTIMATED], kind).toContain(row.basis);
      expect(row.p25Days, kind).toBeLessThanOrEqual(row.medianDays);
      expect(row.medianDays, kind).toBeLessThanOrEqual(row.p75Days);
      if (row.basis === ESTIMATED) {
        expect(row.method, kind).toContain(ESTIMATED);
        expect([row.p25Days, row.medianDays, row.p75Days], kind).toEqual([
          all.p25Days,
          all.medianDays,
          all.p75Days,
        ]);
      } else {
        expect(row.firms, kind).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it("gives the local sales response as a cited elasticity with its range", () => {
    expect(sales.basis).toBe(SOURCED);
    cited(sales);
    expect(sales.method.length).toBeGreaterThan(40);
    expect(sales.low).toBeLessThanOrEqual(sales.value);
    expect(sales.value).toBeLessThanOrEqual(sales.high);
    expect(sales.high).toBeLessThanOrEqual(sales.upperBoundOls);
    expect(sales.low).toBeCloseTo(sales.value - 1.96 * sales.standardError, 2);
    expect(sales.high).toBeCloseTo(sales.value + 1.96 * sales.standardError, 2);
    for (const row of Object.values(sales.byFirmGroup)) {
      expect(row.quote.length).toBeGreaterThan(20);
      expect(row.standardError).toBeGreaterThan(0);
    }
  });
});
