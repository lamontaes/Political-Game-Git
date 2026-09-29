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
import { MEDIAN_PAID_SHARE } from "./pension-share";
import { fundingGovernment } from "./staffing";
import { TAX_QUESTION_EFFECTS } from "./rules";

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
const QUESTIONS: Readonly<Record<string, EntityId>> = {
  "fiscal.balanced-operating-budget": BALANCED,
  "fiscal.minimum-reserve-balance": RESERVE,
  "fiscal.fund-pensions-to-schedule": PENSIONS,
  "fiscal.graduated-income-tax": GRADUATED,
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

  it("without a pension law the government pays its own measured share, and its unfunded liability grows faster", () => {
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
    expect(chicago.openingNotes.join(" ")).toContain(
      "as its own plans reported",
    );
    expect(share("county:17031").openingNotes.join(" ")).toContain(
      "as its own plans reported",
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

  it("the balance above the reserve target is carried into the next budget and spent across the year, once", () => {
    // Without a reserve law, which Illinois begins with, a surplus stays in
    // the balance.
    const world = worldAt("2026-01-05", {
      laws: [{ question: RESERVE, answer: "no", jurisdictionId: illinois }],
    });
    const state = publicBudgetFor(opened(world), illinois)!;
    const run = settleAlone(world, state, "2027-06-01");
    const carried = run.adjustments.filter(
      (row) => row.kind === "balance-carried",
    );
    expect(carried[0]!.fiscalYear).toBe(2027);
    expect(carried[0]!.law).toBeNull();
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
    const target = 0.05 * sum(state.years[0]!.appropriations);
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

  it("a state income tax law changes the income tax from the month it takes effect, and the next budgets count it once", () => {
    // Illinois began with a flat income tax; a graduated one takes effect on
    // March 1, 2026.
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
    // Nothing before it takes effect; the full change from that month on.
    expect(month(lawful, "2026-02-01")).toBe(month(flat, "2026-02-01"));
    expect(month(lawful, "2026-03-01") / month(flat, "2026-03-01")).toBeCloseTo(
      size,
      4,
    );
    // Fiscal 2027 and 2028 each expect the change once, not compounded.
    for (const fy of [1, 2]) {
      const ratio =
        lawful.years[fy]!.expectedRevenue[at]! /
        flat.years[fy]!.expectedRevenue[at]!;
      expect(ratio).toBeCloseTo(size, 3);
    }
    expect(month(lawful, "2028-03-01") / month(flat, "2028-03-01")).toBeCloseTo(
      size,
      3,
    );
  });

  it("maps an appropriation's program to its budget line", () => {
    expect(budgetProgramFor("transit-access:il")).toBe("transit");
    expect(budgetProgramFor("bridge-maintenance:il")).toBe("highways");
    expect(budgetProgramFor("broadband-access:il")).toBe("otherPrograms");
  });
});
