/**
 * Business audit checks on credit, macro and regional: the rate a borrower
 * weighs is the rate the bank quotes, the regional price level moves and is
 * read into published conditions, and the bank counts a part-time worker's
 * earned pay.
 *
 * The small worlds are checks of one mechanism each, on a place drawn at
 * random from all 56 places' localities; the seed and place are named in every
 * failure message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { CREDIT_MODULE, monthlyIncome } from "./modules/credit";
import {
  MACRO_MODULE,
  macroCoreData,
  quotedLineRate,
  withCentralBank,
} from "./modules/macro";
import {
  REGIONAL_MODULE,
  regionOfPlace,
  regionalMonth,
} from "./modules/regional";
import { worldCoreData } from "./modules/world";
import { realLocalities, type CorePlace } from "./places";
import { coreAPI, createCore } from "./state";
import type { BusinessBooksState } from "./finance-types";
import type { CoreInput, CoreState, Source } from "./types";
import type { MacroMonth } from "./macro-model";
import type { RegionMonth } from "./regional-model";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const START = "2026-10-01";
const src: Source = {
  tag: "ESTIMATED",
  asOf: START,
  citation: "Technical fixture records.",
  estimatedFrom: "Credit audit checks only.",
};

/** Every locality, in a seeded order that differs by salt. */
function drawn(salt: string): CorePlace[] {
  const rank = (key: string) =>
    createHash("sha256").update(`${seed}|${salt}|${key}`).digest("hex");
  return [...realLocalities()].sort((a, b) =>
    rank(a.key).localeCompare(rank(b.key)),
  );
}
const idOf = (place: CorePlace) => place.context.jurisdiction.id as string;
const label = (place: CorePlace) =>
  `${place.displayName} [${place.key}], seed ${seed}`;

describe(`the rate an owner weighs is the rate the bank quotes (seed ${seed})`, () => {
  const place = drawn("credit")[0]!;
  const tag = label(place);
  const bank = "organization:bank:fixture";
  const firms = [
    // Expected sales far above payroll, level with it, and well below it: three different risk spreads.
    { id: "organization:strong", demand: 120_000_000 },
    { id: "organization:level", demand: 12_000_000 },
    { id: "organization:weak", demand: 6_000_000 },
  ];
  const payroll = 12_000_000;

  function world(): CoreState {
    const placeId = idOf(place);
    const input = withCentralBank({
      seed: `credit-audit:${seed}`,
      startedAt: START,
      people: [],
      households: [],
      jobs: [],
      organizations: [
        {
          id: bank,
          placeId,
          name: "Bank",
          kind: "bank",
          liquidMinor: 1_000_000_000,
          source: src,
        },
        ...firms.map((firm) => ({
          id: firm.id,
          placeId,
          name: firm.id,
          kind: "employer",
          liquidMinor: 0,
          source: src,
        })),
      ],
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
    } as CoreInput);
    const core = createLifeCore(input, {
      data: worldCoreData(),
      modules: [MACRO_MODULE, CREDIT_MODULE],
      scheduledWork: false,
    });
    for (const firm of firms)
      core.finance.businesses.set(firm.id, {
        organizationId: firm.id,
        kindId: "retail",
        annualPayrollMinor: payroll,
        annualDemandMinor: firm.demand,
        capacityMinor: firm.demand,
        annualOtherCostsMinor: 0,
        openingTownIncomeMinor: 0,
        price: 1,
        costContractIds: [],
        source: src,
        lastReviewedAt: START,
        reachedIncomeRatio: 1,
        anchorAnnualDemandMinor: firm.demand,
        anchorAnnualOtherCostsMinor: 0,
        anchorPrice: 1,
        lastGeneralPriceFactor: 1,
        lastWagePriceFactor: 1,
        nextReviewedAt: "2099-01-01",
        receivedMinor: 0,
        salesReceivedMinor: 0,
        operatingPaidMinor: 0,
        wagesRequestedMinor: 0,
        wagesPaidMinor: 0,
        wagesUnpaidMinor: 0,
        closedAt: undefined,
      } as unknown as BusinessBooksState);
    return core;
  }

  it(`a new line is charged exactly the quoted rate for its risk spread, and the spread reads the books' own plan before any wages are paid (${tag})`, () => {
    const core = world();
    const api = coreAPI(core);
    advanceCore(core, "2026-12-15");
    const p = (key: string) => api.parameter(key);
    const applications = api
      .moduleState("credit")
      .table("applications")
      .rows() as unknown as {
      organizationId: string;
      salesToWages: number;
      record: number;
      spreadPct: number;
      approved: boolean;
      date: string;
    }[];
    const spreads = new Set<number>();
    for (const firm of firms) {
      const app = applications.find((row) => row.organizationId === firm.id);
      expect(app, `application of ${firm.id}, ${tag}`).toBeDefined();
      expect(app!.approved, `${firm.id} approved, ${tag}`).toBe(true);
      // No wages paid yet: sales over wages is the books' expected demand over planned payroll.
      expect(app!.salesToWages, `${firm.id}, ${tag}`).toBeCloseTo(
        firm.demand / payroll,
        10,
      );
      expect(app!.record, tag).toBeCloseTo(
        Math.tanh(firm.demand / payroll),
        10,
      );
      expect(app!.spreadPct, tag).toBeCloseTo(
        p("creditPrimeSpreadPct") +
          p("creditRiskSpreadPct") * (1 - Math.tanh(firm.demand / payroll)),
        10,
      );
      spreads.add(Math.round(app!.spreadPct * 1e6));
      // The bank charges what the owner weighed: policy rate, prime spread and the line's own spread.
      const facility = core.finance.facilities.get(
        `facility:${bank}:${firm.id}`,
      );
      expect(facility, `facility of ${firm.id}, ${tag}`).toBeDefined();
      const policy = (
        api
          .moduleState("macro")
          .table("state")
          .get("macro:state") as unknown as {
          policyRatePct: number;
        }
      ).policyRatePct;
      const quoted = quotedLineRate(api, app!.spreadPct);
      expect(quoted, tag).toBeCloseTo(
        (policy + p("macroPrimeSpreadPct") + app!.spreadPct) /
          p("macroHundred"),
        12,
      );
      expect(
        facility!.annualInterestRate,
        `${firm.id} rate, ${tag}`,
      ).toBeCloseTo(quoted, 12);
    }
    // Different risk, different price.
    expect(spreads.size, tag).toBe(firms.length);
  });

  it(`a line stays charged the quoted rate through the bank's rate decisions (${tag})`, () => {
    const core = world();
    const api = coreAPI(core);
    advanceCore(core, "2027-10-15");
    const lines = api.moduleState("macro").table("lines").rows() as unknown as {
      facilityId: string;
      spreadPct: number;
    }[];
    expect(lines.length, `linked lines, ${tag}`).toBe(firms.length);
    for (const line of lines) {
      const facility = core.finance.facilities.get(line.facilityId)!;
      if (!facility.active) continue;
      expect(
        facility.annualInterestRate,
        `${line.facilityId}, ${tag}`,
      ).toBeCloseTo(quotedLineRate(api, line.spreadPct), 12);
    }
  });
});

describe(`regional prices (seed ${seed})`, () => {
  // A place whose region the regional layer knows.
  const place = drawn("regional").find((row) => regionOfPlace(idOf(row)))!;
  const tag = label(place);

  it(`the region's price level moves month to month and the published general price factor reads it (${tag})`, () => {
    const placeId = idOf(place);
    const data = macroCoreData();
    const core = createCore(
      withCentralBank({
        seed: `regional-audit:${seed}`,
        startedAt: START,
        people: [],
        households: [],
        jobs: [],
        organizations: [
          {
            id: "organization:anchor",
            name: "Anchor",
            placeId,
            kind: "employer",
            liquidMinor: 0,
            source: src,
          },
        ],
        finance: { contracts: [], facilities: [], businesses: [], gaps: [] },
        focusPersonIds: [],
        focusPlaceIds: [],
        calendarDates: [],
        gaps: [],
      }),
      { data, modules: [MACRO_MODULE, REGIONAL_MODULE] },
    );
    const api = coreAPI(core);
    advanceCore(core, "2027-05-05");
    const state = api
      .moduleState("macro")
      .table("state")
      .get("macro:state") as unknown as {
      openingMonth: string;
      latestMonth: string;
    };
    const nation = (month: string) =>
      api
        .moduleState("macro")
        .table("months")
        .get(`macro-month:${month}`) as unknown as MacroMonth;
    // Every month from the opening to the latest, in order.
    const months: string[] = [];
    for (
      let m = state.openingMonth;
      m <= state.latestMonth;
      m = `${Number(m.slice(0, 4)) + (m.endsWith("-12") ? 1 : 0)}-${String(
        (Number(m.slice(5)) % 12) + 1,
      ).padStart(2, "0")}`
    )
      months.push(m);
    expect(months.length, `months run, ${tag}`).toBeGreaterThanOrEqual(6);
    const levels = months.map(
      (m) =>
        (regionalMonth(api, placeId, m) as RegionMonth | undefined)
          ?.priceLevelPct,
    );
    for (const level of levels)
      expect(level, `a region month for ${placeId}, ${tag}`).toBeGreaterThan(0);
    let moved = 0;
    for (let i = 1; i < levels.length; i++)
      if (levels[i] !== levels[i - 1]) moved += 1;
    expect(
      moved,
      `months the level moved of ${levels.length - 1}, ${tag}`,
    ).toBe(levels.length - 1);
    // The published condition for the latest month reads the national price index moved by the region's price level.
    const conditions = core.finance.conditionsByPlace.get(placeId) ?? [];
    expect(conditions.length, `published conditions, ${tag}`).toBeGreaterThan(
      0,
    );
    const last = conditions.at(-1)!;
    const opening = nation(state.openingMonth);
    const latest = nation(state.latestMonth);
    const price = levels.at(-1)! / levels[0]!;
    expect(last.generalPriceFactor, tag).toBeCloseTo(
      (latest.priceIndex / opening.priceIndex) * price,
      10,
    );
    // And it is not the national factor alone.
    expect(last.generalPriceFactor, tag).not.toBeCloseTo(
      latest.priceIndex / opening.priceIndex,
      8,
    );
  });
});

describe(`the bank counts earned pay (seed ${seed})`, () => {
  const place = drawn("income")[0]!;
  const tag = label(place);

  it(`after two weeks a part-time worker's monthly income reads the pay earned from hours worked, below the wage rate over the calendar (${tag})`, () => {
    const placeId = idOf(place);
    const person = (id: string, jobId: string) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1990-05-06",
      placeId,
      householdId: `household:${id}`,
      tier: "weekly" as const,
      traits: {},
      liquidMinor: 100_000,
      livingCostDailyMinor: 3_000,
      source: src,
      familyIds: [],
      knownIds: [],
      jobId,
    });
    const people = [person("parttime", "job:pt"), person("fulltime", "job:ft")];
    const job = (id: string, personId: string, hoursDaily: number) => ({
      id,
      personId,
      organizationId: "organization:employer",
      title: "Clerk",
      hourlyMinor: 2_500,
      hoursDaily,
      wageDailyMinor: 2_500 * hoursDaily,
      source: src,
    });
    const core = createLifeCore(
      {
        seed: `income-audit:${seed}`,
        startedAt: START,
        people,
        households: people.map((row) => ({
          id: row.householdId,
          placeId,
          memberIds: [row.id],
          source: src,
        })),
        jobs: [job("job:pt", "parttime", 4), job("job:ft", "fulltime", 8)],
        organizations: [
          {
            id: "organization:employer",
            placeId,
            name: "Employer",
            kind: "employer",
            liquidMinor: 500_000_000,
            source: src,
          },
        ],
        focusPersonIds: [],
        focusPlaceIds: [],
        calendarDates: [],
        gaps: [],
      } as CoreInput,
      { data: worldCoreData() },
    );
    const api = coreAPI(core);
    const p = (key: string) => api.parameter(key);
    const perMonth = (daily: number) =>
      (daily * p("jobsDaysPerYear")) / p("macroMonthsPerYear");
    const rate = (id: string) => perMonth(core.jobs.get(id)!.wageDailyMinor);

    // Under two weeks of record: the job's wage rate.
    advanceCore(core, "2026-10-08");
    expect(monthlyIncome(api, ["parttime"]), tag).toBeCloseTo(
      rate("job:pt") * share(core, "parttime", "job:pt"),
      6,
    );

    // After a month and more: the pay earned from the hours attended.
    advanceCore(core, "2026-11-15");
    const days = (personId: string, jobId: string) => {
      const commitmentId = [
        ...(core.work.commitmentsByPerson.get(personId) ?? []),
      ].find((id) => core.work.commitments.get(id)?.jobId === jobId)!;
      const ledger = core.work.payrollLedgerByCommitment.get(commitmentId)!;
      const since = core.work.commitments.get(commitmentId)!.startsAt;
      const elapsed =
        (Date.parse(core.date) -
          Date.parse(since > core.startedAt ? since : core.startedAt)) /
        86_400_000;
      return { ledger, elapsed };
    };
    for (const [personId, jobId] of [
      ["parttime", "job:pt"],
      ["fulltime", "job:ft"],
    ] as const) {
      const { ledger, elapsed } = days(personId, jobId);
      expect(ledger.earnedMinor, `${personId} earned, ${tag}`).toBeGreaterThan(
        0,
      );
      const expected =
        perMonth(ledger.earnedMinor / elapsed) * share(core, personId, jobId);
      const read = monthlyIncome(api, [personId]);
      expect(read, `${personId} income, ${tag}`).toBeCloseTo(expected, 6);
      // Hours worked over the calendar come to less than the wage rate over every calendar day.
      expect(read, `${personId} below wage-rate pay, ${tag}`).toBeLessThan(
        rate(jobId) * share(core, personId, jobId),
      );
    }
    // The part-time worker's income is a fraction of the full-time worker's, as their hours are.
    expect(monthlyIncome(api, ["parttime"]), tag).toBeLessThan(
      monthlyIncome(api, ["fulltime"]),
    );
  });
});

/** The share of a job's due pay actually paid (1 until pay is due). */
function share(core: CoreState, personId: string, jobId: string): number {
  for (const id of core.work.commitmentsByPerson.get(personId) ?? []) {
    if (core.work.commitments.get(id)?.jobId !== jobId) continue;
    const ledger = core.work.payrollLedgerByCommitment.get(id);
    if (ledger && ledger.dueRecognizedMinor > 0)
      return Math.min(1, ledger.paidMinor / ledger.dueRecognizedMinor);
  }
  return 1;
}
