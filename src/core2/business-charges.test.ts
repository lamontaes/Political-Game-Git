/**
 * A business's month's books weigh every cost a law put on it (business-charges.ts):
 * in a played town, a raise in the employer's Medicare tax shows on each
 * business's monthly bill under the new law row, counts in the costs the
 * staffing and closing decisions read, and leaves those businesses with more
 * months of revenue lost than the same town left alone. Two worlds side by
 * side in drawn places from all 56 (BUSINESS_CHARGES_SEED replays one draw):
 * in every place the raise lifts costs and, firm by firm, loses no fewer
 * months than the control the month it takes hold (before any firm has laid
 * anyone off in answer, which lowers its own costs); places are drawn until
 * one holds a firm the raise tips into a loss, and each place passed over is
 * named.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
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

const seed =
  process.env.BUSINESS_CHARGES_SEED || randomBytes(8).toString("hex");
// A payroll tax raise of this many times the employer's Medicare share: sized
// so a firm within a percent or two of break-even tips into a loss the first
// month, which the real rate's tripling (about 1% of costs) seldom does.
const RAISE_TIMES = 10;
// Drawn places played at most; the case ends at the first place that shows it.
const MAX_DRAWS = 12;
// One month with the raise: the staffing and closing decisions read it only
// after that month, so no firm has answered it yet.
const MONTHS = 1;

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

function played(raise: boolean, placeSeed: string, placeKey: string) {
  setBookkeeping(false);
  const world = buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
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
      value: Number(now.value) + (RAISE_TIMES - 1) * rate,
      effectiveDate: addDays(makeIsoDate(c.date), 1),
      measureId: "firm-charges-test",
      citation: `Firm charges test: the employer's Medicare share times ${RAISE_TIMES}.`,
      ...(now.unit ? { unit: now.unit } : {}),
      terms: {
        ...(now.terms ?? {}),
        ...(typeof now.terms?.employerRate === "number"
          ? { employerRate: RAISE_TIMES * rate }
          : {}),
      },
    }).id;
  }
  advanceCore(c, addDays(makeIsoDate(c.date), 30 * MONTHS));
  return { c, lawId, months: townMonths(c) };
}

describe(`a business's month weighs what laws cost it (seed ${seed})`, () => {
  it("a payroll tax raise is on every bill, never loses fewer months, and in some place loses more", () => {
    const sum = (
      months: BusinessTradingMonth[],
      pick: (m: BusinessTradingMonth) => number,
    ) => months.reduce((n, m) => n + pick(m), 0);
    const tax = (m: BusinessTradingMonth) =>
      (m.charges ?? [])
        .filter((charge) => charge.kind === "payroll-taxes")
        .reduce((n, charge) => n + charge.minor, 0);
    const passed: string[] = [];
    let more = 0;
    for (let at = 0; at < MAX_DRAWS && more === 0; at += 1) {
      const drawn = drawPlace(at ? `${seed}:${at}` : seed, "business-charges");
      const where = `${drawn.name} (${drawn.key}), seed ${drawn.seed}`;
      const control = played(false, drawn.seed, drawn.key);
      const raised = played(true, drawn.seed, drawn.key);
      if (!raised.months.length) {
        passed.push(`${where}: no business trades`);
        continue;
      }

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
      if (!named.length) {
        passed.push(`${where}: no business paid wages`);
        continue;
      }

      // The raise reaches what the staffing and closing decisions read, and
      // never loses fewer months than the same town left alone.
      expect(sum(raised.months, tax), where).toBeGreaterThan(
        sum(control.months, tax),
      );
      // The same firm in both worlds (they differ only by the law, and no
      // firm has answered it yet): it never loses fewer months with the raise.
      const before = new Map(
        control.months.map((m) => [m.organizationId, m.lossMonths]),
      );
      let tipped = 0;
      for (const month of raised.months) {
        const was = before.get(month.organizationId);
        if (was === undefined) continue;
        expect(
          month.lossMonths,
          `${where}: ${month.organizationId}`,
        ).toBeGreaterThanOrEqual(was);
        if (month.lossMonths > was) tipped += 1;
      }
      if (tipped > 0) more += 1;
      else passed.push(`${where}: no firm tipped into a loss`);
    }
    expect(
      more,
      `no drawn place lost more months with the raise; passed over: ${passed.join("; ") || "none"}`,
    ).toBeGreaterThan(0);
    process.stdout.write(
      `BUSINESS-CHARGES passed over: ${passed.join("; ") || "none"}\n`,
    );
  }, 2_700_000);
});
