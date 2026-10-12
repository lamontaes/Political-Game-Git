/**
 * Read-only panels for the bench and the evening build. Nothing here spends
 * game time or writes a record. Words come from the English engine; these
 * return record data only.
 */
import { nationalPanel } from "./macro";
import { regionalLevel } from "./regional";
import { JOBS_DATA } from "./jobs";
import { residentsRuntime } from "./residents";
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
  return { region, stateRegions: state, nation };
}

/** One person's job history: every change with its reason and who decided it. */
export function jobHistory(api: CoreAPI, personId: string) {
  return has(api, "jobs")
    ? api.moduleState("jobs").table("changes").query("byPerson", [personId])
    : [];
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
    employed,
    seekers:
      rows(api, "jobs", "seekers").length +
      rows(api, "jobs", "countedSeekers").length,
    openPositions: has(api, "jobs")
      ? api.moduleState("jobs").table("positions").query("byStatus", ["open"])
          .length
      : 0,
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
  };
}
