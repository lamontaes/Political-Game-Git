/**
 * A business's month's books weigh every cost a law put on it (business-charges.ts):
 * in a played town, a raise in the employer's Medicare tax is charged on each
 * payday at the raised rate of that employer's own wages, shows on each
 * business's monthly bill under the new law row, counts in the costs the
 * staffing and closing decisions read, and leaves each business no better off
 * than the same business in the town left alone. Two worlds side by side in
 * drawn places from all 56 (BUSINESS_CHARGES_SEED replays one draw).
 *
 * Twins drift apart: a business's sales follow its own world's story (ads,
 * events), which the raise moves in ways unrelated to its own payroll. So the
 * months lost are compared business by business, only for businesses whose
 * sales are the same in both twins and whose payroll the raise taxes (CTO,
 * Nov 17, 11:33Z: at Calvin, North Dakota the town's total fell 4.004 to
 * 3.178 while its employer lost more, 0.248 to 0.262, because a TV station
 * sold more in the raised twin). A place with no such business is passed over
 * and never counts as a pass.
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
import { EMPLOYER_TAXES_MODULE_ID } from "./modules/employer-taxes";
import type { EmployerTaxRecord } from "./modules/employer-taxes";
import type { CoreState } from "./types";

const seed =
  process.env.BUSINESS_CHARGES_SEED || randomBytes(8).toString("hex");
const DRAWS = 6;
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

function played(raise: boolean, placeSeed: string, placeKey: string) {
  setBookkeeping(false);
  const world = buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const c = world.core;
  const api = coreAPI(c);
  let lawId: string | undefined;
  let rate = 0;
  let from = "";
  if (raise) {
    const now = lawInForce(api, "medicare-tax").governing as LawRowInput;
    rate = Number(now.terms?.employerRate ?? now.value);
    from = addDays(makeIsoDate(c.date), 1);
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
  return { c, lawId, tripled: 3 * rate, from, months: townMonths(c) };
}

describe(`a business's month weighs what laws cost it (seed ${seed})`, () => {
  it("a payroll tax raise is charged on each employer's own wages, is on every bill, and never leaves a business better off", () => {
    const tax = (m: BusinessTradingMonth) =>
      (m.charges ?? [])
        .filter((charge) => charge.kind === "payroll-taxes")
        .reduce((n, charge) => n + charge.minor, 0);
    const passed: string[] = [];
    const used: string[] = [];
    let more = 0;
    let businessMore = 0;
    for (let at = 0; at < DRAWS && !(more && used.length); at += 1) {
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

      // The exact half: from the day the raise takes effect, every payday's
      // Medicare charge on a town business is the tripled share of that
      // payday's own wages, to the cent, under the new law row.
      const businesses = new Set(raised.months.map((m) => m.organizationId));
      const shares = (
        coreAPI(raised.c)
          .moduleState(EMPLOYER_TAXES_MODULE_ID)
          .table("shares")
          .rows() as unknown as EmployerTaxRecord[]
      ).filter(
        (row) => businesses.has(row.employerId) && row.date >= raised.from,
      );
      for (const row of shares) {
        expect(row.medicareMinor, `${row.id} at ${where}`).toBe(
          Math.round((row.wagesMinor * raised.tripled) / 100),
        );
        expect(row.lawIds, `${row.id} at ${where}`).toContain(raised.lawId);
      }

      // The businesses the comparison can read: in both twins, the same
      // sales, and payroll the raise taxed (its law named on the bill).
      const alone = new Map(control.months.map((m) => [m.organizationId, m]));
      const pairs = raised.months.flatMap((month) => {
        const twin = alone.get(month.organizationId);
        const taxed = (month.charges ?? []).some(
          (charge) =>
            charge.kind === "payroll-taxes" &&
            charge.weighed &&
            charge.minor > 0 &&
            charge.lawIds.includes(raised.lawId!),
        );
        return twin && taxed && twin.salesMinor === month.salesMinor
          ? [{ raised: month, control: twin }]
          : [];
      });
      process.stdout.write(
        `BUSINESS CHARGES ${where}: ${raised.months.length} businesses, ${pairs.length} with equal sales and a taxed payroll, ${shares.length} paydays charged under the raise\n`,
      );
      if (!pairs.length || !shares.length) {
        passed.push(
          `${where}: ${pairs.length} comparable businesses, ${shares.length} paydays under the raise`,
        );
        continue;
      }
      used.push(where);

      // Each comparable business pays more payroll tax and loses no fewer
      // months than itself in the town left alone.
      for (const pair of pairs) {
        const id = `${pair.raised.organizationId} at ${where}`;
        expect(tax(pair.raised), id).toBeGreaterThan(tax(pair.control));
        expect(pair.raised.lossMonths, id).toBeGreaterThanOrEqual(
          pair.control.lossMonths,
        );
        if (pair.raised.lossMonths > pair.control.lossMonths) businessMore += 1;
      }

      // And in some place the town as a whole loses more months.
      const loss = (months: BusinessTradingMonth[]) =>
        months.reduce((n, m) => n + m.lossMonths, 0);
      if (loss(raised.months) > loss(control.months)) more += 1;
    }
    expect(
      used.length,
      `no drawn place had a comparable business; passed over: ${passed.join("; ") || "none"}`,
    ).toBeGreaterThan(0);
    expect(
      more,
      `no drawn place lost more months with the raise; used: ${used.join("; ")}; passed over: ${passed.join("; ") || "none"}`,
    ).toBeGreaterThan(0);
    process.stdout.write(
      `BUSINESS CHARGES ${used.length} places used, ${more} lost more months in town, ${businessMore} comparable businesses lost more; passed over: ${passed.join("; ") || "none"}\n`,
    );
  }, 900_000);
});
