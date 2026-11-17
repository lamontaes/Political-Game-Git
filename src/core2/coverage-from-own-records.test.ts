/**
 * Employer plans, premiums, the price of care and what goes to collections
 * come from the world's own records, not from a published level (the pins
 * lifted Nov 17, 2026: the 55 percent of workers, the KFF dollar premiums, the
 * Consumer Expenditure mean and the 40.5 percent sent to collections).
 *
 * Every world is a drawn place: the seed is this run's (GOLDEN_PATH_SEED to
 * replay), and each place is named with its seed where it is read.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import bills from "./data/health/medical-bills.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { carePrices, type MedicalBillRow } from "./medical-bills";
import {
  COVERAGE_MODULE_ID,
  employerPlansToday,
  planRateOf,
  planScores,
  workerPremium,
  type CountedCoverageRow,
} from "./modules/coverage";
import { countedJob, residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PURPOSE = "coverage-from-own-records";
/** Places drawn before the test gives up on finding two that differ. */
const DRAWS = 8;
/** Two towns "differ" when their workers' plan shares are this far apart: several times what rounding and lapsed premiums move one town. */
const APART = 0.08;

function world(drawSeed: string) {
  const place = drawPlace(drawSeed, PURPOSE);
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return {
    core,
    api: coreAPI(core),
    where: `${place.name} [${place.key}], seed ${drawSeed}`,
  };
}

/** The mean daily pay of the jobs at a place's hospitals and clinics, named and counted, read from the jobs themselves. */
function healthPay(core: CoreState, placeId: string) {
  const kinds = new Set<string>(bills.medicalSellerClassifications);
  const health = new Set(
    [...core.organizations.values()]
      .filter(
        (org) => org.placeId === placeId && kinds.has(org.classification ?? ""),
      )
      .map((org) => org.id),
  );
  let pay = 0,
    jobs = 0;
  for (const job of core.jobs.values())
    if (
      job.endsAt === undefined &&
      health.has(job.organizationId) &&
      job.wageDailyMinor > 0
    ) {
      pay += job.wageDailyMinor;
      jobs += 1;
    }
  const rt = residentsRuntime(core);
  if (rt)
    for (const h of rt.store.liveHouseholds())
      for (const job of h.jobs)
        if (
          job.endsAt === undefined &&
          countedJob(core, job.id) &&
          health.has(job.organizationId) &&
          job.wageDailyMinor > 0
        ) {
          pay += job.wageDailyMinor * rt.store.weightOf(h);
          jobs += rt.store.weightOf(h);
        }
  return { pay, jobs };
}

describe("the weighing itself", () => {
  const { api, where } = world(seed);
  const base = {
    staff: 40,
    wageDailyMinor: 16_000,
    covered: 2,
    rateMonthlyMinor: planRateOf(api)!.rateMonthlyMinor,
  };
  it(`a larger employer, better pay and a cheaper plan each raise the offer; a dearer plan and lower pay each cut take-up (${where})`, () => {
    const at = planScores(api, base);
    expect(at.offerShare).toBeGreaterThan(0);
    expect(at.offerShare).toBeLessThan(1);
    expect(
      planScores(api, { ...base, staff: 400 }).offerShare,
      "ten times the staff",
    ).toBeGreaterThan(at.offerShare);
    expect(
      planScores(api, { ...base, wageDailyMinor: 32_000 }).offerShare,
      "twice the pay",
    ).toBeGreaterThan(at.offerShare);
    const dear = planScores(api, {
      ...base,
      rateMonthlyMinor: base.rateMonthlyMinor * 3,
    });
    expect(dear.offerShare, "a plan three times as dear").toBeLessThan(
      at.offerShare,
    );
    expect(dear.takeShare, "a plan three times as dear").toBeLessThan(
      at.takeShare,
    );
    expect(
      planScores(api, { ...base, wageDailyMinor: 8_000 }).takeShare,
      "half the pay",
    ).toBeLessThan(at.takeShare);
  });
});

it(`two drawn towns' workers hold employer plans at their own shares, each the sum of its workers' own (seed ${seed})`, () => {
  const seen: { where: string; share: number }[] = [];
  let found: [(typeof seen)[number], (typeof seen)[number]] | undefined;
  for (let draw = 0; draw < DRAWS && !found; draw++) {
    const { api, core, where } = world(draw === 0 ? seed : `${seed}:${draw}`);
    const plans = employerPlansToday(api)!;
    expect(plans.workers, `${where}: workers with a job`).toBeGreaterThan(0);
    // The plans held are the sum of the workers' own shares: under it where
    // two workers of one household hold one policy between them, over it by
    // no more than the last record to take a plan stands for.
    const rt = residentsRuntime(core)!;
    let heaviest = 1;
    for (const h of rt.store.liveHouseholds())
      heaviest = Math.max(heaviest, rt.store.weightOf(h));
    expect(plans.held, `${where}: plans held`).toBeLessThanOrEqual(
      Math.round(plans.plans) + heaviest,
    );
    const share = plans.held / plans.workers;
    const other = seen.find((row) => Math.abs(row.share - share) > APART);
    seen.push({ where, share });
    if (other) found = [other, seen.at(-1)!];
  }
  process.stdout.write(
    `EMPLOYER PLANS ${seen.map((row) => `${row.where}: ${(row.share * 100).toFixed(1)} percent of workers hold one`).join("; ")}\n`,
  );
  expect(
    found,
    `no two of ${seen.length} drawn towns hold plans more than ${APART * 100} points apart: ${seen.map((row) => `${row.where} ${row.share.toFixed(3)}`).join("; ")}`,
  ).toBeDefined();
}, 600_000);

it(`a town's premium is the worker's part of what its own plans' care costs, and its bills are priced from its own health pay (seed ${seed})`, () => {
  const a = world(seed);
  const b = world(`${seed}:premium`);
  for (const { api, core, where } of [a, b]) {
    const rate = planRateOf(api)!;
    // The opening's rate: the care the opening's people need today, a
    // person, at the insurer's part, with the insurer's load.
    expect(rate.months.length, `${where}: no claims yet`).toBe(0);
    const claims = rate.opening.insurerMinor / rate.opening.members;
    expect(rate.claimsMonthlyMinor, `${where}: claims a person`).toBe(
      Math.round(claims),
    );
    expect(rate.rateMonthlyMinor, `${where}: the rate`).toBe(
      Math.round(claims * api.parameter("healthPlanLoad")),
    );
    const counted = (
      api
        .moduleState(COVERAGE_MODULE_ID)
        .table("countedCoverage")
        .rows() as unknown as CountedCoverageRow[]
    ).filter((row) => row.to === null);
    expect(counted.length, `${where}: counted policies`).toBeGreaterThan(0);
    for (const row of counted) {
      expect(row.premiumMonthlyMinor, `${where} ${row.id}`).toBe(
        workerPremium(api, rate.rateMonthlyMinor, row.covered),
      );
      expect(row.reasons, `${where} ${row.id}: its reasons`).toBeDefined();
    }
    // The first month's bills, and the claims they add to the rate's record.
    advanceCore(core, makeIsoDate("2025-02-02"));
    const after = planRateOf(api)!;
    expect(
      after.months.map((row) => row.month),
      where,
    ).toEqual(["2025-02"]);
    expect(
      after.rateMonthlyMinor,
      `${where}: the rate holds for the year`,
    ).toBe(rate.rateMonthlyMinor);
    const prices = carePrices(api);
    const days = bills.parameters.medicalCareUnitHealthPayDays.value;
    const rows = api
      .moduleState(COVERAGE_MODULE_ID)
      .table("medicalBills")
      .rows() as unknown as MedicalBillRow[];
    expect(rows.length, `${where}: bills`).toBeGreaterThan(0);
    let insurer = 0,
      poor = 0,
      comfortable = 0;
    for (const row of rows) {
      // The bill names the price it was priced at and the pay behind it,
      // as they stood on the 1st.
      expect(row.carePayDailyMinor, `${where} ${row.id}`).toBeGreaterThan(0);
      expect(row.careUnitMonthlyMinor, `${where} ${row.id}`).toBe(
        Math.round(row.carePayDailyMinor * days),
      );
      for (const m of row.members)
        if (m.plan === "employer")
          insurer += (m.insurerMinor ?? 0) * row.weight;
      // The provider's weighing: far under the guideline is written off
      // nearly whole, far over it is sent nearly whole.
      if (row.incomeOverPoverty > 0 && row.incomeOverPoverty < 1) {
        poor += 1;
        expect(row.collectionsShare, `${where} ${row.id}`).toBeLessThan(0.05);
      }
      if (row.incomeOverPoverty > 6 && row.webLinks.length === 0) {
        comfortable += 1;
        expect(row.collectionsShare, `${where} ${row.id}`).toBeGreaterThan(0.9);
      }
    }
    expect(poor + comfortable, `${where}: households weighed`).toBeGreaterThan(
      0,
    );
    expect(
      Math.abs(after.months[0]!.insurerMinor - insurer),
      `${where}: the month's claims are the bills' insurer parts`,
    ).toBeLessThan(1);
    // Where the place has a hospital or clinic, the price is its staff's pay.
    for (const [placeId, price] of prices) {
      if (price.from !== "health-staff") continue;
      const own = healthPay(core, placeId);
      expect(own.jobs, `${where} ${placeId}`).toBeGreaterThan(0);
      expect(price.payDailyMinor, `${where} ${placeId}: health pay`).toBe(
        Math.round(own.pay / own.jobs),
      );
    }
  }
  const [rateA, rateB] = [planRateOf(a.api)!, planRateOf(b.api)!];
  process.stdout.write(
    `PLAN RATE ${a.where}: ${rateA.rateMonthlyMinor} minor a covered person a month; ${b.where}: ${rateB.rateMonthlyMinor}\n`,
  );
  expect(
    rateA.rateMonthlyMinor,
    `${a.where} and ${b.where} set the same rate`,
  ).not.toBe(rateB.rateMonthlyMinor);
}, 600_000);
