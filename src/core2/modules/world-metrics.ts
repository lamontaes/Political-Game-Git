/**
 * The town's economy as dated records: on the second of each month, after
 * the month's reviews, one row per place with jobs, unemployment, pay,
 * prices, businesses, rent, mortgages and bank lending, read from the
 * engines' own records. Screens and the outcome web (M3-04) read these rows;
 * nothing here moves money or decides anything.
 */
import { addDays, makeIsoDate } from "../kernel/dates";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import { residentsRuntime } from "./residents";
import { HOUSING_MODULE_ID, townFiguresByPlace } from "./housing";

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

/** The town's economic numbers today, one entry per place with businesses. */
export function townMetrics(api: CoreAPI) {
  const c = api.state as CoreState;
  const rt = residentsRuntime(c);
  const month = c.date.slice(0, "YYYY-MM".length);
  const places = new Map<
    string,
    {
      employed: number;
      unemployed: number;
      hourly: number[];
      open: number;
      closedThisMonth: number;
      foundedThisMonth: number;
      price: number[];
      rents: number[];
      /** Each household's yearly earnings, by household. */
      earnings: Map<string, number>;
      evictionOrders: number;
    }
  >();
  const at = (placeId: string) => {
    let row = places.get(placeId);
    if (!row)
      places.set(
        placeId,
        (row = {
          employed: 0,
          unemployed: 0,
          hourly: [],
          open: 0,
          closedThisMonth: 0,
          foundedThisMonth: 0,
          price: [],
          rents: [],
          earnings: new Map(),
          evictionOrders: 0,
        }),
      );
    return row;
  };
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
  for (const job of c.jobs.values()) {
    const placeId = placeOf(job.organizationId);
    if (job.endsAt !== undefined || !placeId) continue;
    at(placeId).employed += 1;
    if (job.hourlyMinor) at(placeId).hourly.push(job.hourlyMinor);
    const person = c.people.get(job.personId);
    const home = person ? c.households.get(person.householdId) : undefined;
    earn(home?.placeId, home?.id, job.wageDailyMinor);
  }
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
  }
  // Eviction orders (judgments) in the month before this one, by where the household lives.
  const lastMonth = addDays(makeIsoDate(`${month}-01`), -1).slice(
    0,
    "YYYY-MM".length,
  );
  for (const row of rows(api, HOUSING_MODULE_ID, "cases") as unknown as {
    householdId: string;
    judgmentAt?: string;
  }[]) {
    if (!row.judgmentAt?.startsWith(lastMonth)) continue;
    const placeId =
      c.households.get(row.householdId)?.placeId ??
      rt?.store.liveHousehold(row.householdId)?.placeId;
    if (placeId) at(placeId).evictionOrders += 1;
  }
  for (const table of ["seekers", "countedSeekers"])
    for (const row of rows(api, "jobs", table) as unknown as {
      placeId: string;
      employed: boolean;
    }[])
      if (!row.employed) at(row.placeId).unemployed += 1;
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
  const housing = c.modules.has(HOUSING_MODULE_ID)
    ? townFiguresByPlace(api, new Set(places.keys()))
    : undefined;
  return [...places]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([placeId, row]) => {
      const income = median([...row.earnings.values()]);
      const homes = housing?.get(placeId);
      const rent = homes?.rentMinor ?? median(row.rents);
      return {
        placeId,
        date: c.date,
        employed: row.employed,
        unemployed: row.unemployed,
        unemploymentRate:
          row.employed + row.unemployed > 0
            ? row.unemployed / (row.employed + row.unemployed)
            : 0,
        medianHourlyMinor: median(row.hourly),
        businessesOpen: row.open,
        businessesFoundedThisMonth: row.foundedThisMonth,
        businessesClosedThisMonth: row.closedThisMonth,
        priceLevel: row.price.length
          ? row.price.reduce((n, value) => n + value, 0) / row.price.length
          : 1,
        medianRentMinor: median(row.rents),
        // The town bank and its mortgages serve the town as a whole.
        mortgagesOwed: mortgages.filter((m) => m.monthsLeft > 0).length,
        mortgageBalanceMinor: mortgages.reduce((n, m) => n + m.balanceMinor, 0),
        householdLoansOpen: loans.filter((loan) => loan.open).length,
        // Households with earners: the middle household's yearly earnings.
        medianHouseholdEarningsMinor: income,
        medianHomeValueMinor: homes?.homeValueMinor ?? 0,
        // A year of the typical rent against the typical household's earnings.
        rentToEarnings:
          income > 0
            ? (rent * api.parameter("macroMonthsPerYear")) / income
            : 0,
        evictionOrdersLastMonth: row.evictionOrders,
      };
    });
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

export const WORLD_METRICS_MODULE: CoreModule = {
  id: WORLD_METRICS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      months: { indexes: { byPlace: { fields: ["placeId"] } } },
    },
  },
  onCalendarWork(api, work) {
    if (work.kind !== "world-metrics") return;
    for (const row of townMetrics(api))
      api
        .moduleState(WORLD_METRICS_MODULE_ID)
        .table("months")
        .put({ id: `metrics:${row.placeId}:${row.date}`, ...row });
    schedule(api);
  },
  onDay(api) {
    const state = api.moduleState(WORLD_METRICS_MODULE_ID).table("state");
    if (state.get("world-metrics:state")) return;
    state.put({ id: "world-metrics:state", openedAt: api.state.date });
    schedule(api);
  },
};
