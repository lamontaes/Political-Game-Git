/**
 * The town's economy as dated records: on the second of each month, after
 * the month's reviews, one row per place with jobs, unemployment, the employment rate, pay and
 * low-wage jobs, household income and poverty, prices, businesses, rent, home values, eviction filings, households' past-due bills, mortgages and bank lending, read from the
 * engines' own records. Screens and the outcome web (M3-04) read these rows;
 * nothing here moves money or decides anything.
 */
import { addDays, makeIsoDate } from "../kernel/dates";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import { ownedHomes } from "./housing";
import { residentsRuntime } from "./residents";
import { retirementClaims } from "./retirement-claims";
import poverty from "../data/world-metrics-poverty.json" with { type: "json" };
import { HOUSING_MODULE_ID, townFiguresByPlace } from "./housing";

export const WORLD_METRICS_MODULE_ID = "world-metrics";

/** The share of hourly pay under two-thirds of its median. */
function lowWageShare(hourly: number[]): number {
  if (!hourly.length) return 0;
  const line = (2 / 3) * median(hourly);
  return hourly.filter((h) => h < line).length / hourly.length;
}
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
      adults: number;
      pastDueMinor: number;
      householdsPastDue: number;
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
          adults: 0,
          pastDueMinor: 0,
          householdsPastDue: 0,
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
  // Employment counts where the worker lives, as unemployment does (BLS LAUS); pay counts where the job is.
  // Only the places the world models (relatives living elsewhere aren't the town's), each worker once.
  const modeled = new Set(rt?.input.accounts.map((row) => row.placeId) ?? []);
  const counted = new Set<string>();
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
  const homeOf = (personId: string) => {
    if (counted.has(personId)) return undefined;
    counted.add(personId);
    const full = c.people.get(personId);
    if (full) return modeled.has(full.placeId) ? full.placeId : undefined;
    const householdId = rt?.householdOfPerson.get(personId);
    return householdId
      ? rt!.households.get(householdId)?.household.placeId
      : undefined;
  };
  for (const job of c.jobs.values()) {
    if (job.endsAt !== undefined) continue;
    const placeId = placeOf(job.organizationId),
      home = homeOf(job.personId);
    if (home) at(home).employed += 1;
    if (placeId && job.hourlyMinor) at(placeId).hourly.push(job.hourlyMinor);
    const person = c.people.get(job.personId);
    const household = person ? c.households.get(person.householdId) : undefined;
    earn(household?.placeId, household?.id, job.wageDailyMinor);
  }
  for (const [jobId, flow] of rt?.wageFlowByJob ?? []) {
    const job = rt!.jobs.get(jobId);
    if (!job || job.endsAt !== undefined || flow.endedAt) continue;
    const placeId = flow.organizationId && placeOf(flow.organizationId),
      home = homeOf(job.personId);
    if (home) at(home).employed += 1;
    if (placeId && job.hourlyMinor) at(placeId).hourly.push(job.hourlyMinor);
    const householdId = rt!.householdOfPerson.get(job.personId);
    earn(
      householdId
        ? rt!.households.get(householdId)?.household.placeId
        : undefined,
      householdId,
      job.wageDailyMinor,
    );
  }
  // Residents 16 and over, the employment rate's base (BLS CPS).
  const year = Number(c.date.slice(0, 4)),
    adultAge = api.parameter("jobsLaborForceMinimumAge");
  const adult = (birthDate: string) =>
    year - Number(birthDate.slice(0, 4)) >= adultAge;
  for (const person of c.people.values())
    if (person.alive && adult(person.birthDate) && modeled.has(person.placeId))
      at(person.placeId).adults += 1;
  for (const record of rt?.households.values() ?? [])
    for (const person of record.people)
      if (adult(person.birthDate)) at(record.household.placeId).adults += 1;
  // What households owe past due on their recorded bills (rent, mortgage, loans).
  const pastDue = new Map<string, number>();
  for (const row of c.finance.contracts.values())
    if (!row.endedAt && row.householdId && row.arrearsMinor > 0)
      pastDue.set(
        row.householdId,
        (pastDue.get(row.householdId) ?? 0) + row.arrearsMinor,
      );
  for (const [householdId, owed] of pastDue) {
    const placeId = c.households.get(householdId)?.placeId;
    if (!placeId) continue;
    at(placeId).pastDueMinor += owed;
    at(placeId).householdsPastDue += 1;
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
      rt?.households.get(row.householdId)?.household.placeId;
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
  // Homes: owners' values today, and eviction cases filed this month.
  const values = new Map<string, number[]>();
  for (const home of c.modules.has("housing") ? ownedHomes(api) : [])
    values.set(home.placeId, [
      ...(values.get(home.placeId) ?? []),
      home.valueMinor,
    ]);
  const filed = new Map<string, number>();
  for (const row of rows(api, "housing", "cases") as unknown as {
    householdId: string;
    filedAt?: string;
  }[]) {
    if (!row.filedAt?.startsWith(month)) continue;
    const placeId =
      c.households.get(row.householdId)?.placeId ??
      rt?.households.get(row.householdId)?.household.placeId;
    if (placeId) filed.set(placeId, (filed.get(placeId) ?? 0) + 1);
  }
  // Each household's money income a year, as the Census Bureau counts it for
  // poverty: pay, retirement and other awards, unemployment benefits.
  const monthsPerYear = api.parameter("macroMonthsPerYear");
  const personIncome = new Map<string, number>();
  const addPay = (personId: string, yearlyMinor: number) =>
    personIncome.set(personId, (personIncome.get(personId) ?? 0) + yearlyMinor);
  for (const job of c.jobs.values())
    if (job.endsAt === undefined)
      addPay(job.personId, job.wageDailyMinor * daysPerYear);
  for (const [jobId, flow] of rt?.wageFlowByJob ?? []) {
    const job = rt!.jobs.get(jobId);
    if (job && job.endsAt === undefined && !flow.endedAt)
      addPay(job.personId, job.wageDailyMinor * daysPerYear);
  }
  // Retirement claims made in play (full and counted).
  for (const [personId, claim] of retirementClaims(c))
    addPay(personId, claim.monthlyMinor * monthsPerYear);
  for (const row of rows(api, "jobs", "claims") as unknown as {
    personId: string;
    open: boolean;
    weeklyMinor: number;
  }[])
    if (row.open) addPay(row.personId, (row.weeklyMinor * daysPerYear) / 7);
  const awards = (
    contracts: readonly {
      recipientIncome?: { personId: string };
      amountMinor: number;
      periodMonths?: number;
      endedAt?: string;
    }[],
  ) => {
    for (const row of contracts)
      if (row.recipientIncome && !row.endedAt)
        addPay(
          row.recipientIncome.personId,
          (row.amountMinor / (row.periodMonths || 1)) * monthsPerYear,
        );
  };
  awards([...c.finance.contracts.values()] as never);
  for (const record of rt?.households.values() ?? [])
    awards(record.contracts as never);
  // The year's poverty lines, carried from 2021 by consumer prices.
  const priceIndex = (month: string) =>
    ((api.state as CoreState).modules.has("macro")
      ? (api
          .moduleState("macro")
          .table("months")
          .get(`macro-month:${month}`) as { priceIndex?: number } | undefined)
      : undefined
    )?.priceIndex;
  const macroState = (api.state as CoreState).modules.has("macro")
    ? (api.moduleState("macro").table("state").get("macro:state") as
        { latestMonth?: string } | undefined)
    : undefined;
  const base = priceIndex(`${poverty.year}-06`),
    now = macroState?.latestMonth
      ? priceIndex(macroState.latestMonth)
      : undefined;
  const carried = base && now ? now / base : 1;
  const lines = poverty.weightedAverageByHouseholdSize as Record<
    string,
    number
  >;
  const lineFor = (size: number) =>
    (lines[String(Math.min(9, Math.max(1, size)))] ?? 0) * 100 * carried;
  const incomes = new Map<string, number[]>();
  const poor = new Map<string, { people: number; poor: number }>();
  const household = (
    placeId: string,
    memberIds: readonly string[],
    living: (id: string) => boolean,
  ) => {
    if (!modeled.has(placeId)) return;
    const members = memberIds.filter(living);
    if (!members.length) return;
    const income = members.reduce(
      (n, id) => n + (personIncome.get(id) ?? 0),
      0,
    );
    const list = incomes.get(placeId);
    if (list) list.push(income);
    else incomes.set(placeId, [income]);
    const row = poor.get(placeId) ?? { people: 0, poor: 0 };
    row.people += members.length;
    if (income < lineFor(members.length)) row.poor += members.length;
    poor.set(placeId, row);
  };
  for (const h of c.households.values())
    household(h.placeId, [...h.memberIds], (id) =>
      Boolean(c.people.get(id)?.alive),
    );
  for (const record of rt?.households.values() ?? []) {
    const people = new Set(record.people.map((person) => person.id));
    household(record.household.placeId, record.household.memberIds, (id) =>
      people.has(id),
    );
  }
  const housing = c.modules.has(HOUSING_MODULE_ID)
    ? townFiguresByPlace(api, new Set(places.keys()))
    : undefined;
  return [...places]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([placeId, row]) => {
      const earnings = median([...row.earnings.values()]);
      const rent = housing?.get(placeId)?.rentMinor ?? median(row.rents);
      return {
        placeId,
        date: c.date,
        adults: row.adults,
        employed: row.employed,
        unemployed: row.unemployed,
        unemploymentRate:
          row.employed + row.unemployed > 0
            ? row.unemployed / (row.employed + row.unemployed)
            : 0,
        // Employed residents per resident 16 and over (BLS's employment-population ratio).
        employmentRate: row.adults > 0 ? row.employed / row.adults : 0,
        pastDueMinor: row.pastDueMinor,
        householdsPastDue: row.householdsPastDue,
        medianHourlyMinor: median(row.hourly),
        businessesOpen: row.open,
        businessesFoundedThisMonth: row.foundedThisMonth,
        businessesClosedThisMonth: row.closedThisMonth,
        priceLevel: row.price.length
          ? row.price.reduce((n, value) => n + value, 0) / row.price.length
          : 1,
        medianRentMinor: median(row.rents),
        // Jobs here paying under two-thirds of the median hourly pay (the OECD's low-pay line).
        lowWageShare: lowWageShare(row.hourly),
        medianHomeValueMinor: median(values.get(placeId) ?? []),
        // Households' money income a year, and the share of residents below the poverty line for their household's size (Census Bureau thresholds).
        medianHouseholdIncomeMinor: median(incomes.get(placeId) ?? []),
        // The nation's consumer price index this month, for real changes.
        ...(now !== undefined ? { consumerPriceIndex: now } : {}),
        povertyRate:
          (poor.get(placeId)?.people ?? 0) > 0
            ? poor.get(placeId)!.poor / poor.get(placeId)!.people
            : 0,
        evictionFilingsThisMonth: filed.get(placeId) ?? 0,
        evictionFilingsPerThousandRenters:
          row.rents.length > 0
            ? ((filed.get(placeId) ?? 0) * 1000) / row.rents.length
            : 0,
        // The town bank and its mortgages serve the town as a whole.
        mortgagesOwed: mortgages.filter((m) => m.monthsLeft > 0).length,
        mortgageBalanceMinor: mortgages.reduce((n, m) => n + m.balanceMinor, 0),
        householdLoansOpen: loans.filter((loan) => loan.open).length,
        // Households with earners: the middle household's yearly earnings.
        medianHouseholdEarningsMinor: earnings,
        // A year of the typical rent against the typical household's earnings.
        rentToEarnings: earnings > 0 ? (rent * monthsPerYear) / earnings : 0,
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
    const months = api.moduleState(WORLD_METRICS_MODULE_ID).table("months");
    for (const row of townMetrics(api)) {
      // The median household's income a year on, in real terms (against consumer prices).
      const yearAgo = months.get(
        `metrics:${row.placeId}:${Number(row.date.slice(0, 4)) - 1}${row.date.slice(4)}`,
      ) as
        | { medianHouseholdIncomeMinor?: number; consumerPriceIndex?: number }
        | undefined;
      const real =
        yearAgo?.medianHouseholdIncomeMinor &&
        yearAgo.consumerPriceIndex &&
        row.consumerPriceIndex
          ? (row.medianHouseholdIncomeMinor /
              yearAgo.medianHouseholdIncomeMinor /
              (row.consumerPriceIndex / yearAgo.consumerPriceIndex) -
              1) *
            100
          : undefined;
      months.put({
        id: `metrics:${row.placeId}:${row.date}`,
        ...row,
        ...(real !== undefined && Number.isFinite(real)
          ? { realIncomeGrowthPct: real }
          : {}),
      });
    }
    schedule(api);
  },
  onDay(api) {
    const state = api.moduleState(WORLD_METRICS_MODULE_ID).table("state");
    if (state.get("world-metrics:state")) return;
    state.put({ id: "world-metrics:state", openedAt: api.state.date });
    schedule(api);
  },
};
