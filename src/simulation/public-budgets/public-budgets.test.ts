import { describe, expect, it, vi } from "vitest";
import type * as StateExecutives from "../nationwide-world/state-executives";
import type { StateExecutiveHolderRecord } from "../nationwide-world/state-executives";
import { makeIsoDate } from "../dates";
import { lifePlaceByKey, stateJurisdictionForKey } from "../life-places";
import { STATES } from "../state-reference";
import type { EntityId, World } from "../types";
import { LOCAL_BALANCED_ESTIMATE, firstOfNextMonth } from "./fiscal";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  budgetProgramFor,
  publicBudgetFor,
  settlePublicBudgets,
  sum,
  withOpenedBudgets,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from ".";
import {
  decideLawMoneyReaction,
  lawSpendingForMonth,
  settleGovernmentMonth,
  type MonthFlows,
} from "./month";
import {
  MEDIAN_BENEFIT_SHARE,
  MEDIAN_FUNDED_RATIO,
  MEDIAN_NORMAL_COST_SHARE,
  MEDIAN_PAID_SHARE,
} from "./pension-share";
import {
  MEDIAN_RESERVE_DEPOSIT,
  MEDIAN_RESERVE_TARGET,
  reserveRule,
} from "./reserve-rule";
import { fundingGovernment } from "./staffing";
import { SPENDING_QUESTION_EFFECTS, TAX_QUESTION_EFFECTS } from "./rules";

// A seated governor, for the tests that need one; the partial world here
// records no executive office.
const seated: { holders: StateExecutiveHolderRecord[] } = { holders: [] };
vi.mock("../nationwide-world/state-executives", async (original) => {
  const actual = await original<typeof StateExecutives>();
  return {
    ...actual,
    currentStateExecutiveHolders: (world: World) =>
      seated.holders.length
        ? seated.holders
        : actual.currentStateExecutiveHolders(world),
  };
});

/*
 * Every government keeps a budget, and the three budget laws act on it. The
 * world here is partial, as in the place-outcome tests: the budget reads the
 * date, the policy catalog, the legislative history, the public accounts'
 * flows and the jurisdictions present, and no recorded economy.
 */

const BALANCED = "proposition_balanced" as EntityId;
const RESERVE = "proposition_reserve" as EntityId;
const PENSIONS = "proposition_pensions" as EntityId;
const GRADUATED = "proposition_graduated" as EntityId;
const INCOME_TAX = "proposition_income_tax" as EntityId;
const JUVENILE_AGE = "proposition_juvenile_age" as EntityId;
const QUESTIONS: Readonly<Record<string, EntityId>> = {
  "fiscal.adopt-income-tax": INCOME_TAX,
  "fiscal.balanced-operating-budget": BALANCED,
  "fiscal.minimum-reserve-balance": RESERVE,
  "fiscal.fund-pensions-to-schedule": PENSIONS,
  "fiscal.graduated-income-tax": GRADUATED,
  "justice-public-safety.raise-juvenile-court-age": JUVENILE_AGE,
};
const illinois = stateJurisdictionForKey("US-IL")!.id;

interface Law {
  readonly question: EntityId;
  readonly answer: "yes" | "no";
  readonly jurisdictionId: EntityId;
}

function worldAt(
  currentDate: string,
  options: {
    readonly laws?: readonly Law[];
    readonly places?: readonly string[];
    readonly history?: Partial<World["history"]>;
    readonly seed?: string;
  } = {},
): World {
  const laws = options.laws ?? [];
  const places = (options.places ?? []).map((key) => lifePlaceByKey(key)!);
  return {
    id: "world_test" as EntityId,
    ...(options.seed ? { seed: options.seed } : {}),
    currentDate: makeIsoDate(currentDate),
    jurisdictions: Object.fromEntries(
      places.map((place) => [
        place.context.jurisdiction.id,
        place.context.jurisdiction,
      ]),
    ),
    jurisdictionOrder: places.map((place) => place.context.jurisdiction.id),
    policyCatalog: {
      propositions: Object.fromEntries(
        Object.entries(QUESTIONS).map(([key, id]) => [
          id,
          { id, stableKey: `us-policy-positions:${key}` },
        ]),
      ),
    },
    history: {
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: laws.map((law, at) => ({
        id: `measure_${at}` as EntityId,
        jurisdictionId: law.jurisdictionId,
        propositionIds: [law.question],
        propositionAnswers: [
          { propositionId: law.question, answer: law.answer },
        ],
      })),
      legislativeEnactments: laws.map((_, at) => ({
        id: `enactment_${at}` as EntityId,
        sequence: 1000 + at,
        measureId: `measure_${at}` as EntityId,
        resolvedAt: makeIsoDate("2025-06-01"),
        outcome: "enacted",
        effectiveAt: makeIsoDate("2025-07-01"),
      })),
      ...options.history,
    },
  } as unknown as World;
}

function opened(world: World): World {
  const store: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  return {
    ...world,
    publicBudgets: withOpenedBudgets(world, store, world.currentDate),
  };
}

/** Settles every month from the opening month through `lastMonth`. */
function runThrough(world: World, lastMonth: string): World {
  let next = world;
  let month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
  while (month <= lastMonth) {
    next = settlePublicBudgets(
      { ...next, currentDate: firstOfNextMonth(month) },
      month,
    );
    month = firstOfNextMonth(month);
  }
  return next;
}

const NO_FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};

/** A government whose revenue falls to half of what it adopted. */
function shortfall(government: PublicBudgetGovernment): PublicBudgetGovernment {
  const year = government.years.at(-1)!;
  return {
    ...government,
    balance: 0,
    years: [
      {
        ...year,
        expectedRevenue: year.expectedRevenue.map((value) => value / 2),
      },
    ],
  };
}

/** Settles one government month by month through `lastMonth`. */
function settleAlone(
  world: World,
  government: PublicBudgetGovernment,
  lastMonth: string,
) {
  let current = government;
  const adjustments = [];
  let month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
  while (month <= lastMonth) {
    const settled = settleGovernmentMonth(world, current, month, NO_FLOWS);
    current = settled.government;
    adjustments.push(...settled.adjustments);
    month = firstOfNextMonth(month);
  }
  return { government: current, adjustments };
}

describe("public budgets", () => {
  it("every state, D.C. and territory keeps a budget for a full year, none left unknown", () => {
    const world = runThrough(opened(worldAt("2026-01-05")), "2026-12-01");
    const store = world.publicBudgets!;
    const keys = Object.keys(STATES).map((usps) => `US-${usps}`);
    const kept = new Set(store.governments.map((row) => row.key));
    expect([...kept].sort()).toEqual(keys.sort());
    expect(store.unknown).toEqual([]);
    for (const government of store.governments) {
      expect(government.months, government.key).toHaveLength(12);
      for (const row of government.months) {
        expect(row.reserve, government.key).toBeGreaterThanOrEqual(0);
        expect(row.debt, government.key).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(row.balance), government.key).toBe(true);
        expect(row.revenue).toHaveLength(BUDGET_SOURCES.length);
        expect(row.spending).toHaveLength(BUDGET_PROGRAMS.length);
      }
      // Every fiscal year that ended was followed by an adopted one.
      expect(government.years.length, government.key).toBeGreaterThanOrEqual(2);
      expect(government.years.at(-1)!.basis).toBe("automatic");
    }
  });

  it("American Samoa and the Northern Mariana Islands, which NASBO does not survey, open from Guam's and the U.S. Virgin Islands' average per resident, marked as estimated", () => {
    const world = opened(worldAt("2026-01-05"));
    const find = (key: string) =>
      world.publicBudgets!.governments.find((row) => row.key === key)!;
    const perResident = (key: string) =>
      sum(find(key).years[0]!.appropriations) / find(key).population;
    const samoa = find("US-AS");
    expect(samoa.population).toBe(49_710);
    expect(find("US-MP").population).toBe(47_329);
    expect(samoa.openingNotes.join(" ")).toContain("ESTIMATED FROM AVERAGE");
    // Guam $909 million over 153,836 people; the Virgin Islands $1,174
    // million over 87,146 (NASBO fiscal 2025, Census 2020).
    expect(perResident("US-AS")).toBeCloseTo(
      (909e6 / 153_836 + 1174e6 / 87_146) / 2,
      0,
    );
    expect(perResident("US-MP")).toBeCloseTo(perResident("US-AS"), 0);
    expect(samoa.reserve).toBeGreaterThan(0);
  });

  it("Illinois opens at its Census figures per resident times its 2024 population, and adopts fiscal 2027 on July 1", () => {
    const start = opened(worldAt("2026-01-05"));
    // The opening reserve, before Illinois' own reserve law moves a surplus.
    expect(publicBudgetFor(start, illinois)!.reserve).toBe(2_518_000_000);
    const world = runThrough(start, "2026-06-01");
    const state = publicBudgetFor(world, illinois)!;
    expect(state.population).toBe(12_710_158);
    expect(state.fiscalYearStart).toBe("07-01");
    const opening = state.years[0]!;
    expect(opening.fiscalYear).toBe(2026);
    // Census 2022: $1,795.36 of state income tax per resident.
    const incomeTax =
      opening.expectedRevenue[BUDGET_SOURCES.indexOf("individualIncomeTax")]!;
    expect(incomeTax / 12_710_158).toBeCloseTo(1795.36 * 1.1506, 0);
    const next = state.years[1]!;
    expect(next.fiscalYear).toBe(2027);
    expect(next.startsOn).toBe("2026-07-01");
  });

  it("a state opens exactly at its read figures in every world; a city's estimated share opens with a spread", () => {
    const at = (seed: string) =>
      opened(worldAt("2026-01-05", { seed, places: ["1714000"] }))
        .publicBudgets!.governments;
    const first = at("b12-read-a");
    const second = at("b12-read-b");
    const line = (rows: typeof first, key: string) =>
      rows.find((row) => row.key === key)!.years[0]!.expectedRevenue;
    expect(line(first, "US-IL")).toEqual(line(second, "US-IL"));
    expect(line(first, "US-GU")).toEqual(line(second, "US-GU"));
    expect(line(first, "place:1714000")).not.toEqual(
      line(second, "place:1714000"),
    );
  });

  it("D.C. reads the Census local column, and a territory's revenue is one line whose source is unknown", () => {
    const world = opened(worldAt("2026-01-05"));
    const district = world.publicBudgets!.governments.find(
      (row) => row.key === "US-DC",
    )!;
    expect(sum(district.years[0]!.expectedRevenue)).toBeGreaterThan(0);
    expect(district.fiscalYearStart).toBe("10-01");
    const guam = world.publicBudgets!.governments.find(
      (row) => row.key === "US-GU",
    )!;
    const revenue = guam.years[0]!.expectedRevenue;
    expect(revenue.filter((value) => value > 0)).toHaveLength(1);
    expect(revenue[BUDGET_SOURCES.indexOf("sourceUnknown")]).toBeGreaterThan(0);
  });

  it("Cook County and Chicago keep their own budgets at their placeholder shares, and Washington's town is the District itself", () => {
    const world = opened(
      worldAt("2026-01-05", {
        places: ["1714000", "county:17031", "1150000"],
      }),
    );
    const store = world.publicBudgets!;
    const cook = store.governments.find((row) => row.key === "county:17031")!;
    const chicago = store.governments.find(
      (row) => row.key === "place:1714000",
    )!;
    expect(cook.level).toBe("county");
    expect(cook.population).toBe(5_182_617);
    expect(chicago.level).toBe("city");
    expect(chicago.population).toBeGreaterThan(2_000_000);
    const police = BUDGET_PROGRAMS.indexOf("police");
    expect(chicago.years[0]!.appropriations[police]).toBeGreaterThan(
      cook.years[0]!.appropriations[police]! /
        (cook.population / chicago.population),
    );
    expect(store.governments.some((row) => row.key === "place:1150000")).toBe(
      false,
    );
    const district = store.governments.find((row) => row.key === "US-DC")!;
    expect(district.lawJurisdictionId).toBe(
      lifePlaceByKey("1150000")!.context.jurisdiction.id,
    );
    // Its Census state column is empty, so it opens from the local column.
    expect(district.openingNotes.join(" ")).toContain(
      "Census 2022 local-government column, since District of Columbia's state column is empty",
    );
    expect(sum(district.years[0]!.appropriations)).toBeGreaterThan(0);
  });

  it("under a balanced-budget law a shortfall is cut across the board and drawn from the reserve, naming the law; without one it is borrowed", () => {
    const withLaw = worldAt("2026-01-05", {
      laws: [{ question: BALANCED, answer: "yes", jurisdictionId: illinois }],
    });
    const lawful = shortfall(publicBudgetFor(opened(withLaw), illinois)!);
    const cutRun = settleAlone(withLaw, lawful, "2026-06-01");
    const cuts = cutRun.adjustments.filter(
      (row) => row.kind === "mid-year-cut",
    );
    expect(cuts.length).toBeGreaterThan(0);
    expect(cuts[0]!.law?.reading.answer).toBe("yes");
    expect(cuts[0]!.law?.reading.measureId).toBe("measure_0");
    expect(cutRun.adjustments.some((row) => row.kind === "reserve-draw")).toBe(
      true,
    );
    // Interest and pensions are never cut.
    const march = cutRun.government.months.find(
      (row) => row.month === "2026-04-01",
    )!;
    const pension = BUDGET_PROGRAMS.indexOf("pensionContribution");
    expect(march.spending[pension]).toBe(
      Math.round(lawful.years[0]!.appropriations[pension]! / 12),
    );

    // Illinois begins with a balanced-budget law, so "without" is a law
    // enacted in play that says no.
    const without = worldAt("2026-01-05", {
      laws: [{ question: BALANCED, answer: "no", jurisdictionId: illinois }],
    });
    const loose = shortfall(publicBudgetFor(opened(without), illinois)!);
    const debtRun = settleAlone(without, loose, "2026-06-01");
    expect(debtRun.adjustments.some((row) => row.kind === "mid-year-cut")).toBe(
      false,
    );
    const borrowed = debtRun.adjustments.find(
      (row) => row.kind === "deficit-borrowed",
    )!;
    expect(borrowed.law?.reading.answer).toBe("no");
    expect(debtRun.government.debt).toBe(loose.debt + borrowed.amount);
    expect(debtRun.government.balance).toBe(0);
  });

  it("a minimum-reserve law sends the year's surplus to the reserve and sets a deposit; without it the surplus stays in the balance", () => {
    // The reserve law alone: Illinois' own balanced-budget law, which the
    // game begins with, would cut a shortfall to a small surplus instead.
    const withLaw = worldAt("2026-01-05", {
      laws: [
        { question: RESERVE, answer: "yes", jurisdictionId: illinois },
        { question: BALANCED, answer: "no", jurisdictionId: illinois },
      ],
    });
    const state = publicBudgetFor(opened(withLaw), illinois)!;
    const low = { ...state, reserve: 0 };
    const run = settleAlone(withLaw, low, "2026-06-01");
    const moved = run.adjustments.find(
      (row) => row.kind === "surplus-to-reserve",
    );
    expect(moved?.law?.reading.answer).toBe("yes");
    expect(run.government.reserve).toBeGreaterThan(0);
    // A year with no surplus leaves the reserve short, so next year's budget
    // sets a deposit aside.
    const short = settleAlone(
      withLaw,
      { ...shortfall(state), reserve: 0 },
      "2026-06-01",
    );
    expect(short.government.reserve).toBe(0);
    const deposit = short.adjustments.find(
      (row) => row.kind === "reserve-deposit",
    );
    expect(deposit?.law?.reading.answer).toBe("yes");
    expect(short.government.years.at(-1)!.reserveDeposit).toBe(deposit!.amount);
    // The note names Illinois' own law, not a hand-set floor.
    expect(deposit!.note).toContain(`${reserveRule(state).floorShare}`);
    expect(deposit!.note).toContain(reserveRule(state).basis);
    expect(deposit!.note).not.toContain("PLACEHOLDER");

    // Illinois begins with a reserve law, so "without" is a law enacted in
    // play that says no.
    const without = worldAt("2026-01-05", {
      laws: [{ question: RESERVE, answer: "no", jurisdictionId: illinois }],
    });
    const loose = {
      ...publicBudgetFor(opened(without), illinois)!,
      reserve: 0,
    };
    const kept = settleAlone(without, loose, "2026-06-01");
    expect(
      kept.adjustments.some((row) => row.kind === "surplus-to-reserve"),
    ).toBe(false);
    expect(kept.government.reserve).toBe(0);
  });

  it("without a pension law the government pays its own measured share and its unfunded liability grows; paid in full it shrinks", () => {
    // Illinois' own reported share is below the full contribution.
    const seed = "budget-test-3";
    const withLaw = worldAt("2026-01-05", {
      seed,
      laws: [{ question: PENSIONS, answer: "yes", jurisdictionId: illinois }],
    });
    const full = settleAlone(
      withLaw,
      publicBudgetFor(opened(withLaw), illinois)!,
      "2027-06-01",
    );
    const without = worldAt("2026-01-05", { seed });
    const partial = settleAlone(
      without,
      publicBudgetFor(opened(without), illinois)!,
      "2027-06-01",
    );
    const opening = partial.government.years[0]!;
    expect(opening.pensionShare).toBeLessThan(1);
    const unfunded = (government: PublicBudgetGovernment) =>
      government.pension.liability - government.pension.assets;
    expect(unfunded(partial.government)).toBeGreaterThan(
      unfunded(full.government),
    );
    // Paid in full, the contribution covers the interest on the unfunded
    // part as well as some of it, so the unfunded part shrinks.
    expect(unfunded(full.government)).toBeLessThan(
      unfunded(publicBudgetFor(opened(withLaw), illinois)!),
    );
    const underpaid = partial.adjustments.filter(
      (row) => row.kind === "pension-underpaid",
    );
    // Illinois' own law funds pensions below the schedule (starting law).
    expect(underpaid[0]!.law?.reading.answer).toBe("no");
    // The opening year ran January to June: six months of the shortfall
    // went unpaid, not a whole year's.
    expect(underpaid[0]!.amount).toBeCloseTo(
      (opening.pensionRequired * (1 - opening.pensionShare) * 6) / 12,
      -3,
    );
    expect(
      full.adjustments.some((row) => row.kind === "pension-underpaid"),
    ).toBe(false);
    const adopted = partial.government.years.at(-1)!;
    const pension = BUDGET_PROGRAMS.indexOf("pensionContribution");
    expect(adopted.appropriations[pension]).toBe(
      Math.round(adopted.pensionRequired * adopted.pensionShare),
    );
  });

  it("a small government that pays its whole contribution records no underpayment from monthly rounding", () => {
    const world = worldAt("2026-01-05", {
      laws: [{ question: PENSIONS, answer: "no", jurisdictionId: illinois }],
    });
    // A pension the size of a 16-person town's, paid in full: the monthly
    // payments round to whole dollars and can fall a dollar or two short.
    const small = {
      ...publicBudgetFor(opened(world), illinois)!,
      pension: {
        ...publicBudgetFor(opened(world), illinois)!.pension,
        paidShare: 1,
        liability: 27_076,
        assets: 19_470,
      },
    };
    const run = settleAlone(world, small, "2027-06-01");
    expect(
      run.adjustments.filter(
        (row) => row.kind === "pension-underpaid" && row.fiscalYear === 2027,
      ),
    ).toEqual([]);
  });

  it("each government's pension opens at its own plans' funded ratio, or the median where none is reported", () => {
    const world = opened(
      worldAt("2026-01-05", { places: ["1714000", "county:17031"] }),
    );
    const funded = (key: string) => {
      const pension = world.publicBudgets!.governments.find(
        (row) => row.key === key,
      )!.pension;
      return pension.assets / pension.liability;
    };
    // Public Plans Database, each plan's latest year: Illinois' state plans
    // hold 54.84% of their liability, Chicago's 26.22%, Cook County's 65.93%.
    expect(funded("US-IL")).toBeCloseTo(0.5484, 3);
    expect(funded("place:1714000")).toBeCloseTo(0.2622, 3);
    expect(funded("county:17031")).toBeCloseTo(0.6593, 3);
    // D.C.'s plans are not listed, so it opens at the median of every plan.
    expect(funded("US-DC")).toBeCloseTo(MEDIAN_FUNDED_RATIO, 3);
    expect(
      world
        .publicBudgets!.governments.find((row) => row.key === "US-DC")!
        .openingNotes.join(" "),
    ).toContain("Pension funded ratio: ESTIMATED FROM AVERAGE");
  });

  it("a state NASBO reports no rainy-day balance for opens at the median share of the states it does", () => {
    const world = opened(worldAt("2026-01-05"));
    const georgia = world.publicBudgets!.governments.find(
      (row) => row.key === "US-GA",
    )!;
    // NASBO fiscal 2026: the median rainy-day balance over general-fund
    // spending of the states it reports is 0.1307 (measured from the table).
    const opening = georgia.years[0]!;
    const spent = sum(opening.appropriations);
    expect(georgia.reserve / spent).toBeCloseTo(0.1307, 3);
    expect(georgia.openingNotes.join(" ")).toContain(
      "Opening reserve: ESTIMATED FROM AVERAGE, NASBO has no figure, so 0.131 of spending",
    );
  });

  it("each government's pension costs and pays out what its own plans report, or the median where they do not", () => {
    const world = opened(worldAt("2026-01-05", { places: ["1714000"] }));
    const government = (key: string) =>
      world.publicBudgets!.governments.find((row) => row.key === key)!;
    // Public Plans Database, each plan's latest year: Illinois' state plans
    // owe an employer normal cost of 0.92% of their liability a year and pay
    // out 5.51%; Chicago's plans 0.51% and 5.60%. The unfunded part is paid
    // off as a level-dollar payment over 30 years at a 7% return,
    // 0.07 / (1 - 1.07^-30) = 0.0806 of it a year.
    const required = (key: string, normalCost: number) => {
      const { liability, assets } = government(key).pension;
      return Math.round(
        liability * normalCost +
          (liability - assets) * (0.07 / (1 - 1.07 ** -30)),
      );
    };
    expect(government("US-IL").years[0]!.pensionRequired).toBe(
      required("US-IL", 0.0092),
    );
    expect(government("place:1714000").years[0]!.pensionRequired).toBe(
      required("place:1714000", 0.0051),
    );
    // Missouri's reporting plans hold less than half its liability, so it
    // owes the median normal cost; D.C.'s plans are not listed at all.
    expect(government("US-MO").years[0]!.pensionRequired).toBe(
      required("US-MO", MEDIAN_NORMAL_COST_SHARE),
    );
    const dc = government("US-DC").openingNotes.join(" ");
    expect(dc).toContain(
      `Pension normal cost: ${MEDIAN_NORMAL_COST_SHARE} of the liability a year, ESTIMATED FROM AVERAGE`,
    );
    expect(dc).toContain(
      `Benefits paid: ${MEDIAN_BENEFIT_SHARE} of the liability a year, ESTIMATED FROM AVERAGE`,
    );
    expect(government("US-IL").openingNotes.join(" ")).toContain(
      "Benefits paid: 0.0551 of the liability a year, as its own plans filed",
    );

    // At the year's close the liability grows by the plans' own normal cost
    // and both it and the assets shrink by their own benefits: the opening
    // year ran six months, January to June.
    const state = government("US-IL");
    const closed = settleAlone(worldAt("2026-01-05"), state, "2026-07-01")
      .government.pension;
    const { liability } = state.pension;
    const half = 6 / 12;
    expect(closed.liability).toBe(
      Math.round(
        liability * (1 + 0.07 * half) +
          liability * 0.0092 * half -
          liability * 0.0551 * half,
      ),
    );
  });

  it("each government's pension share starts from its own reported payment, or the median where none is reported, and holds", () => {
    const world = runThrough(
      opened(worldAt("2026-01-05", { places: ["1714000", "county:17031"] })),
      "2027-12-01",
    );
    const share = (key: string) =>
      world.publicBudgets!.governments.find((row) => row.key === key)!;
    // Public Plans Database: Illinois' state plans paid 73.27% of the
    // required contribution, weighted by liability; Nevada's plans are not
    // listed, so it pays the median of every plan.
    expect(share("US-IL").years[0]!.pensionShare).toBe(0.7327);
    expect(share("US-NV").years[0]!.pensionShare).toBe(MEDIAN_PAID_SHARE);
    expect(share("US-NV").openingNotes.join(" ")).toContain(
      "ESTIMATED FROM AVERAGE",
    );
    // Chicago and Cook County read their own plans.
    const chicago = share("place:1714000");
    expect(chicago.years[0]!.pensionShare).toBe(0.8635);
    expect(chicago.openingNotes.join(" ")).toContain("as its own plans filed");
    expect(share("county:17031").openingNotes.join(" ")).toContain(
      "as its own plans filed",
    );
    // The share holds from year to year until budgets pass as bills.
    for (const row of world.publicBudgets!.governments)
      for (const year of row.years)
        expect(year.pensionShare).toBe(row.years[0]!.pensionShare);
  });

  it("a pension law enacted after the budget was adopted governs the next budget, and the year's shortfall is credited to the law read at adoption", () => {
    const base = worldAt("2026-01-05", {
      seed: "budget-test-3",
      laws: [{ question: PENSIONS, answer: "yes", jurisdictionId: illinois }],
    });
    const late = {
      ...base,
      history: {
        ...base.history,
        legislativeEnactments: base.history.legislativeEnactments!.map(
          (row) => ({
            ...row,
            resolvedAt: makeIsoDate("2026-09-01"),
            effectiveAt: makeIsoDate("2026-09-01"),
          }),
        ),
      },
    } as World;
    const settled = settleAlone(
      late,
      publicBudgetFor(opened(late), illinois)!,
      "2027-06-01",
    );
    const [fiscal2026, fiscal2027, fiscal2028] = settled.government.years;
    expect(fiscal2027!.laws.pensions.answer).toBe("no");
    expect(fiscal2028!.laws.pensions.answer).toBe("yes");
    const pension = BUDGET_PROGRAMS.indexOf("pensionContribution");
    expect(fiscal2028!.appropriations[pension]).toBe(
      Math.round(
        fiscal2028!.pensionRequired * Math.max(1, fiscal2028!.pensionShare),
      ),
    );
    const underpaid = settled.adjustments.filter(
      (row) => row.kind === "pension-underpaid",
    );
    expect(underpaid.map((row) => row.fiscalYear)).toEqual([
      fiscal2026!.fiscalYear,
      fiscal2027!.fiscalYear,
    ]);
    expect(underpaid.every((row) => row.law?.reading.answer === "no")).toBe(
      true,
    );
  });

  it("income tax withheld from represented people is counted dollar for dollar, and the modeled part covers only everyone else", () => {
    const account = "organization_il" as EntityId;
    const history = {
      organizations: [
        { id: account, stableKey: `public-government:${illinois}` },
      ],
      resourceFlows: [
        {
          id: "flow_1" as EntityId,
          stableKey: "withholding:1",
          source: { kind: "person", personId: "person_1" },
          recipient: { kind: "organization", organizationId: account },
          basisKind: "custom:tax-withholding",
          basisReference: { kind: "general" },
        },
      ],
      resourceTransferOutcomes: [
        {
          id: "outcome_1" as EntityId,
          resourceFlowId: "flow_1" as EntityId,
          status: "completed",
          transferredAmount: { minorUnits: 123_456, currency: "USD" },
        },
      ],
    } as unknown as Partial<World["history"]>;
    const world = worldAt("2026-01-05", { history });
    const base = opened(worldAt("2026-01-05"));
    const settled = settlePublicBudgets(
      { ...opened(world), currentDate: makeIsoDate("2026-02-01") },
      makeIsoDate("2026-01-01"),
    );
    const plain = settlePublicBudgets(
      { ...base, currentDate: makeIsoDate("2026-02-01") },
      makeIsoDate("2026-01-01"),
    );
    const at = BUDGET_SOURCES.indexOf("individualIncomeTax");
    const row = publicBudgetFor(settled, illinois)!.months[0]!;
    const without = publicBudgetFor(plain, illinois)!.months[0]!;
    expect(row.represented).toBe(1);
    const perResident = without.revenue[at]! / 12_710_158;
    expect(row.revenue[at]! - without.revenue[at]!).toBeCloseTo(
      1234.56 - perResident,
      -1,
    );
    expect(settled.publicBudgets!.cursor).toEqual({ flows: 1, outcomes: 1 });
  });

  it("each government reads its own budget laws: Chicago's ordinance governs Chicago's books, and Illinois' statute governs only the state's", () => {
    const chicagoId = lifePlaceByKey("1714000")!.context.jurisdiction.id;
    const world = opened(
      worldAt("2026-01-05", {
        places: ["1714000", "county:17031"],
        laws: [
          { question: BALANCED, answer: "yes", jurisdictionId: illinois },
          { question: RESERVE, answer: "yes", jurisdictionId: chicagoId },
        ],
      }),
    );
    const state = publicBudgetFor(world, illinois)!.years[0]!.laws;
    expect(state.balanced.answer).toBe("yes");
    // Illinois' own reserve statute, which the game begins with.
    expect(state.reserve).toEqual({
      answer: "yes",
      measureId:
        "starting-law:US-IL:us-policy-positions:fiscal.minimum-reserve-balance",
      level: "state-statute",
    });
    const city = publicBudgetFor(world, chicagoId)!.years[0]!.laws;
    // No ordinance of Chicago's answers whether its budget must balance, and
    // Illinois' statute governs only the state's books: the most common real
    // rule for local governments stands in, marked as an estimate.
    expect(city.balanced).toEqual(LOCAL_BALANCED_ESTIMATE);
    expect(city.balanced.estimated).toContain("ESTIMATED FROM AVERAGE");
    expect(city.reserve).toEqual({
      answer: "yes",
      measureId: "measure_1",
      level: "local-ordinance",
    });
    const county = world.publicBudgets!.governments.find(
      (row) => row.key === "county:17031",
    )!.years[0]!.laws;
    expect(county.balanced).toEqual(LOCAL_BALANCED_ESTIMATE);
    expect(county.reserve.answer).toBe("unknown");
  });

  it("a place with no government of its own is served by its county's budget, or in Puerto Rico its municipio's, from ACS populations", () => {
    const world = opened(
      worldAt("2026-01-05", { places: ["7258365", "1004130"] }),
    );
    const store = world.publicBudgets!;
    expect(store.unknown).toEqual([]);
    // Palmas and Bear are census-designated places: neither keeps a budget.
    expect(store.governments.map((row) => row.key)).not.toContain(
      "place:7258365",
    );
    expect(store.governments.map((row) => row.key)).not.toContain(
      "place:1004130",
    );
    // Palmas' residents live in Arroyo (1,097 of 1,119); Bear's in New Castle County.
    const arroyo = store.governments.find((row) => row.key === "county:72015")!;
    const newCastle = store.governments.find(
      (row) => row.key === "county:10003",
    )!;
    expect(arroyo.level).toBe("county");
    expect(arroyo.population).toBe(15_341);
    expect(arroyo.openingNotes[0]).toMatch(/^ESTIMATED FROM AVERAGE/);
    expect(arroyo.openingNotes[0]).toMatch(
      /ACS 2020-2024 five-year population/,
    );
    expect(sum(arroyo.years[0]!.appropriations)).toBeGreaterThan(0);
    expect(newCastle.level).toBe("county");
    expect(newCastle.openingNotes[0]).toMatch(/BEA 2024 population/);
    expect(
      store.governments.find((row) => row.key === "US-PR")!.population,
    ).toBe(3_184_835);
  });

  it("a place with no government in a county area with none is served by its town, its consolidated government or its state", () => {
    // Bethel, Connecticut is a census-designated place in a state with no
    // county governments: the Town of Bethel serves it. Ahuimanu, Hawaii is
    // served by the City and County of Honolulu, a consolidated government.
    // Akiachak, Alaska lies in Alaska's unorganized borough, where no borough or
    // town government exists: the state serves it directly.
    const store = opened(
      worldAt("2026-01-05", { places: ["0904790", "1500400", "0200760"] }),
    ).publicBudgets!;
    expect(store.unknown).toEqual([]);
    const bethel = store.governments.find(
      (row) => row.key === "town:0919004720",
    )!;
    expect(bethel.level).toBe("city");
    expect(bethel.name).toBe("Town of Bethel, Connecticut");
    // The town's own population, not the census-designated place's.
    expect(bethel.population).toBeGreaterThan(11_404);
    expect(sum(bethel.years[0]!.appropriations)).toBeGreaterThan(0);
    expect(bethel.lawJurisdictionId).toBe(
      lifePlaceByKey("0904790")!.context.jurisdiction.id,
    );
    const honolulu = store.governments.find(
      (row) => row.key === "county:15003",
    )!;
    expect(honolulu.level).toBe("county");
    // Each place's police are funded by the government that serves it.
    const world = opened(
      worldAt("2026-01-05", { places: ["0904790", "1500400", "0200760"] }),
    );
    const police = (key: string) =>
      fundingGovernment(
        world,
        lifePlaceByKey(key)!.context.jurisdiction.id,
        "serving-local",
      )?.key;
    expect(police("0904790")).toBe("town:0919004720");
    expect(police("1500400")).toBe("county:15003");
    expect(police("0200760")).toBe("US-AK");
    expect(
      store.governments.filter(
        (row) => row.level !== "state" && row !== bethel && row !== honolulu,
      ),
    ).toEqual([]);
  });

  it("each state's reserve law sets its own target and yearly deposit; one that sets none, and every county and city, takes the median state's", () => {
    // NASBO 2021, Table 13: Rhode Island fills its fund to 5% of general
    // revenue, 3% a year; Texas caps its fund at 10% of a two-year
    // biennium's revenue, 20% of one year's.
    expect(reserveRule({ key: "US-RI", level: "state" })).toMatchObject({
      floorShare: 0.05,
      depositShare: 0.03,
    });
    expect(reserveRule({ key: "US-TX", level: "state" })).toMatchObject({
      floorShare: 0.2,
      depositShare: MEDIAN_RESERVE_DEPOSIT,
    });
    // Illinois' Budget Stabilization Fund has no size in law.
    const illinoisRule = reserveRule({ key: "US-IL", level: "state" });
    expect(illinoisRule.floorShare).toBe(MEDIAN_RESERVE_TARGET);
    expect(illinoisRule.basis).toMatch(/ESTIMATED FROM AVERAGE/);
    expect(MEDIAN_RESERVE_TARGET).toBe(0.1);
    expect(MEDIAN_RESERVE_DEPOSIT).toBe(0.01);
    const chicago = reserveRule({ key: "place:1714000", level: "city" });
    expect(chicago.floorShare).toBe(MEDIAN_RESERVE_TARGET);
    expect(chicago.basis).toMatch(/own reserve policy is not read yet/);
  });

  it("the balance above the reserve target is carried into the next budget and spent across the year, once", () => {
    // Without a reserve law, which Illinois begins with, a surplus stays in
    // the balance.
    const world = worldAt("2026-01-05", {
      laws: [{ question: RESERVE, answer: "no", jurisdictionId: illinois }],
    });
    // Its reserve starts at its target, so the whole spare balance is
    // carried.
    const opening = publicBudgetFor(opened(world), illinois)!;
    const state = {
      ...opening,
      reserve: Math.round(
        reserveRule(opening).floorShare * sum(opening.years[0]!.appropriations),
      ),
    };
    const run = settleAlone(world, state, "2027-06-01");
    const carried = run.adjustments.filter(
      (row) => row.kind === "balance-carried",
    );
    expect(carried[0]!.fiscalYear).toBe(2027);
    expect(carried[0]!.law).toBeNull();
    expect(carried[0]!.note).toContain(reserveRule(opening).basis);
    expect(carried[0]!.note).not.toContain("PLACEHOLDER");
    const [, fy2027, fy2028] = run.government.years;
    const cuttable = (values: readonly number[]) =>
      sum(
        BUDGET_PROGRAMS.map((program, at) =>
          program === "interest" || program === "pensionContribution"
            ? 0
            : values[at]!,
        ),
      );
    // Fiscal 2027 plans the carried balance on top of its programs.
    expect(fy2027!.carriedBalance).toBe(carried[0]!.amount);
    const june2026 = run.government.months.find(
      (row) => row.month === "2026-06-01",
    )!;
    // Illinois' own law sets no size, so its target is the median state's.
    expect(reserveRule(state).floorShare).toBe(MEDIAN_RESERVE_TARGET);
    const target =
      reserveRule(state).floorShare * sum(state.years[0]!.appropriations);
    expect(carried[0]!.amount).toBe(
      Math.round(june2026.balance - Math.max(0, target - june2026.reserve)),
    );
    // Spent across the year: the balance ends it near what was kept back.
    const june2027 = run.government.months.find(
      (row) => row.month === "2027-06-01",
    )!;
    expect(
      Math.abs(june2027.balance - (june2026.balance - carried[0]!.amount)),
    ).toBeLessThan(0.01 * sum(fy2027!.appropriations));
    // Once: fiscal 2028 builds on fiscal 2027's programs without it.
    expect(
      Math.abs(
        cuttable(fy2028!.appropriations) -
          fy2028!.carriedBalance! -
          (cuttable(fy2027!.appropriations) - fy2027!.carriedBalance!),
      ),
    ).toBeLessThan(0.001 * cuttable(fy2027!.appropriations));
  });

  it("a city's aid from its state follows what the state spends on local aid, so a state cut reaches it the same month", () => {
    const world = opened(worldAt("2026-01-05", { places: ["1714000"] }));
    const store = world.publicBudgets!;
    const chicago = store.governments.find(
      (row) => row.key === "place:1714000",
    )!;
    const state = publicBudgetFor(world, illinois)!;
    const localAid = BUDGET_PROGRAMS.indexOf("localAid");
    const aid = BUDGET_SOURCES.indexOf("intergovernmental");
    expect(chicago.years[0]!.stateLocalAidAtAdoption).toBe(
      state.years[0]!.appropriations[localAid],
    );
    const cutWorld: World = {
      ...world,
      publicBudgets: {
        ...store,
        governments: store.governments.map((row) =>
          row.key === "US-IL" ? { ...row, cut: 0.1 } : row,
        ),
      },
    };
    const expected = chicago.years[0]!.expectedRevenue[aid]! / 12;
    const whole = runThrough(world, "2026-01-01");
    const cut = runThrough(cutWorld, "2026-01-01");
    const januaryAid = (next: World) =>
      next.publicBudgets!.governments.find(
        (row) => row.key === "place:1714000",
      )!.months[0]!.revenue[aid]!;
    expect(januaryAid(whole)).toBeCloseTo(expected, -1);
    expect(januaryAid(cut)).toBeCloseTo(expected * 0.9, -1);
    // Illinois' fiscal 2027 budget spends its carried balance, local aid
    // included, and Chicago's aid rises with it from July.
    const year = runThrough(world, "2026-07-01");
    const months = year.publicBudgets!.governments.find(
      (row) => row.key === "place:1714000",
    )!.months;
    const june = months.find((row) => row.month === "2026-06-01")!;
    const july = months.find((row) => row.month === "2026-07-01")!;
    expect(july.revenue[aid]!).toBeGreaterThan(june.revenue[aid]!);
  });

  it("a state income tax law changes the income tax from the tax year it takes effect in, as paychecks do, and the next budgets count it once", () => {
    // Illinois began with a flat income tax; a graduated one takes effect on
    // March 1, 2026. Paychecks withhold under the law in force on January 1
    // of the tax year, so the budget collects the change from January 2027.
    const graduated = TAX_QUESTION_EFFECTS.find((row) =>
      row.questionKey.endsWith("graduated-income-tax"),
    )!;
    const withLaw = worldAt("2026-01-05", {
      laws: [{ question: GRADUATED, answer: "yes", jurisdictionId: illinois }],
      history: {
        legislativeEnactments: [
          {
            id: "enactment_0" as EntityId,
            sequence: 1000,
            measureId: "measure_0" as EntityId,
            resolvedAt: makeIsoDate("2026-02-01"),
            outcome: "enacted",
            effectiveAt: makeIsoDate("2026-03-01"),
          },
        ] as unknown as World["history"]["legislativeEnactments"],
      },
    });
    const without = worldAt("2026-01-05");
    const run = (world: World) =>
      settleAlone(
        world,
        publicBudgetFor(opened(world), illinois)!,
        "2028-06-01",
      ).government;
    const lawful = run(withLaw);
    const flat = run(without);
    const at = BUDGET_SOURCES.indexOf("individualIncomeTax");
    const month = (government: PublicBudgetGovernment, on: string) =>
      government.months.find((row) => row.month === on)!.revenue[at]!;
    const size = 1 + graduated.toYes!;
    expect(size).toBeCloseTo(1 + 3.4 / 22.7, 6);
    // Nothing before the tax year it takes effect in; the full change from
    // January on.
    expect(month(lawful, "2026-03-01")).toBe(month(flat, "2026-03-01"));
    expect(month(lawful, "2026-12-01")).toBe(month(flat, "2026-12-01"));
    expect(month(lawful, "2027-01-01") / month(flat, "2027-01-01")).toBeCloseTo(
      size,
      4,
    );
    // Fiscal 2027 was adopted in July 2026 under the flat tax; fiscal 2028
    // expects the change once, not compounded.
    const expected = (fy: number) =>
      lawful.years[fy]!.expectedRevenue[at]! /
      flat.years[fy]!.expectedRevenue[at]!;
    expect(expected(1)).toBeCloseTo(1, 6);
    expect(expected(2)).toBeCloseTo(size, 3);
    expect(month(lawful, "2028-03-01") / month(flat, "2028-03-01")).toBeCloseTo(
      size,
      3,
    );
  });

  it("a state that repeals its income tax collects none from the next tax year, its next budget expects none, and a law restoring it collects again", () => {
    // Illinois began with an income tax. A repeal takes effect May 12, 2026;
    // a law restoring the tax takes effect June 1, 2027.
    const world = worldAt("2026-01-05", {
      laws: [
        { question: INCOME_TAX, answer: "no", jurisdictionId: illinois },
        { question: INCOME_TAX, answer: "yes", jurisdictionId: illinois },
      ],
      history: {
        legislativeEnactments: [
          {
            id: "enactment_0" as EntityId,
            sequence: 1000,
            measureId: "measure_0" as EntityId,
            resolvedAt: makeIsoDate("2026-05-12"),
            outcome: "enacted",
            effectiveAt: makeIsoDate("2026-05-12"),
          },
          {
            id: "enactment_1" as EntityId,
            sequence: 1001,
            measureId: "measure_1" as EntityId,
            resolvedAt: makeIsoDate("2027-06-01"),
            outcome: "enacted",
            effectiveAt: makeIsoDate("2027-06-01"),
          },
        ] as unknown as World["history"]["legislativeEnactments"],
      },
    });
    const government = settleAlone(
      world,
      publicBudgetFor(opened(world), illinois)!,
      "2028-06-01",
    ).government;
    const at = BUDGET_SOURCES.indexOf("individualIncomeTax");
    const month = (on: string) =>
      government.months.find((row) => row.month === on)!.revenue[at]!;
    // Paychecks withhold until the tax year ends, so the budget collects
    // until then too.
    expect(month("2026-12-01")).toBeGreaterThan(0);
    for (const on of ["2027-01-01", "2027-06-01", "2027-12-01"])
      expect(month(on)).toBe(0);
    // Fiscal 2028 was adopted in July 2027, while the repeal still governed
    // the tax year: it expects none.
    expect(government.years[2]!.expectedRevenue[at]).toBe(0);
    // The restored tax collects from January 2028 at the level Illinois
    // opened with (this test world records no economy to carry it by).
    expect(month("2028-01-01")).toBe(
      Math.round(government.years[0]!.expectedRevenue[at]! / 12),
    );
    // Other sources keep collecting throughout.
    const sales = BUDGET_SOURCES.indexOf("generalSalesTax");
    expect(
      government.months.find((row) => row.month === "2027-01-01")!.revenue[
        sales
      ]!,
    ).toBeGreaterThan(0);
  });

  it("a law raising or lowering the juvenile court age moves the state's corrections spending from the month it takes effect", () => {
    // Texas began trying 17-year-olds as adults and raises the juvenile court
    // age; Illinois began with the higher age and lowers it. Each takes
    // effect May 12, 2026.
    const texas = stateJurisdictionForKey("US-TX")!.id;
    const enacted = (at: number) => ({
      id: `enactment_${at}` as EntityId,
      sequence: 1000 + at,
      measureId: `measure_${at}` as EntityId,
      resolvedAt: makeIsoDate("2026-05-12"),
      outcome: "enacted",
      effectiveAt: makeIsoDate("2026-05-12"),
    });
    const world = worldAt("2026-01-05", {
      laws: [
        { question: JUVENILE_AGE, answer: "yes", jurisdictionId: texas },
        { question: JUVENILE_AGE, answer: "no", jurisdictionId: illinois },
      ],
      history: {
        legislativeEnactments: [
          enacted(0),
          enacted(1),
        ] as unknown as World["history"]["legislativeEnactments"],
      },
    });
    const juvenile = SPENDING_QUESTION_EFFECTS.find((effect) =>
      effect.questionKey.endsWith("raise-juvenile-court-age"),
    )!;
    const corrections = BUDGET_PROGRAMS.indexOf("corrections");
    const run = (jurisdictionId: EntityId) => {
      const opening = publicBudgetFor(opened(world), jurisdictionId)!;
      const government = settleAlone(world, opening, "2027-08-01").government;
      const month = (on: string) =>
        government.months.find((row) => row.month === on)!.spending[
          corrections
        ]!;
      return { opening, government, month };
    };
    // New York's $250 million a year over its 19,867,248 residents, $12.58 a
    // resident, times Texas's residents, a twelfth a month.
    expect(juvenile.toYes).toBeCloseTo(12.58, 2);
    const tx = run(texas);
    const txMonthly = (juvenile.toYes! * tx.opening.population) / 12;
    expect(tx.month("2026-06-01") - tx.month("2026-04-01")).toBeCloseTo(
      txMonthly,
      -1,
    );
    // The cost stays in every later month, across Texas's next budget.
    expect(
      lawSpendingForMonth(world, tx.government, makeIsoDate("2027-07-01"))[
        corrections
      ],
    ).toBeCloseTo(txMonthly, 2);
    const il = run(illinois);
    expect(il.month("2026-06-01") - il.month("2026-04-01")).toBeCloseTo(
      (juvenile.toNo! * il.opening.population) / 12,
      -1,
    );
  });

  it("a governor decides from their principles whether money a law saved the state goes to the reserve or to programs", () => {
    // Illinois lowers the juvenile court age from May 12, 2026, which takes
    // $12.58 a resident a year off its corrections spending. Its next budget
    // is adopted July 1, 2026, and its governor decides what to do with it.
    const governorId = "person_governor" as EntityId;
    const restraint = "principle_fiscal_restraint" as EntityId;
    seated.holders = [
      {
        officeKey: "il-governor",
        title: "Governor",
        stateUsps: "IL",
        personId: governorId,
        personName: "Dana Reyes",
      } as unknown as StateExecutiveHolderRecord,
    ];
    const lowered = worldAt("2026-01-05", {
      laws: [
        { question: JUVENILE_AGE, answer: "no", jurisdictionId: illinois },
      ],
      history: {
        legislativeEnactments: [
          {
            id: "enactment_0" as EntityId,
            sequence: 1000,
            measureId: "measure_0" as EntityId,
            resolvedAt: makeIsoDate("2026-05-12"),
            outcome: "enacted",
            effectiveAt: makeIsoDate("2026-05-12"),
          },
        ] as unknown as World["history"]["legislativeEnactments"],
      },
    });
    const holding = (stance: "endorses" | "rejects"): World => ({
      ...lowered,
      policyCatalog: {
        propositions: {
          ...lowered.policyCatalog.propositions,
          [RESERVE]: {
            ...lowered.policyCatalog.propositions[RESERVE]!,
            principles: [
              { principleId: restraint, bearing: "consistent-with" },
            ],
          },
          [BALANCED]: {
            ...lowered.policyCatalog.propositions[BALANCED]!,
            principles: [
              { principleId: restraint, bearing: "consistent-with" },
            ],
          },
        },
      } as unknown as World["policyCatalog"],
      history: {
        ...lowered.history,
        principles: [
          {
            id: "principle_record_1" as EntityId,
            sequence: 1,
            personId: governorId,
            principleId: restraint,
            formedAt: makeIsoDate("2000-01-01"),
            stance,
            conviction: "strong",
          },
        ] as unknown as World["history"]["principles"],
      },
    });
    const juvenile = SPENDING_QUESTION_EFFECTS.find((effect) =>
      effect.questionKey.endsWith("raise-juvenile-court-age"),
    )!;
    try {
      for (const stance of ["endorses", "rejects"] as const) {
        const world = holding(stance);
        const opening = publicBudgetFor(opened(world), illinois)!;
        const { government, adjustments } = settleAlone(
          world,
          opening,
          "2026-06-01",
        );
        const reaction = adjustments.find((row) =>
          row.kind.startsWith("law-gain"),
        )!;
        // The saving is a year of the cost at Illinois's residents.
        expect(reaction.amount).toBeCloseTo(
          -juvenile.toNo! * opening.population,
          -3,
        );
        expect(reaction.decidedBy).toEqual({
          personId: governorId,
          principleRecordIds: ["principle_record_1"],
        });
        expect(reaction.note).toContain("Governor Dana Reyes");
        const adopted = government.years.at(-1)!;
        expect(adopted.fiscalYear).toBe(2027);
        // A loss the laws caused, where no law requires a balanced budget:
        // the governor who favors restraint cuts, the other keeps programs.
        // Where a law requires balance, the one who favors a reserve cuts
        // and the other draws the reserve, when it holds something to draw.
        const loss = (balanced: boolean, drawable: number) =>
          decideLawMoneyReaction(
            world,
            government,
            -5_000_000,
            balanced,
            drawable,
          )?.choice;
        expect(loss(false, 0)).toBe(stance === "endorses" ? "cut" : "keep");
        expect(loss(true, 1_000_000)).toBe(
          stance === "endorses" ? "cut" : "draw",
        );
        expect(loss(true, 0)).toBe("cut");
        if (stance === "endorses") {
          // Fiscal restraint favors a reserve: the saving is set aside.
          expect(reaction.kind).toBe("law-gain-saved");
          expect(adopted.reserveDeposit).toBeGreaterThanOrEqual(
            reaction.amount,
          );
        } else {
          expect(reaction.kind).toBe("law-gain-spent");
        }
      }
    } finally {
      seated.holders = [];
    }
  });

  it("maps an appropriation's program to its budget line", () => {
    expect(budgetProgramFor("transit-access:il")).toBe("transit");
    expect(budgetProgramFor("bridge-maintenance:il")).toBe("highways");
    expect(budgetProgramFor("broadband-access:il")).toBe("otherPrograms");
  });
});
