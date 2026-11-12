/**
 * The town's economy as dated records: on the second of each month, after
 * the month's reviews, one row per place with jobs, unemployment, pay,
 * prices, businesses, rent, mortgages and bank lending, read from the
 * engines' own records, plus the closed-year timeline (`years`) folded each
 * December. Screens and the outcome web (M3-04) read these rows; nothing here
 * moves money or decides anything.
 */
import { countedResidents } from "../electorate";
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  historyMonths,
  MACRO_HISTORY_SOURCE,
  monthKey,
  shiftMonth,
  type MacroMonth,
} from "../macro-model";
import {
  OUTPUT_NUMBERS,
  putOutputNumber,
  type OutputNumberEntry,
} from "../output-numbers";
import { placeStateKey } from "../place-map";
import type { PreStartModule } from "../pre-start";
import {
  openingRegionMonths,
  REGION_SOURCE,
  stateFigures,
  type RegionMonth,
} from "../regional-model";
import type { CoreAPI, CoreState, Source } from "../types";
import { povertyByPlace } from "../world-poverty";
import { BUDGETS_MODULE_ID, budgetsOf, governments } from "./budgets";
import { HOUSING_MODULE_ID, townFiguresByPlace } from "./housing";
import { MACRO_MODULE_ID } from "./macro";
import { regionOfPlace } from "./regional";
import { residentsRuntime } from "./residents";

export const WORLD_METRICS_MODULE_ID = "world-metrics";

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
};

function rows(api: CoreAPI, moduleId: string, table: string) {
  return (api.state as CoreState).modules.has(moduleId)
    ? api.moduleState(moduleId).table(table).rows()
    : [];
}

/** The town's economic numbers today, one entry per place. */
export function townMetrics(api: CoreAPI) {
  const c = api.state as CoreState;
  const rt = residentsRuntime(c);
  const month = c.date.slice(0, "YYYY-MM".length);
  const places = new Map<
    string,
    {
      employed: number;
      /** Residents who hold a job, wherever it is: the labor force the unemployment rate stands on. */
      residentsEmployed: number;
      unemployed: number;
      townEmployed: number;
      townSeekers: number;
      openPositions: number;
      openUnemploymentClaims: number;
      hourly: number[];
      open: number;
      closedThisMonth: number;
      foundedThisMonth: number;
      price: number[];
      rents: number[];
      /** Each household's yearly earnings, by household. */
      earnings: Map<string, number>;
      evictionOrders: number;
      evictionsLastYear: number;
      evictionsPriorYear: number;
    }
  >();
  const at = (placeId: string) => {
    let row = places.get(placeId);
    if (!row)
      places.set(
        placeId,
        (row = {
          employed: 0,
          residentsEmployed: 0,
          unemployed: 0,
          townEmployed: 0,
          townSeekers: 0,
          openPositions: 0,
          openUnemploymentClaims: 0,
          hourly: [],
          open: 0,
          closedThisMonth: 0,
          foundedThisMonth: 0,
          price: [],
          rents: [],
          earnings: new Map(),
          evictionOrders: 0,
          evictionsLastYear: 0,
          evictionsPriorYear: 0,
        }),
      );
    return row;
  };
  const housingTown = (c.placeMetadata as { housingTown?: string } | undefined)
    ?.housingTown;
  if (housingTown) at(housingTown);
  const playerPlace = c.playerId
    ? c.people.get(c.playerId)?.placeId
    : undefined;
  if (playerPlace) at(playerPlace);

  const placeOf = (organizationId: string) =>
    c.organizations.get(organizationId)?.placeId;
  const daysPerYear = api.parameter("jobsDaysPerYear");
  // A household's yearly earnings count where it lives.
  const earn = (
    placeId: string | undefined,
    householdId: string | undefined,
    dailyMinor: number,
  ) => {
    if (!placeId || !householdId || dailyMinor <= 0) return;
    const row = at(placeId).earnings;
    row.set(
      householdId,
      (row.get(householdId) ?? 0) + dailyMinor * daysPerYear,
    );
  };
  const counted = new Map<string, { placeId: string; weight: number }>();
  for (const row of countedResidents(c)) {
    counted.set(row.id, { placeId: row.placeId, weight: row.weight });
    if (row.weeklyMinutes > 0) at(row.placeId).townEmployed += row.weight;
  }
  const atWork = new Set<string>();
  for (const job of c.jobs.values()) {
    if (job.endsAt === undefined) {
      const worker = c.people.get(job.personId);
      if (worker?.alive === true && !atWork.has(job.personId)) {
        atWork.add(job.personId);
        at(worker.placeId).townEmployed += 1;
      }
    }
    const placeId = placeOf(job.organizationId);
    if (job.endsAt !== undefined || !placeId) continue;
    at(placeId).employed += 1;
    if (job.hourlyMinor) at(placeId).hourly.push(job.hourlyMinor);
    const person = c.people.get(job.personId);
    const home = person ? c.households.get(person.householdId) : undefined;
    earn(home?.placeId, home?.id, job.wageDailyMinor);
    if (home?.placeId) at(home.placeId).residentsEmployed += 1;
  }
  for (const h of rt?.store.liveHouseholds() ?? [])
    at(h.placeId).townEmployed += h.unplacedWorkers * rt!.store.weightOf(h);
  for (const [jobId, flow] of rt?.wageFlowByJob ?? []) {
    const job = rt!.jobs.get(jobId);
    const placeId = flow.organizationId && placeOf(flow.organizationId);
    if (!job || job.endsAt !== undefined || flow.endedAt || !placeId) continue;
    at(placeId).employed += 1;
    if (job.hourlyMinor) at(placeId).hourly.push(job.hourlyMinor);
    // The worker's group, read from its columns, not through a person record.
    const m = rt!.store.countedMember(job.personId);
    const home =
      m === undefined
        ? undefined
        : rt!.store.households[rt!.store.household[m]!];
    earn(
      home && !home.gone ? home.placeId : undefined,
      home?.id,
      job.wageDailyMinor,
    );
    if (home && !home.gone) at(home.placeId).residentsEmployed += 1;
  }
  // Eviction orders (judgments) in the month before this one, and notices over the past two years.
  const lastMonth = addDays(makeIsoDate(`${month}-01`), -1).slice(
    0,
    "YYYY-MM".length,
  );
  const yearDays = Math.round(daysPerYear);
  const yearAgo = addDays(makeIsoDate(c.date), -yearDays);
  const twoYearsAgo = addDays(makeIsoDate(c.date), -yearDays * 2);
  const homePlace = new Map<string, string>();
  for (const person of c.people.values())
    if (person.householdId) homePlace.set(person.householdId, person.placeId);
  for (const row of rows(api, HOUSING_MODULE_ID, "cases") as unknown as {
    householdId: string;
    judgmentAt?: string;
    noticeAt?: string;
  }[]) {
    const placeId =
      c.households.get(row.householdId)?.placeId ??
      rt?.store.liveHousehold(row.householdId)?.placeId ??
      homePlace.get(row.householdId);
    if (!placeId) continue;
    if (row.judgmentAt?.startsWith(lastMonth)) at(placeId).evictionOrders += 1;
    if (row.noticeAt && row.noticeAt > yearAgo && row.noticeAt <= c.date)
      at(placeId).evictionsLastYear += 1;
    else if (
      row.noticeAt &&
      row.noticeAt > twoYearsAgo &&
      row.noticeAt <= yearAgo
    )
      at(placeId).evictionsPriorYear += 1;
  }
  const looking = new Map<string, { placeId: string; heads: number }>();
  for (const table of ["seekers", "countedSeekers"])
    for (const row of rows(api, "jobs", table) as unknown as {
      personId: string;
      placeId: string;
      employed: boolean;
    }[]) {
      if (!row.employed) at(row.placeId).unemployed += 1;
      const cr = counted.get(row.personId);
      if (cr) {
        looking.set(row.personId, { placeId: cr.placeId, heads: cr.weight });
      } else {
        const person = c.people.get(row.personId as never);
        if (person?.alive === true)
          looking.set(row.personId, { placeId: person.placeId, heads: 1 });
      }
    }
  for (const { placeId, heads } of looking.values())
    at(placeId).townSeekers += heads;
  if (c.modules.has("jobs")) {
    for (const row of api
      .moduleState("jobs")
      .table("positions")
      .query("byStatus", ["open"]) as unknown as {
      placeId: string;
      heads?: number;
    }[])
      if (row.placeId) at(row.placeId).openPositions += row.heads ?? 1;
    for (const row of rows(api, "jobs", "claims") as unknown as {
      personId: string;
      open: boolean;
    }[]) {
      if (!row.open) continue;
      const placeId =
        c.people.get(row.personId as never)?.placeId ??
        counted.get(row.personId)?.placeId;
      if (placeId) at(placeId).openUnemploymentClaims += 1;
    }
  }
  for (const [id, book] of c.finance.businesses) {
    const placeId = placeOf(id);
    if (!placeId) continue;
    if (!book.closedAt) {
      at(placeId).open += 1;
      at(placeId).price.push(book.price / (book.anchorPrice || 1));
    } else if (book.closedAt.startsWith(month))
      at(placeId).closedThisMonth += 1;
  }
  for (const row of rows(api, "business", "foundings") as unknown as {
    placeId?: string;
    date: string;
  }[])
    if (row.placeId && row.date.startsWith(month))
      at(row.placeId).foundedThisMonth += 1;
  for (const [id, row] of c.finance.contracts) {
    const placeId = row.householdId
      ? c.households.get(row.householdId)?.placeId
      : undefined;
    if (id.startsWith("lease:") && !row.endedAt && placeId)
      at(placeId).rents.push(row.amountMinor);
  }
  for (const flow of rt?.flows.values() ?? [])
    if (flow.id.startsWith("rent:") && !flow.endedAt)
      at(flow.placeId).rents.push(flow.amountMinor);
  const mortgages = rows(api, "housing", "mortgages") as unknown as {
    balanceMinor: number;
    monthsLeft: number;
  }[];
  const loans = rows(api, "credit", "loans") as unknown as {
    open: boolean;
  }[];
  const stockByPlace = new Map<
    string,
    {
      rentalUnits: number;
      vacantRental: number;
      openingRentMinor: number;
      openingHomeValueMinor: number;
    }
  >();
  for (const s of rows(api, HOUSING_MODULE_ID, "stock") as unknown as {
    placeId: string;
    rentalUnits: number;
    vacantRental: number;
    openingRentMinor: number;
    openingHomeValueMinor: number;
  }[]) {
    stockByPlace.set(s.placeId, s);
    at(s.placeId);
  }
  let townBudget:
    | {
        placeId: string;
        fiscalYear: number;
        revenueMinor: number;
        spendingMinor: number;
        priorRevenueMinor?: number;
        priorSpendingMinor?: number;
      }
    | undefined;
  if (c.modules.has(BUDGETS_MODULE_ID)) {
    const allGovs = governments(api);
    const townGov = ["city", "county"]
      .map((level) =>
        allGovs.find(
          (g) => g.level === level && budgetsOf(api, g.id).length > 0,
        ),
      )
      .find(Boolean);
    if (townGov) {
      const budgetYears = [...budgetsOf(api, townGov.id)].sort(
        (a, b) => b.fiscalYear - a.fiscalYear,
      );
      const latest = budgetYears[0];
      const prior = budgetYears[1];
      const sum = (lines: Readonly<Record<string, number>>) =>
        Object.values(lines).reduce((total, minor) => total + minor, 0);
      if (latest) {
        at(townGov.jurisdictionId);
        townBudget = {
          placeId: townGov.jurisdictionId,
          fiscalYear: latest.fiscalYear,
          revenueMinor: sum(latest.revenueMinor),
          spendingMinor: sum(latest.spendingMinor),
          ...(prior
            ? {
                priorRevenueMinor: sum(prior.revenueMinor),
                priorSpendingMinor: sum(prior.spendingMinor),
              }
            : {}),
        };
      }
    }
  }
  const poverty = povertyByPlace(c);
  const housing = c.modules.has(HOUSING_MODULE_ID)
    ? townFiguresByPlace(api, new Set(places.keys()))
    : undefined;
  const hasJobs = c.modules.has("jobs");
  return [...places]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([placeId, row]) => {
      const income = median([...row.earnings.values()]);
      const homes = housing?.get(placeId);
      const stock = stockByPlace.get(placeId);
      const rent = homes?.rentMinor ?? median(row.rents);
      const medianRentMinor =
        median(row.rents) || (homes?.rentMinor ?? stock?.openingRentMinor ?? 0);
      const medianHomeValueMinor =
        homes?.homeValueMinor || (stock?.openingHomeValueMinor ?? 0);
      const budgetHere =
        townBudget && (townBudget.placeId === placeId || places.size === 1)
          ? townBudget
          : undefined;
      return {
        placeId,
        date: c.date,
        employed: row.employed,
        residentsEmployed: row.residentsEmployed,
        unemployed: row.unemployed,
        unemploymentRate:
          // Residents who are out of work over residents in the labor force:
          // jobs at the town's firms held by commuters are not its residents.
          row.residentsEmployed + row.unemployed > 0
            ? row.unemployed / (row.residentsEmployed + row.unemployed)
            : 0,
        ...(hasJobs
          ? {
              townEmployed: Math.round(row.townEmployed),
              townSeekers: row.townSeekers,
              openPositions: row.openPositions,
              openUnemploymentClaims: row.openUnemploymentClaims,
            }
          : {}),
        medianHourlyMinor: median(row.hourly),
        businessesOpen: row.open,
        businessesFoundedThisMonth: row.foundedThisMonth,
        businessesClosedThisMonth: row.closedThisMonth,
        priceLevel: row.price.length
          ? row.price.reduce((n, value) => n + value, 0) / row.price.length
          : 1,
        medianRentMinor,
        // The town bank and its mortgages serve the town as a whole.
        mortgagesOwed: mortgages.filter((m) => m.monthsLeft > 0).length,
        mortgageBalanceMinor: mortgages.reduce((n, m) => n + m.balanceMinor, 0),
        householdLoansOpen: loans.filter((loan) => loan.open).length,
        // Households with earners: the middle household's yearly earnings.
        medianHouseholdEarningsMinor: income,
        medianHomeValueMinor,
        ...(stock
          ? {
              rentalUnits: stock.rentalUnits,
              vacantRental: stock.vacantRental,
            }
          : {}),
        // A year of the typical rent against the typical household's earnings.
        rentToEarnings:
          income > 0
            ? (rent * api.parameter("macroMonthsPerYear")) / income
            : 0,
        evictionOrdersLastMonth: row.evictionOrders,
        evictionsLastYear: row.evictionsLastYear,
        evictionsPriorYear: row.evictionsPriorYear,
        ...(budgetHere
          ? {
              budgetRevenueMinor: budgetHere.revenueMinor,
              budgetSpendingMinor: budgetHere.spendingMinor,
              budgetFiscalYear: budgetHere.fiscalYear,
              ...(budgetHere.priorRevenueMinor !== undefined
                ? {
                    priorBudgetRevenueMinor: budgetHere.priorRevenueMinor,
                    priorBudgetSpendingMinor: budgetHere.priorSpendingMinor,
                  }
                : {}),
            }
          : {}),
        // People (named plus counted, by weight) in households whose yearly
        // income is under the Census line for their size, over all people.
        // A place with no recorded jobs has no incomes to read, so it keeps
        // no share (the web then falls back to its estimate).
        ...(row.employed > 0 && poverty.get(placeId)
          ? {
              povertyShare:
                poverty.get(placeId)!.poor / poverty.get(placeId)!.people,
            }
          : {}),
      };
    });
}

function nationMetrics(api: CoreAPI): {
  now: MacroMonth;
  before: MacroMonth | undefined;
} | null {
  const c = api.state as CoreState;
  if (!c.modules.has(MACRO_MODULE_ID)) return null;
  const p = (key: string) => api.parameter(key);
  const recorded = api
    .moduleState(MACRO_MODULE_ID)
    .table("months")
    .rows() as unknown as MacroMonth[];
  const months = (
    recorded.length ? recorded : historyMonths(c.startedAt, c.seed, p)
  )
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month));
  const now = months.filter((row) => row.month <= monthKey(c.date)).at(-1);
  if (!now) return null;
  const yearBefore = shiftMonth(now.month, -p("macroMonthsPerYear"), p);
  return { now, before: months.find((row) => row.month === yearBefore) };
}

function stateMetricsForPlace(
  api: CoreAPI,
  placeId: string,
  nation: { now: MacroMonth; before: MacroMonth | undefined } | null,
) {
  const c = api.state as CoreState;
  if (!nation || !c.modules.has("regional")) return null;
  const regionId = regionOfPlace(placeId);
  if (!regionId) return null;
  const regional = api.moduleState("regional");
  const at = (row: Readonly<MacroMonth>): RegionMonth[] => {
    const stored = regional
      .table("months")
      .query("byMonth", [row.month]) as unknown as RegionMonth[];
    if (stored.length) return stored;
    return row.kind === "history"
      ? openingRegionMonths(row, c.startedAt, c.seed, (key) =>
          api.parameter(key),
        )
      : [];
  };
  const now = at(nation.now);
  const fips = now.find((row) => row.regionId === regionId)?.stateFips;
  if (!fips) return null;
  const before = nation.before ? at(nation.before) : [];
  const last = before.some((row) => row.stateFips === fips)
    ? stateFigures(before, fips)
    : null;
  const current = stateFigures(now, fips);
  return {
    stateKey: placeStateKey(placeId),
    now: {
      stateUnemploymentPct: current.unemploymentPct,
      stateHourlyEarnings: current.hourlyEarnings,
      stateJobs: current.jobsThousands * 1000,
    },
    before: last
      ? {
          stateUnemploymentPct: last.unemploymentPct,
          stateHourlyEarnings: last.hourlyEarnings,
          stateJobs: last.jobsThousands * 1000,
        }
      : null,
  };
}

function recordNationOutputs(
  api: CoreAPI,
  row: Readonly<MacroMonth>,
  options: {
    table: "months" | "years";
    date: string;
    year?: number;
    open?: boolean;
    source: Source;
  },
): void {
  const pairs: readonly [string, number, Record<string, number>][] = [
    [
      "nation.unemployment",
      row.unemploymentPct,
      { unemploymentPct: row.unemploymentPct },
    ],
    [
      "nation.inflation",
      row.inflationPct,
      { inflationPct: row.inflationPct },
    ],
    [
      "nation.pay",
      row.hourlyEarnings,
      { hourlyEarnings: row.hourlyEarnings },
    ],
    [
      "nation.mortgage",
      row.mortgage30Pct,
      { mortgage30Pct: row.mortgage30Pct, policyRatePct: row.policyRatePct },
    ],
    [
      "nation.policyRate",
      row.policyRatePct,
      { policyRatePct: row.policyRatePct },
    ],
  ];
  for (const [id, value, inputs] of pairs)
    putOutputNumber(api, id, "US", value, inputs, options);
}

function recordStateOutputs(
  api: CoreAPI,
  stateKey: string,
  values: {
    stateUnemploymentPct: number;
    stateHourlyEarnings: number;
    stateJobs: number;
  },
  options: {
    table: "months" | "years";
    date: string;
    year?: number;
    open?: boolean;
    source: Source;
  },
): void {
  putOutputNumber(
    api,
    "state.unemployment",
    stateKey,
    values.stateUnemploymentPct,
    {
      stateUnemploymentPct: values.stateUnemploymentPct,
      stateJobs: values.stateJobs,
    },
    options,
  );
  putOutputNumber(
    api,
    "state.pay",
    stateKey,
    values.stateHourlyEarnings,
    { stateHourlyEarnings: values.stateHourlyEarnings },
    options,
  );
  putOutputNumber(
    api,
    "state.jobs",
    stateKey,
    values.stateJobs,
    { stateJobs: values.stateJobs },
    options,
  );
}

function recordPlaceOutputs(
  api: CoreAPI,
  row: ReturnType<typeof townMetrics>[number],
  options: {
    table: "months" | "years";
    date: string;
    year?: number;
    open?: boolean;
    prior?: boolean;
    source: Source;
  },
): void {
  const { placeId } = row;
  if (row.townEmployed !== undefined) {
    putOutputNumber(
      api,
      "city.employed",
      placeId,
      row.townEmployed,
      {
        townEmployed: row.townEmployed,
        residentsEmployed: row.residentsEmployed,
        employed: row.employed,
      },
      options,
    );
    putOutputNumber(
      api,
      "city.seekers",
      placeId,
      row.townSeekers,
      { townSeekers: row.townSeekers, unemployed: row.unemployed },
      options,
    );
    putOutputNumber(
      api,
      "city.openPositions",
      placeId,
      row.openPositions,
      { openPositions: row.openPositions },
      options,
    );
    putOutputNumber(
      api,
      "benefits.claims",
      placeId,
      row.openUnemploymentClaims,
      { openUnemploymentClaims: row.openUnemploymentClaims },
      options,
    );
  }
  if (row.rentalUnits !== undefined && row.vacantRental !== undefined) {
    putOutputNumber(
      api,
      "housing.rentals",
      placeId,
      row.rentalUnits,
      { rentalUnits: row.rentalUnits, vacantRental: row.vacantRental },
      options,
    );
    putOutputNumber(
      api,
      "housing.vacant",
      placeId,
      row.vacantRental,
      { vacantRental: row.vacantRental, rentalUnits: row.rentalUnits },
      options,
    );
    putOutputNumber(
      api,
      "housing.rent",
      placeId,
      row.medianRentMinor,
      { medianRentMinor: row.medianRentMinor },
      options,
    );
    putOutputNumber(
      api,
      "housing.homeValue",
      placeId,
      row.medianHomeValueMinor,
      { medianHomeValueMinor: row.medianHomeValueMinor },
      options,
    );
  }
  const evictions = options.prior
    ? row.evictionsPriorYear
    : row.evictionsLastYear;
  putOutputNumber(
    api,
    "evictions.evictions",
    placeId,
    evictions,
    {
      evictionsLastYear: evictions,
      evictionOrdersLastMonth: row.evictionOrdersLastMonth,
    },
    options,
  );
  if (
    row.budgetRevenueMinor !== undefined &&
    row.budgetSpendingMinor !== undefined
  ) {
    const revenue =
      options.prior && row.priorBudgetRevenueMinor !== undefined
        ? row.priorBudgetRevenueMinor
        : row.budgetRevenueMinor;
    const spending =
      options.prior && row.priorBudgetSpendingMinor !== undefined
        ? row.priorBudgetSpendingMinor
        : row.budgetSpendingMinor;
    putOutputNumber(
      api,
      "budget.revenue",
      placeId,
      revenue,
      {
        budgetRevenueMinor: revenue,
        budgetFiscalYear: row.budgetFiscalYear ?? 0,
      },
      options,
    );
    putOutputNumber(
      api,
      "budget.spending",
      placeId,
      spending,
      {
        budgetSpendingMinor: spending,
        budgetFiscalYear: row.budgetFiscalYear ?? 0,
      },
      options,
    );
  }
}

/**
 * Seed the opening's prior-year (`openingYear - 1`, closed, tagged `ESTIMATED`)
 * and current-year (`openingYear`, open) rows in `world-metrics`'s `years`
 * table so Metrics is never blank on day one and every figure carries last year
 * beside it.
 */
export function openWorldMetrics(api: CoreAPI): void {
  const date = api.state.date;
  const openingYear = Number(date.slice(0, 4));
  const priorYear = openingYear - 1;
  const priorDate = `${priorYear}-12-31`;
  const estimatedSource = (citation: string): Source => ({
    tag: "ESTIMATED",
    asOf: date,
    citation,
    estimatedFrom:
      "The opening world's records and drawn pre-opening series at the start of play.",
  });
  const nation = nationMetrics(api);
  if (nation) {
    recordNationOutputs(api, nation.before ?? nation.now, {
      table: "years",
      year: priorYear,
      date: priorDate,
      open: false,
      source: estimatedSource(MACRO_HISTORY_SOURCE.citation),
    });
    recordNationOutputs(api, nation.now, {
      table: "years",
      year: openingYear,
      date,
      open: true,
      source: estimatedSource(MACRO_HISTORY_SOURCE.citation),
    });
  }
  const seenStates = new Set<string>();
  const towns = townMetrics(api);
  for (const row of towns) {
    const state = stateMetricsForPlace(api, row.placeId, nation);
    if (state && !seenStates.has(state.stateKey)) {
      seenStates.add(state.stateKey);
      recordStateOutputs(api, state.stateKey, state.before ?? state.now, {
        table: "years",
        year: priorYear,
        date: priorDate,
        open: false,
        source: estimatedSource(REGION_SOURCE.citation),
      });
      recordStateOutputs(api, state.stateKey, state.now, {
        table: "years",
        year: openingYear,
        date,
        open: true,
        source: estimatedSource(REGION_SOURCE.citation),
      });
    }
    recordPlaceOutputs(api, row, {
      table: "years",
      year: priorYear,
      date: priorDate,
      open: false,
      prior: true,
      source: estimatedSource("The economy engines' opening records."),
    });
    recordPlaceOutputs(api, row, {
      table: "years",
      year: openingYear,
      date,
      open: true,
      prior: false,
      source: estimatedSource("The economy engines' opening records."),
    });
  }
}

/**
 * Fold a closed year's monthly rows into `world-metrics`'s `years` table on the
 * December step: the December reading for a stock or rate (`december`), the
 * year's sum for a monthly flow (`sum`), or the year's mean (`mean`).
 */
function closeYearMetrics(api: CoreAPI, year: number): void {
  const date = api.state.date;
  const monthsTable = api.moduleState(WORLD_METRICS_MODULE_ID).table("months");
  const yearsTable = api.moduleState(WORLD_METRICS_MODULE_ID).table("years");
  const source: Source = {
    tag: "SOURCED",
    asOf: date,
    citation: "The economy engines' own records.",
  };
  const placeIds = new Set<string>();
  for (const row of monthsTable.rows() as unknown as {
    placeId: string;
    date: string;
  }[])
    if (row.date.startsWith(`${year}-`)) placeIds.add(row.placeId);
  const foldEntries = Object.values(OUTPUT_NUMBERS).filter(
    (entry): entry is OutputNumberEntry =>
      Boolean(entry.field) &&
      (!entry.module || entry.module === WORLD_METRICS_MODULE_ID),
  );
  for (const placeId of placeIds) {
    const yearMonths = (
      monthsTable.query("byPlace", [placeId]) as unknown as (Record<
        string,
        unknown
      > & { date: string })[]
    )
      .filter((row) => row.date.startsWith(`${year}-`))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!yearMonths.length) continue;
    const december = yearMonths.at(-1)!;
    const rowId = `year:${placeId}:${year}`;
    const existing = (yearsTable.get(rowId) as
      | Record<string, unknown>
      | undefined) ?? {
      id: rowId,
      placeId,
      year,
      date,
    };
    const folded: Record<string, unknown> = {
      ...existing,
      ...december,
      id: rowId,
      placeId,
      year,
      date,
      open: false,
      source,
    };
    for (const entry of foldEntries) {
      const field = entry.field;
      const values = yearMonths
        .map((m) => m[field])
        .filter((v): v is number => typeof v === "number");
      if (!values.length) continue;
      if (entry.fold === "sum")
        folded[field] = values.reduce((sum, n) => sum + n, 0);
      else if (entry.fold === "mean")
        folded[field] = values.reduce((sum, n) => sum + n, 0) / values.length;
      else folded[field] = values.at(-1)!;
    }
    yearsTable.put(folded as { id: string });
  }
}

function stepWorldMetrics(api: CoreAPI): void {
  const date = api.state.date;
  const source: Source = {
    tag: "SOURCED",
    asOf: date,
    citation: "The economy engines' own records.",
  };
  const nation = nationMetrics(api);
  if (nation)
    recordNationOutputs(api, nation.now, {
      table: "months",
      date,
      source,
    });
  const seenStates = new Set<string>();
  const months = api.moduleState(WORLD_METRICS_MODULE_ID).table("months");
  for (const row of townMetrics(api)) {
    months.put({ id: `metrics:${row.placeId}:${row.date}`, ...row });
    recordPlaceOutputs(api, row, {
      table: "months",
      date: row.date,
      source,
    });
    const state = stateMetricsForPlace(api, row.placeId, nation);
    if (state && !seenStates.has(state.stateKey)) {
      seenStates.add(state.stateKey);
      recordStateOutputs(api, state.stateKey, state.now, {
        table: "months",
        date,
        source,
      });
    }
  }
  if (date.slice(5, 7) === "12")
    closeYearMetrics(api, Number(date.slice(0, 4)));
}

function schedule(api: CoreAPI): void {
  const next =
    addDays(
      makeIsoDate(`${api.state.date.slice(0, "YYYY-MM".length)}-01`),
      32,
    ).slice(0, "YYYY-MM".length) + "-02";
  api.moduleCalendar(WORLD_METRICS_MODULE_ID).schedule({
    key: `metrics:${next}`,
    date: next,
    kind: "world-metrics",
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: "The economy engines' own records.",
    },
    sourceRecordIds: ["world-metrics:state"],
  });
}

export const WORLD_METRICS_MODULE: PreStartModule = {
  id: WORLD_METRICS_MODULE_ID,
  preStart: {
    phase: "government",
    run(api) {
      openWorldMetrics(api);
    },
  },
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      months: { indexes: { byPlace: { fields: ["placeId"] } } },
      years: { indexes: { byPlace: { fields: ["placeId"] } } },
    },
  },
  onCalendarWork(api, work) {
    if (work.kind !== "world-metrics") return;
    stepWorldMetrics(api);
    schedule(api);
  },
  onDay(api) {
    const state = api.moduleState(WORLD_METRICS_MODULE_ID).table("state");
    if (state.get("world-metrics:state")) return;
    state.put({ id: "world-metrics:state", openedAt: api.state.date });
    openWorldMetrics(api);
    schedule(api);
  },
};
