import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lifePlaceByKey, stateJurisdictionForKey } from "../life-places";
import { STATES } from "../state-reference";
import type { EntityId, World } from "../types";
import { firstOfNextMonth } from "./fiscal";
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
import { settleGovernmentMonth, type MonthFlows } from "./month";
import { PENSION } from "./rules";

/*
 * Every government keeps a budget, and the three budget laws act on it. The
 * world here is partial, as in the place-outcome tests: the budget reads the
 * date, the policy catalog, the legislative history, the public accounts'
 * flows and the jurisdictions present, and no recorded economy.
 */

const BALANCED = "proposition_balanced" as EntityId;
const RESERVE = "proposition_reserve" as EntityId;
const PENSIONS = "proposition_pensions" as EntityId;
const QUESTIONS: Readonly<Record<string, EntityId>> = {
  "fiscal.balanced-operating-budget": BALANCED,
  "fiscal.minimum-reserve-balance": RESERVE,
  "fiscal.fund-pensions-to-schedule": PENSIONS,
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
  } = {},
): World {
  const laws = options.laws ?? [];
  const places = (options.places ?? []).map((key) => lifePlaceByKey(key)!);
  return {
    id: "world_test" as EntityId,
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
  it("every state, D.C. and territory the research covers keeps a budget for a full year, and the two it does not are listed as unknown", () => {
    const world = runThrough(opened(worldAt("2026-01-05")), "2026-12-01");
    const store = world.publicBudgets!;
    const keys = Object.keys(STATES).map((usps) => `US-${usps}`);
    const kept = new Set(store.governments.map((row) => row.key));
    expect([...kept].sort()).toEqual(
      keys.filter((key) => key !== "US-AS" && key !== "US-MP").sort(),
    );
    expect(store.unknown.map((row) => row.key).sort()).toEqual([
      "US-AS",
      "US-MP",
    ]);
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

  it("Illinois opens at its Census figures per resident times its 2024 population, and adopts fiscal 2027 on July 1", () => {
    const world = runThrough(opened(worldAt("2026-01-05")), "2026-06-01");
    const state = publicBudgetFor(world, illinois)!;
    expect(state.population).toBe(12_710_158);
    expect(state.fiscalYearStart).toBe("07-01");
    const opening = state.years[0]!;
    expect(opening.fiscalYear).toBe(2026);
    // Census 2022: $1,795.36 of state income tax per resident.
    const incomeTax =
      opening.expectedRevenue[BUDGET_SOURCES.indexOf("individualIncomeTax")]!;
    expect(incomeTax / 12_710_158).toBeCloseTo(1795.36 * 1.1506, 0);
    expect(state.reserve).toBe(2_518_000_000);
    const next = state.years[1]!;
    expect(next.fiscalYear).toBe(2027);
    expect(next.startsOn).toBe("2026-07-01");
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

    const without = worldAt("2026-01-05");
    const loose = shortfall(publicBudgetFor(opened(without), illinois)!);
    const debtRun = settleAlone(without, loose, "2026-06-01");
    expect(debtRun.adjustments.some((row) => row.kind === "mid-year-cut")).toBe(
      false,
    );
    const borrowed = debtRun.adjustments.find(
      (row) => row.kind === "deficit-borrowed",
    )!;
    expect(borrowed.law?.reading.answer).toBe("unknown");
    expect(debtRun.government.debt).toBe(loose.debt + borrowed.amount);
    expect(debtRun.government.balance).toBe(0);
  });

  it("a minimum-reserve law sends the year's surplus to the reserve and sets a deposit; without it the surplus stays in the balance", () => {
    const withLaw = worldAt("2026-01-05", {
      laws: [{ question: RESERVE, answer: "yes", jurisdictionId: illinois }],
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

    const without = worldAt("2026-01-05");
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

  it("without a pension law the government pays a lower share and its unfunded liability grows faster", () => {
    const withLaw = worldAt("2026-01-05", {
      laws: [{ question: PENSIONS, answer: "yes", jurisdictionId: illinois }],
    });
    const full = settleAlone(
      withLaw,
      publicBudgetFor(opened(withLaw), illinois)!,
      "2027-06-01",
    );
    const without = worldAt("2026-01-05");
    const partial = settleAlone(
      without,
      publicBudgetFor(opened(without), illinois)!,
      "2027-06-01",
    );
    const unfunded = (government: PublicBudgetGovernment) =>
      government.pension.liability - government.pension.assets;
    expect(unfunded(partial.government)).toBeGreaterThan(
      unfunded(full.government),
    );
    const underpaid = partial.adjustments.filter(
      (row) => row.kind === "pension-underpaid",
    );
    expect(underpaid.length).toBe(2);
    expect(underpaid[0]!.law?.reading.answer).toBe("unknown");
    expect(
      full.adjustments.some((row) => row.kind === "pension-underpaid"),
    ).toBe(false);
    const adopted = partial.government.years.at(-1)!;
    const pension = BUDGET_PROGRAMS.indexOf("pensionContribution");
    expect(adopted.appropriations[pension]).toBe(
      Math.round(adopted.pensionRequired * PENSION.paidShareWithoutLaw),
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
    expect(state.reserve.answer).toBe("unknown");
    const city = publicBudgetFor(world, chicagoId)!.years[0]!.laws;
    expect(city.balanced.answer).toBe("unknown");
    expect(city.reserve).toEqual({
      answer: "yes",
      measureId: "measure_1",
      level: "local-ordinance",
    });
    const county = world.publicBudgets!.governments.find(
      (row) => row.key === "county:17031",
    )!.years[0]!.laws;
    expect(county.balanced.answer).toBe("unknown");
    expect(county.reserve.answer).toBe("unknown");
  });

  it("maps an appropriation's program to its budget line", () => {
    expect(budgetProgramFor("transit-access:il")).toBe("transit");
    expect(budgetProgramFor("bridge-maintenance:il")).toBe("highways");
    expect(budgetProgramFor("broadband-access:il")).toBe("otherPrograms");
  });
});
