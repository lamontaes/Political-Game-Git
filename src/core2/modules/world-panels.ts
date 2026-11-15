/**
 * Read-only panels for the bench and the evening build. Nothing here spends
 * game time or writes a record. Words come from the English engine; these
 * return record data only.
 */
import { nationalPanel } from "./macro";
import { regionalLevel, regionName } from "./regional";
import { countedResidents } from "../electorate";
import { JOBS_DATA, type PositionRow } from "./jobs";
import { residentsRuntime } from "./residents";
import { outsideLaborForce } from "../gov-rules/place-population";
import type { CoreAPI, CoreState } from "../types";

const has = (api: CoreAPI, id: string) =>
  (api.state as CoreState).modules.has(id);

function rows(api: CoreAPI, moduleId: string, table: string) {
  return has(api, moduleId)
    ? (api.moduleState(moduleId).snapshot().tables[table] ?? [])
    : [];
}

/** The town's region beside its state's other regions and the nation, latest month. */
export function regionPanel(api: CoreAPI, placeId: string) {
  const region = has(api, "regional") ? regionalLevel(api, placeId) : undefined;
  const nation = has(api, "macro")
    ? nationalPanel(api).months.at(-1)
    : undefined;
  const state = region
    ? (
        rows(api, "regional", "months") as unknown as {
          stateFips: string;
          month: string;
        }[]
      ).filter(
        (row) =>
          row.stateFips === region.stateFips && row.month === region.month,
      )
    : [];
  return {
    // The area the region's figures cover, so a screen can say where a rate applies.
    region: region && { ...region, name: regionName(region.regionId) },
    stateRegions: state,
    nation,
  };
}

/** One place's labor market: residents at work, residents out of work and looking, and the jobs its employers post. */
export interface TownLabor {
  readonly employed: number;
  /** Residents with no job who are looking: the people the unemployment rate counts. */
  readonly seekers: number;
  readonly openPositions: number;
}

/**
 * Every place's labor market today, counted once, by one rule (build order
 * metrics-town-jobs-one-rule): a counted resident stands for its household's
 * weight and a full person for one (one model, two tiers); the workers the
 * opening placed in no town firm (commuters, and work in industries the town
 * lacks) are at work too; a seeker who already holds a job is at work and is
 * not counted as out of work. The month row the rate stands on, the Metrics
 * tab, the paper and the bench's economy panel all read this one pass.
 */
export function townLaborByPlace(api: CoreAPI): Map<string, TownLabor> {
  const c = api.state as CoreState;
  const out = new Map<string, { e: number; s: number; o: number }>();
  const at = (placeId: string) => {
    let row = out.get(placeId);
    if (!row) out.set(placeId, (row = { e: 0, s: 0, o: 0 }));
    return row;
  };
  const counted = new Map<string, { placeId: string; weight: number }>();
  for (const row of countedResidents(c)) {
    counted.set(row.id, { placeId: row.placeId, weight: row.weight });
    if (row.weeklyMinutes > 0) at(row.placeId).e += row.weight;
  }
  const atWork = new Set<string>();
  for (const job of c.jobs.values()) {
    if (job.endsAt !== undefined || atWork.has(job.personId)) continue;
    const person = c.people.get(job.personId);
    if (person?.alive !== true) continue;
    atWork.add(job.personId);
    at(person.placeId).e += 1;
  }
  const rt = residentsRuntime(c);
  for (const h of rt?.store.liveHouseholds() ?? [])
    if (h.unplacedWorkers > 0 && !outsideLaborForce(h.quarters))
      at(h.placeId).e += h.unplacedWorkers * rt!.store.weightOf(h);
  if (has(api, "jobs")) {
    const jobs = api.moduleState("jobs");
    // A seeker's row in either table, each person once, as the jobs engine
    // counts participation (a counted seeker filled in keeps their row).
    const looking = new Map<string, { placeId: string; heads: number }>();
    for (const table of ["seekers", "countedSeekers"])
      for (const row of jobs.table(table).rows() as unknown as {
        personId: string;
        employed: boolean;
      }[]) {
        if (row.employed) continue;
        const group = counted.get(row.personId);
        const person = group ? undefined : c.people.get(row.personId);
        if (group)
          looking.set(row.personId, {
            placeId: group.placeId,
            heads: group.weight,
          });
        else if (person?.alive === true)
          looking.set(row.personId, { placeId: person.placeId, heads: 1 });
      }
    for (const { placeId, heads } of looking.values()) at(placeId).s += heads;
    for (const row of jobs
      .table("positions")
      .query("byStatus", ["open"]) as unknown as PositionRow[])
      at(row.placeId).o += row.heads ?? 1;
  }
  return new Map(
    [...out].map(([placeId, row]) => [
      placeId,
      {
        employed: Math.round(row.e),
        seekers: Math.round(row.s),
        openPositions: row.o,
      },
    ]),
  );
}

/** One place's labor market today (a place with none reads zeros). */
export function townJobsPanel(api: CoreAPI, placeId: string): TownLabor {
  return (
    townLaborByPlace(api).get(placeId) ?? {
      employed: 0,
      seekers: 0,
      openPositions: 0,
    }
  );
}

/** The town's monthly hires, quits and layoffs per hundred jobs, against JOLTS 2001-2019. */
export function turnoverPanel(api: CoreAPI) {
  const c = api.state as CoreState;
  // Full people's jobs and the wider population's counted jobs.
  const counted = residentsRuntime(c)?.wageFlowByJob.size ?? 0;
  const employed =
    [...c.jobs.values()].filter((job) => job.endsAt === undefined).length +
      counted || 1;
  const byMonth: Record<string, Record<string, number>> = {};
  for (const row of rows(api, "jobs", "changes") as unknown as {
    date: string;
    kind: string;
  }[]) {
    const month = row.date.slice(0, "YYYY-MM".length);
    byMonth[month] ??= {};
    byMonth[month][row.kind] = (byMonth[month][row.kind] ?? 0) + 1;
  }
  const rates = Object.fromEntries(
    Object.entries(byMonth).map(([month, counts]) => [
      month,
      Object.fromEntries(
        Object.entries(counts).map(([kind, n]) => [kind, (100 * n) / employed]),
      ),
    ]),
  );
  return {
    ratesByMonth: rates,
    jolts: JOBS_DATA.turnover.industries.total,
  };
}

/** The town bank's monthly books and every line application with the bank's reasons. */
export function bankPanel(api: CoreAPI) {
  return {
    books: rows(api, "credit", "books"),
    applications: rows(api, "credit", "applications"),
    repricings: has(api, "macro") ? nationalPanel(api).repricings : [],
  };
}

/** Eviction cases with each dated step and the law it followed. */
export function evictionPanel(api: CoreAPI) {
  return rows(api, "housing", "cases");
}

/** Each business's owner, their draws from profit, and every founding and new location with its reasons. */
export function ownerPanel(api: CoreAPI) {
  return {
    owners: rows(api, "business", "owners"),
    draws: rows(api, "business", "draws"),
    foundings: rows(api, "business", "foundings"),
    // When each business was founded (before the start too).
    ages: rows(api, "business", "ages"),
    // Owners handing a business on, closing it by choice (with their reasons), and every closure's cause.
    successions: rows(api, "business", "successions"),
    choices: rows(api, "business", "choices"),
    closures: rows(api, "business", "closures"),
    // What laws ask of businesses: operating limits and compliance costs.
    operatingRules: rows(api, "business", "operating"),
  };
}

/** New homes: each town's housing stock and zoning, every project from start to finish, and households in set-aside units. */
export function buildingPanel(api: CoreAPI) {
  return {
    stock: rows(api, "housing", "stock"),
    projects: rows(api, "housing", "projects"),
    affordable: rows(api, "housing", "affordable"),
  };
}

/** What the place's laws cost or save: price rules on goods, property tax assessments, and right to counsel by place. */
export function lawCostsPanel(api: CoreAPI) {
  return {
    priceRules: rows(api, "place-prices", "rules"),
    assessments: rows(api, "housing", "assessments"),
    counsel: rows(api, "housing", "counsel"),
  };
}

/** Unemployment insurance claims: who filed, the weekly benefit, what's been paid, and how each ended. */
export function benefitsPanel(api: CoreAPI) {
  return rows(api, "jobs", "claims");
}

/** The central bank's seats: who holds each, since when, until when, and how they lean. */
export function boardPanel(api: CoreAPI) {
  return rows(api, "macro", "members");
}

/** The town's monthly economic numbers (jobs, unemployment, pay, prices, businesses, rent, mortgages), oldest first. */
export function metricsPanel(api: CoreAPI, placeId: string) {
  return has(api, "world-metrics")
    ? [
        ...api
          .moduleState("world-metrics")
          .table("months")
          .query("byPlace", [placeId]),
      ].sort((a, b) => String(a.date).localeCompare(String(b.date)))
    : [];
}

/** One household's home: owned or rented, its value or rent, who holds its loan, and how it got there. */
export function homePanel(api: CoreAPI, householdId: string) {
  if (!has(api, "housing")) return undefined;
  const housing = api.moduleState("housing");
  return {
    dwelling: housing.table("dwellings").get(`dwelling:${householdId}`),
    mortgage: housing.table("mortgages").get(`mortgage:${householdId}`),
    purchases: housing
      .table("purchases")
      .rows()
      .filter((row) => row.householdId === householdId),
  };
}

// Re-exported so the bill stage view and the states screen read the legislature's sessions and roll calls through this entry (families guard).
export { legislativeSessionsOf, rollCallOf } from "./world-legislating";
