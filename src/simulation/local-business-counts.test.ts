import { describe, expect, it } from "vitest";

import { lifePlaceByKey } from "./life-places";
import {
  LOCAL_BUSINESS_COUNTS_META,
  LOCAL_BUSINESS_COUNT_KINDS,
  localBusinessSupplyFor,
} from "./local-business-counts";
import {
  LOCAL_BUSINESS_KINDS,
  LOCAL_BUSINESS_MAX_PER_KIND,
  LOCAL_BUSINESS_MAX_STAFF,
  localBusinessPlansFor,
} from "./local-economy";

const townId = (key: string) => lifePlaceByKey(key)!.context.jurisdiction.id;

describe("the businesses a town really has", () => {
  it("lists the same kinds, in the same order, as the town business catalog", () => {
    expect(LOCAL_BUSINESS_COUNT_KINDS).toEqual(
      LOCAL_BUSINESS_KINDS.map((kind) => kind.key),
    );
    expect(LOCAL_BUSINESS_COUNTS_META.counties).toBeGreaterThan(3_000);
  });

  it("gives Boise, a city of about 240,000, many of every kind", () => {
    const supply = localBusinessSupplyFor(townId("1608830"))!;
    for (const row of supply) {
      expect(row.expected).toBeGreaterThan(10);
      expect(row.basis).toBe("county");
      expect(row.staffPerBusiness).toBeGreaterThanOrEqual(1);
      expect(row.salesPerEmployeeDollars).toBeGreaterThan(30_000);
    }
  });

  it("gives a town of under a hundred people almost nothing of any kind", () => {
    const supply = localBusinessSupplyFor(townId("0107672"))!;
    for (const row of supply) expect(row.expected).toBeLessThan(0.5);
  });

  it("seats no more than the cap, and never leaves a town without an employer", () => {
    const boise = localBusinessPlansFor(townId("1608830"));
    for (const kind of LOCAL_BUSINESS_KINDS) {
      const ofKind = boise.filter((plan) => plan.kind === kind);
      expect(ofKind.length).toBeGreaterThan(0);
      expect(ofKind.length).toBeLessThanOrEqual(LOCAL_BUSINESS_MAX_PER_KIND);
    }
    for (const plan of boise) {
      expect(plan.workers).toBeLessThanOrEqual(LOCAL_BUSINESS_MAX_STAFF);
      expect(plan.monthlyRevenueMinor).toBeGreaterThan(0);
      expect(plan.sourced).toBe(true);
    }
    const tiny = localBusinessPlansFor(townId("0107672"));
    expect(tiny).toHaveLength(1);
    // The kind a town this size is likeliest to have.
    expect(tiny[0]!.kind.key).toBe("diner");
  });

  it("counts a census-designated town's businesses from its survey population, not the placeholder list", () => {
    // Kualapuu, Hawaii (2,535) and Lime Ridge, Pennsylvania (842) have no
    // Vintage 2025 estimate; the 2020-2024 survey count sizes them.
    for (const geoid of ["1539500", "4243320"]) {
      const supply = localBusinessSupplyFor(townId(geoid));
      expect(supply).not.toBeNull();
      expect(supply!.some((row) => row.expected > 0)).toBe(true);
      const plans = localBusinessPlansFor(townId(geoid));
      expect(plans.length).toBeGreaterThan(0);
      expect(
        plans.every((plan) => plan.sourced && plan.expected !== null),
      ).toBe(true);
    }
    const kualapuu = localBusinessSupplyFor(townId("1539500"))!;
    const limeRidge = localBusinessSupplyFor(townId("4243320"))!;
    const total = (rows: typeof kualapuu) =>
      rows.reduce((sum, row) => sum + row.expected, 0);
    expect(total(kualapuu)).toBeGreaterThan(total(limeRidge));
  });

  it("refuses unsupported business and revenue plans when population is not held", () => {
    expect(localBusinessPlansFor("no-such-town" as never)).toEqual([]);
  });
});
