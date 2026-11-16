/**
 * A business's month's books weigh every cost a law put on it (firm-charges.ts):
 * in a played town, a raise in the employer's Medicare tax shows on each
 * business's monthly bill under the new law row, counts in the costs the
 * staffing and closing decisions read, and leaves those businesses with more
 * months of revenue lost than the same town left alone. Pinned place and seed
 * (Center, North Dakota), two worlds side by side.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import {
  enactLaw,
  lawChain,
  lawInForce,
  type LawRowInput,
} from "./modules/laws";
import {
  businessTradingMonth,
  type BusinessTradingMonth,
} from "./modules/business";
import type { CoreState } from "./types";

const PLACE = "3813180";
const SEED = "lay-3813180";
const MONTHS = 4;

function townMonths(c: CoreState): BusinessTradingMonth[] {
  const api = coreAPI(c);
  const town = lawChain(api).townPlaceId;
  return [...c.finance.businesses.keys()]
    .filter((id) => c.organizations.get(id)?.placeId === town)
    .sort()
    .flatMap((id) => {
      const month = businessTradingMonth(api, id);
      return month ? [month] : [];
    });
}

function played(raise: boolean) {
  setBookkeeping(false);
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const c = world.core;
  const api = coreAPI(c);
  let lawId: string | undefined;
  if (raise) {
    const now = lawInForce(api, "medicare-tax").governing as LawRowInput;
    const rate = Number(now.terms?.employerRate ?? now.value);
    lawId = enactLaw(api, {
      level: now.level,
      jurisdiction: now.jurisdiction,
      series: "medicare-tax",
      value: Number(now.value) + 2 * rate,
      effectiveDate: addDays(makeIsoDate(c.date), 1),
      measureId: "firm-charges-test",
      citation: "Firm charges test: the employer's Medicare share tripled.",
      ...(now.unit ? { unit: now.unit } : {}),
      terms: {
        ...(now.terms ?? {}),
        ...(typeof now.terms?.employerRate === "number"
          ? { employerRate: 3 * rate }
          : {}),
      },
    }).id;
  }
  advanceCore(c, addDays(makeIsoDate(c.date), 30 * MONTHS));
  return { c, lawId, months: townMonths(c) };
}

describe("a business's month weighs what laws cost it", () => {
  it("a payroll tax raise is on the bill, in the weighed costs and in the loss memory", () => {
    const control = played(false);
    const raised = played(true);
    const where = `Center, North Dakota (${PLACE}), seed ${SEED}`;
    expect(raised.months.length, where).toBeGreaterThan(0);

    // Every month's weighed costs are exactly its weighed charges.
    for (const month of [...control.months, ...raised.months]) {
      const weighed = (month.charges ?? [])
        .filter((charge) => charge.weighed)
        .reduce((n, charge) => n + charge.minor, 0);
      expect(month.costsMinor, `${month.id} at ${where}`).toBe(weighed);
      expect(
        (month.charges ?? []).every(
          (charge) => charge.weighed === (charge.kind !== "profit-tax"),
        ),
        month.id,
      ).toBe(true);
    }

    // The new law is named on the payroll-tax line of businesses that paid wages.
    const named = raised.months.filter((month) =>
      (month.charges ?? []).some(
        (charge) =>
          charge.kind === "payroll-taxes" &&
          charge.weighed &&
          charge.minor > 0 &&
          charge.lawIds.includes(raised.lawId!),
      ),
    );
    expect(
      named.length,
      `${where}: no bill names ${raised.lawId}`,
    ).toBeGreaterThan(0);

    // The raise reaches what the staffing and closing decisions read.
    const sum = (
      months: BusinessTradingMonth[],
      pick: (m: BusinessTradingMonth) => number,
    ) => months.reduce((n, m) => n + pick(m), 0);
    const tax = (m: BusinessTradingMonth) =>
      (m.charges ?? [])
        .filter((charge) => charge.kind === "payroll-taxes")
        .reduce((n, charge) => n + charge.minor, 0);
    expect(sum(raised.months, tax), where).toBeGreaterThan(
      sum(control.months, tax),
    );
    expect(
      sum(raised.months, (m) => m.lossMonths),
      where,
    ).toBeGreaterThan(sum(control.months, (m) => m.lossMonths));
  }, 90_000);
});
